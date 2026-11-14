// Shared passages and source sets: questions grouped around one reading passage (or set of historical sources) show
// that passage in practice, in tests, and in test review; a test keeps each passage's questions together; focus moves
// to a passage only when it changes; and the build rejects a question that points to a missing passage.
const T = require('./helpers');
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const COURSE = 'ap-english-language-and-composition';
const d = JSON.parse(fs.readFileSync(path.join(T.ROOT, 'data', 'courses', COURSE, 'u1.json')));
const byPrompt = Object.fromEntries(d.questions.map(q => [q.prompt, q]));
const titleOf = id => d.passages.find(p => p.id === id).title;

(async () => {
  const b = await T.chromium.launch();
  const p = await T.fresh(b);
  T.ok(d.passages.length >= 2 && d.questions.every(q => d.passages.some(x => x.id === q.passageId)), 'English Language Unit 1 groups every question around a shared passage');

  /* ---- a test shows each question's passage, keeps a passage's questions together, and moves focus sensibly ---- */
  await T.openUnit(p, 'AP English Language', 'u1');
  await p.locator('#v-overview .test-cards > li').nth(0).locator('button:has-text("Start untimed")').click();
  await p.waitForSelector('#v-test form legend');
  const seen = [], focus = [];
  for (let i = 0; i < 8; i++) {
    const q = byPrompt[(await p.locator('#v-test form legend').first().textContent())];
    const shown = await p.locator('#v-test .passage .passage-title').first().textContent();
    seen.push({ want: titleOf(q.passageId), shown });
    focus.push(await p.evaluate(() => document.activeElement.className + '|' + document.activeElement.tagName));
    await p.locator(`#v-test input.ans[value="${q.correctAnswer}"]`).check();
    if (i < 7) await p.click('#v-test .test-nav button.button-primary');
  }
  T.ok(seen.every(s => s.want === s.shown), 'every test question shows its own passage above it');
  const runs = seen.map(s => s.shown).filter((t, i, a) => i === 0 || a[i - 1] !== t);
  T.ok(runs.length === new Set(runs).size, 'questions that share a passage appear together in the test (' + runs.length + ' passage blocks)');
  const changed = seen.map((s, i) => i === 0 || seen[i - 1].shown !== s.shown);
  T.ok(focus.every((f, i) => changed[i] ? f.startsWith('passage-title') : f.endsWith('LEGEND')), 'focus goes to a passage heading when the passage changes, otherwise to the question');
  await p.click('#v-test .test-nav button.button-primary');
  await p.click('#v-test button:has-text("Submit test")');
  await p.click('#v-test button:has-text("Yes, submit")');
  await p.waitForSelector('#v-test .ans-list');
  const rev = await p.$$eval('#v-test .ans-item details.passage summary', s => s.map(x => x.textContent));
  T.ok(rev.length === 8 && rev.every(t => /^Show Passage|^Show Draft/.test(t)), 'test review offers each question\'s passage, collapsed');

  /* ---- adaptive practice shows the passage too ---- */
  await T.openUnit(p, 'AP English Language', 'u1');
  await T.tab(p, 'Adaptive practice');
  await p.click('#v-practice button:has-text("Start practice")');
  await p.waitForSelector('#v-practice form legend');
  const pq = byPrompt[(await p.locator('#v-practice form legend').first().textContent())];
  T.ok(pq && (await p.locator('#v-practice .passage .passage-title').first().textContent()) === titleOf(pq.passageId) &&
    (await p.evaluate(() => document.activeElement.className)) === 'passage-title', 'adaptive practice shows the question\'s passage and focuses its heading');
  /* ---- U.S. History source sets show where each source comes from ---- */
  await T.openUnit(p, 'AP United States History', 'u5');
  await p.locator('#v-overview .test-cards > li').nth(0).locator('button:has-text("Start untimed")').click();
  await p.waitForSelector('#v-test .passage .passage-src');
  const srcs = [];
  for (let i = 0; i < 8; i++) {
    srcs.push(await p.locator('#v-test .passage .passage-src').first().textContent());
    if (i < 7) await p.click('#v-test .test-nav button.button-primary');
  }
  T.ok(srcs.some(x => /Public domain/.test(x)) && srcs.some(x => /Interpretation written for StudySprint/.test(x)) && srcs.every(x => /Public domain|written for StudySprint/.test(x)),
    'U.S. History source sets label each source as a public-domain document or as an interpretation written for StudySprint');
  await p.click('#v-test button:has-text("Save and exit")');
  /* ---- English Literature poems show numbered lines and say they were written for StudySprint ---- */
  await T.openUnit(p, 'AP English Literature', 'u2');
  await p.locator('#v-overview .test-cards > li').nth(0).locator('button:has-text("Start untimed")').click();
  await p.waitForSelector('#v-test .passage .passage-src');
  const litSrc = await p.locator('#v-test .passage .passage-src').first().textContent();
  const litText = await p.locator('#v-test .passage').first().textContent();
  T.ok(/written for StudySprint/.test(litSrc) && /\(1\) /.test(litText) && /\(8\) /.test(litText), 'English Literature poems show numbered lines and are labelled as original to StudySprint');
  await p.click('#v-test button:has-text("Save and exit")');
  /* ---- World History source sets label public-domain documents and interpretations ---- */
  await T.openUnit(p, 'AP World History', 'u5');
  await p.locator('#v-overview .test-cards > li').nth(1).locator('button:has-text("Start untimed")').click();
  await p.waitForSelector('#v-test .passage .passage-src');
  const whSrc = [];
  for (let i = 0; i < 8; i++) {
    whSrc.push(await p.locator('#v-test .passage .passage-src').first().textContent());
    if (i < 7) await p.click('#v-test .test-nav button.button-primary');
  }
  T.ok(whSrc.some(x => /Public domain/.test(x)) && whSrc.some(x => /Interpretation written for StudySprint/.test(x)) && whSrc.every(x => /Public domain|written for StudySprint/.test(x)),
    'World History source sets label each source as a public-domain document or as an interpretation written for StudySprint');
  await p.click('#v-test button:has-text("Save and exit")');
  /* ---- U.S. Government tests mix one whole stimulus set with individual questions, as on the exam ---- */
  const gd = JSON.parse(fs.readFileSync(path.join(T.ROOT, 'data', 'courses', 'ap-united-states-government-and-politics', 'u1.json')));
  const gByPrompt = Object.fromEntries(gd.questions.map(q => [q.prompt, q]));
  await T.openUnit(p, 'AP U.S. Government', 'u1');
  await p.locator('#v-overview .test-cards > li').nth(0).locator('button:has-text("Start untimed")').click();
  await p.waitForSelector('#v-test form legend');
  const gSeen = [];
  for (let i = 0; i < 8; i++) {
    const q = gByPrompt[(await p.locator('#v-test form legend').first().textContent())];
    const src = await p.locator('#v-test .passage .passage-src').count() ? await p.locator('#v-test .passage .passage-src').first().textContent() : null;
    gSeen.push({ pid: q && q.passageId || null, src });
    if (i < 7) {
      const was = await p.locator('#v-test form legend').first().textContent();
      await p.click('#v-test .test-nav button.button-primary');
      await p.waitForFunction(w => { const l = document.querySelector('#v-test form legend'); return l && l.textContent !== w; }, was);
    }
  }
  const withP = gSeen.filter(x => x.pid), pRuns = gSeen.map(x => x.pid).filter((x, i, a) => x && (i === 0 || a[i - 1] !== x));
  T.ok(withP.length === 4 && gSeen.length - withP.length === 4 && pRuns.length === 1 && gSeen.every(x => !x.pid === !x.src) && withP.every(x => /Public domain|Hypothetical/.test(x.src)),
    'a U.S. Government test has one whole, labelled stimulus set (4 questions kept together) and 4 individual questions without a stimulus');
  await p.click('#v-test button:has-text("Save and exit")');
  /* ---- Psychology tests pair one hypothetical study or data set with individual questions, and review shows each question's skill ---- */
  const pd = JSON.parse(fs.readFileSync(path.join(T.ROOT, 'data', 'courses', 'ap-psychology', 'u2.json')));
  const pByPrompt = Object.fromEntries(pd.questions.map(q => [q.prompt, q]));
  await T.openUnit(p, 'AP Psychology', 'u2');
  await p.locator('#v-overview .test-cards > li').nth(1).locator('button:has-text("Start untimed")').click();
  await p.waitForSelector('#v-test form legend');
  const pSeen = [];
  for (let i = 0; i < 8; i++) {
    const q = pByPrompt[(await p.locator('#v-test form legend').first().textContent())];
    const src = await p.locator('#v-test .passage .passage-src').count() ? await p.locator('#v-test .passage .passage-src').first().textContent() : null;
    pSeen.push({ pid: q && q.passageId || null, src, q });
    await p.locator(`#v-test input.ans[value="${q.correctAnswer}"]`).check();
    const was = await p.locator('#v-test form legend').first().textContent();
    await p.click('#v-test .test-nav button.button-primary');
    if (i < 7) await p.waitForFunction(w => { const l = document.querySelector('#v-test form legend'); return l && l.textContent !== w; }, was);
  }
  const pWith = pSeen.filter(x => x.pid), pBlocks = pSeen.map(x => x.pid).filter((x, i, a) => x && (i === 0 || a[i - 1] !== x));
  T.ok(pWith.length === 4 && pBlocks.length === 1 && pSeen.every(x => !x.pid === !x.src) && pWith.every(x => /^Hypothetical (study summary|data)/.test(x.src)),
    'a Psychology test has one whole hypothetical study or data set (4 questions together, labelled as invented) and 4 individual questions');
  await p.click('#v-test button:has-text("Submit test")');
  await p.click('#v-test button:has-text("Yes, submit")');
  await p.waitForSelector('#v-test .ans-list');
  const pSum = await p.$$eval('#v-test .ans-item > summary', s => s.map(x => x.textContent));
  T.ok(pSum.length === 8 && pSum.every((t, i) => t.endsWith(' · Skill ' + pSeen[i].q.skill)), 'Psychology test review tags each question with its CED science-practice skill');
  T.ok(!p.errs.length, 'no page errors' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));

  /* ---- answer length gives nothing away in the passage-based banks ---- */
  for (const [cid, label] of [['ap-english-language-and-composition', 'English Language'], ['ap-united-states-history', 'U.S. History'],
                              ['ap-english-literature-and-composition', 'English Literature'], ['ap-world-history', 'World History'],
                              ['ap-united-states-government-and-politics', 'U.S. Government'], ['ap-psychology', 'Psychology']]) {
    let n = 0, longest = 0;
    for (const f of fs.readdirSync(path.join(T.ROOT, 'data', 'courses', cid)).filter(x => /^u\d+\.json$/.test(x))) {
      for (const q of JSON.parse(fs.readFileSync(path.join(T.ROOT, 'data', 'courses', cid, f))).questions) {
        const L = q.choices.map(c => c.length), k = L[q.correctAnswer];
        n++; if (L.filter(x => x >= k).length === 1) longest++;
      }
    }
    const units = JSON.parse(fs.readFileSync(path.join(T.ROOT, 'data', 'courses', cid, 'course.json'))).units.length;
    T.ok(n >= 16 * units && longest / n < 0.15, 'in ' + label + ' the correct choice is the uniquely longest in under 15% of questions (' + longest + ' of ' + n + ')');
  }

  /* ---- build rules for passages ---- */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-passages-'));
  for (const x of ['data', 'tools', 'css', 'js']) fs.cpSync(path.join(T.ROOT, x), path.join(tmp, x), { recursive: true });
  fs.copyFileSync(path.join(T.ROOT, 'index.html'), path.join(tmp, 'index.html'));
  const f = path.join(tmp, 'data', 'courses', COURSE, 'u1.json'), bad = JSON.parse(fs.readFileSync(f));
  bad.questions[0].passageId = 'no-such-passage';
  fs.writeFileSync(f, JSON.stringify(bad));
  const out = spawnSync('python3', [path.join(tmp, 'tools', 'build.py')], { encoding: 'utf8' });
  T.ok(out.status !== 0 && /passageId 'no-such-passage' is not a passage in this unit/.test(out.stdout), 'the build rejects a question whose passage does not exist');
  fs.rmSync(tmp, { recursive: true, force: true });

  console.log(T.summary()); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
