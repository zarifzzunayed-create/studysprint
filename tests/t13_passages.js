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
  T.ok(!p.errs.length, 'no page errors' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));

  /* ---- answer length gives nothing away in the English Literature bank ---- */
  let litN = 0, litLongest = 0;
  for (const f of fs.readdirSync(path.join(T.ROOT, 'data', 'courses', 'ap-english-literature-and-composition')).filter(x => /^u\d+\.json$/.test(x))) {
    for (const q of JSON.parse(fs.readFileSync(path.join(T.ROOT, 'data', 'courses', 'ap-english-literature-and-composition', f))).questions) {
      const L = q.choices.map(c => c.length), k = L[q.correctAnswer];
      litN++; if (L.filter(x => x >= k).length === 1) litLongest++;
    }
  }
  T.ok(litN >= 144 && litLongest / litN < 0.15, 'in English Literature the correct choice is the uniquely longest in under 15% of questions (' + litLongest + ' of ' + litN + ')');
  await p.context().close();

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
