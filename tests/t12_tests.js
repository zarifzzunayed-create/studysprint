// Practice tests: honest test library, focused test view (nothing scored until submit), navigation and review marks,
// resume after refresh, confirmed submit, first attempts vs retries, results, separate retry set, review plan from
// results, retakes, timed auto-submit, backup of test history, fair question rotation, and build rules for tests.
const T = require('./helpers');
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const LS = p => p.evaluate(() => JSON.parse(localStorage.getItem('studysprint:v3')));
const legend = p => p.locator('#v-test form legend').first().textContent();
async function answerTest(p, correct) {
  const q = T.QBY[await legend(p)]; if (!q) throw new Error('unknown test question');
  if (q.type === 'multiple-choice') await p.locator(`#v-test input.ans[value="${correct ? q.correctAnswer : (q.correctAnswer + 1) % 4}"]`).check();
  else await p.locator('#v-test .q-num').fill(String(correct ? q.correctAnswer : q.correctAnswer * 3));
  return q;
}
const nextBtn = p => p.click('#v-test .test-nav button.button-primary');
const unit = (c, u) => JSON.parse(fs.readFileSync(path.join(T.ROOT, 'data', 'courses', c, u + '.json')));

(async () => {
  const b = await T.chromium.launch();
  let p = await T.fresh(b);

  /* ---- home and catalog ---- */
  const home = await T.text(p, '#v-home');
  T.ok(/Take a practice test/.test(home) && /Start a practice test/.test(home) && (await p.textContent('#c-go')) === 'See practice tests', 'home page and its main button are about starting a practice test');
  T.ok((await p.$$eval('#c-quick .quick-list li', l => l.map(x => x.textContent))).join('|').startsWith('AP Physics 1: Algebra-Based8 unit practice tests'), 'home lists courses that have practice tests, Physics 1 first');
  T.ok(!/\b(P?SAT)\b/.test(fs.readFileSync(path.join(T.ROOT, 'data', 'catalog.json'), 'utf8')) && !/\bP?SAT\b/.test(home), 'no SAT or PSAT content or options anywhere in the catalog or home page');
  await p.fill('#c-search', 'calc');
  T.ok((await p.$$eval('#c-list .opt', e => e.map(x => x.textContent))).some(o => o.startsWith('AP Calculus AB') && o.includes('8 unit practice tests')) , 'course search shows how many unit practice tests a course has');

  /* ---- the unit's test library is honest about coverage ---- */
  await T.openUnit(p, 'AP Physics 1', 'u3');
  const lib = await T.text(p, '#test-lib');
  T.ok(/Practice test 1/.test(lib) && /8 questions/.test(lib) && /All 3 concepts/.test(lib) && /3 introductory · 3 standard · 2 challenging/.test(lib), 'unit page lists Practice test 1 with its size, concept coverage and difficulty mix');
  T.ok(/not a full AP exam/.test(lib) && /one practice test so far/.test(lib) && /9 questions; the 1 question not in the test appears in adaptive practice/.test(lib) && /same questions in a new order/.test(lib), 'unit page says it is not a full exam, that only one test exists, and that a retake reuses the same questions');
  T.ok(/Start timed \(16 min\)/.test(lib) && /not an official AP time limit/.test(lib), 'timed option shows its length and says the pacing is not official');
  T.ok((await p.getAttribute('#ctx-nav button[aria-current="page"]', 'aria-label')) === null && (await p.textContent('#ctx-nav button[aria-current="page"]')) === 'Tests', 'Tests is the first unit tab and the unit opens on it');

  /* ---- taking the test: nothing is scored or explained until submit ---- */
  const before = await LS(p);
  await p.click('#v-overview button:has-text("Start untimed")');
  await p.waitForSelector('#v-test form legend');
  T.ok(await p.isHidden('#ctx-nav') && await p.evaluate(() => document.activeElement.tagName === 'LEGEND'), 'the test view hides the unit tabs and focuses the first question');
  const order = [];
  const q1 = await answerTest(p, true); order.push(q1.id);
  T.ok(JSON.stringify((await LS(p)).q) === JSON.stringify(before.q) && !(await p.locator('#v-test .fb').count()) && !/Correct|explanation/i.test(await T.text(p, '#v-test .test-body')), 'choosing an answer records nothing and shows no correctness or explanation');
  T.ok(/Question 1 of 8 · 1 of 8 answered/.test(await T.text(p, '.test-status')) && (await p.getAttribute('.test-meter', 'aria-valuenow')) === '1', 'progress shows the question number and how many are answered');
  await p.click('#v-test button:has-text("Mark for review")');
  T.ok((await p.getAttribute('.test-grid button:nth-child(1)', 'aria-label')) === 'Question 1, answered, marked for review' && /1 marked for review/.test(await T.text(p, '.test-status')), 'mark for review shows in the navigator and the progress line');
  await nextBtn(p);
  const q2 = await answerTest(p, false); order.push(q2.id);
  await p.click('.test-grid button:nth-child(5)');
  T.ok(/Question 5 of 8/.test(await T.text(p, '.test-status')) && (await p.getAttribute('.test-grid button:nth-child(5)', 'aria-current')) === 'step', 'the navigator jumps to any question');
  await p.click('#v-test button:has-text("← Back")');
  T.ok(/Question 4 of 8/.test(await T.text(p, '.test-status')), 'Back moves to the previous question');

  /* ---- refresh: the same test, order and answers come back ---- */
  const run = (await LS(p)).runs['test|ap-physics-1/u3'];
  T.ok(run && run.kind === 'test' && run.test.order.length === 8 && Object.keys(run.test.ans).length === 2, 'the unfinished test is saved on this device as you go');
  await p.reload(); await p.waitForSelector('#v-test form legend');
  T.ok(/Question 4 of 8 · 2 of 8 answered · 1 marked/.test(await T.text(p, '.test-status')), 'after a refresh the test resumes on the same question with answers and marks');
  await p.click('.test-grid button:nth-child(1)');
  T.ok(T.QBY[await legend(p)].id === q1.id && await p.locator(`#v-test input.ans[value="${q1.correctAnswer}"]`).isChecked(), 'question order and chosen answers survive the refresh');
  // answer questions 3..6 (two right, two wrong), leave 7 and 8 empty
  for (let i = 2; i < 6; i++) { await p.click(`.test-grid button:nth-child(${i + 1})`); order.push((await answerTest(p, i % 2 === 0)).id); }
  await p.click('#v-test button:has-text("Review and submit")');
  const rv = await T.text(p, '#v-test .test-body');
  T.ok(/6 of 8 answered, 1 marked for review/.test(rv) && /Question 7: not answered/.test(rv) && /Unanswered questions are scored as incorrect/.test(rv), 'review screen lists unanswered and marked questions before submitting');
  await p.click('#v-test button:has-text("Submit test")');
  T.ok(await p.isVisible('#v-test button:has-text("Yes, submit my test")') && /2 unanswered questions will be scored as incorrect/.test(await T.text(p, '#v-test .test-body')) && !(await LS(p)).u['ap-physics-1/u3'].tests, 'submitting asks for confirmation first and nothing is scored yet');
  await p.click('#v-test button:has-text("Yes, submit my test")');
  await p.waitForSelector('#v-test h2:has-text("results")');

  /* ---- results ---- */
  const after = await LS(p), res = await T.text(p, '#v-test');
  const recorded = Object.keys(after.q).filter(k => k.startsWith('ph1u3-'));
  T.ok(recorded.length === 6 && order.every(id => after.q[id]) && recorded.every(k => after.q[k].rt.length === 0), 'only the 6 answered questions were recorded, each as a first attempt; unanswered ones were not');
  T.ok(after.q[q1.id].f === 1 && after.q[q2.id].f === 0, 'first-attempt results match the submitted answers');
  T.ok(/Score/.test(res) && /3 of 8correct \(38%\)/.test(res) && /2not answered/.test(res) && /3 of 6first attempts correct/.test(res), 'score counts unanswered as incorrect and shows first attempts separately');
  T.ok(/not a full AP exam, and it cannot predict an AP score/.test(res), 'results say this is not a full AP exam');
  T.ok(/Results by concept/.test(res) && (await p.$$('#v-test .tbl table')).length === 2 && /Review this concept/.test(res), 'results include a concept breakdown and a difficulty breakdown');
  const items = await p.$$eval('#v-test details.ans-item', d => d.map(x => ({ open: x.open, s: x.querySelector('summary').textContent, t: x.textContent })));
  T.ok(items.length === 8 && items.every(x => /Correct answer:/.test(x.t)) && items.filter(x => x.open).length === 5 && items.filter(x => !x.open).every(x => / · Correct · /.test(x.s)), 'every answer has its explanation; missed and unanswered ones are open');
  T.ok(after.u['ap-physics-1/u3'].tests.t1.n === 1 && after.u['ap-physics-1/u3'].tests.t1.items.length === 8 && !after.runs['test|ap-physics-1/u3'], 'the submission is kept as test history and the unfinished test is cleared');
  T.ok(/Retry missed questions \(5\)/.test(await T.text(p, '#test-retry')) && /your score above does not change/.test(await T.text(p, '#test-retry')), 'a separate section offers to retry the 5 missed or unanswered questions');

  /* ---- confidence and the suggested review plan ---- */
  await p.check('#v-test .conf-scale input[value="2"]');
  T.ok((await LS(p)).u['ap-physics-1/u3'].conf.value === 2 && /Start with the study guide or the Learn first resources/.test(await T.text(p, '#v-test .learn-offer')), 'a low confidence rating with a low score suggests Learn first before the review plan');
  const missedTopics = [...new Set(items.map((x, i) => x).filter(x => x.open).map(x => x.s.split(' · ')[2]))];
  await p.click('#v-test button:has-text("Build a review plan from these results")');
  await p.waitForSelector('#v-planner:not([hidden]) h2');
  const plan = await T.text(p, '#v-planner');
  const checked = await p.$$eval('#v-planner .topic-pick', r => r.filter(x => x.querySelector('input').checked).map(x => x.querySelector('label').firstChild.textContent));
  T.ok(/Review plan/.test(plan) && /Built from your Practice test 1 results \(3 of 8 correct\)/.test(plan) && /Planning for AP Physics 1: Algebra-Based · Unit 3/.test(plan), 'the review plan opens for the same course and unit, built from the test results');
  T.ok(checked.length === missedTopics.length && checked.every(c => missedTopics.includes(c)), 'the missed concepts are the ones selected in the review plan: ' + checked.join('; '));
  T.ok(await p.$eval('#pl-min', s => s.value) === '45' && await p.$eval('#v-planner .topic-pick select', s => s.value) === '2', 'plan length follows the number of misses, and concept confidence starts from the student\'s rating');

  /* ---- retry missed questions: recorded as retries, never changing the test score ---- */
  await T.tab(p, 'Tests'); await p.click('#v-overview button:has-text("Review last attempt")');
  await p.click('#test-retry button');
  await p.waitForSelector('#v-practice form legend');
  T.ok(/Retry missed questions: Practice test 1/.test(await T.text(p, '#v-practice h2')), 'retry opens as its own set, outside the test');
  const rq = await T.answer(p, true);
  const r1 = (await LS(p)).q[rq.q.id];
  T.ok(order.includes(rq.q.id) ? r1.f === 0 && r1.rt.join() === '1' : r1.f === 1 && r1.rt.length === 0, 'a retried question already answered is a retry; one left unanswered gets its first attempt');
  T.ok((await LS(p)).u['ap-physics-1/u3'].tests.t1.score === 3, 'retrying does not change the test score');
  await T.nextQ(p);
  for (let i = 1; i < 5; i++) { await T.answer(p, true); await T.nextQ(p); }
  await p.click('#v-practice button:has-text("Back to test results")');
  T.ok(await p.isVisible('#v-test h2:has-text("results")'), 'from the retry set the student can go back to the test results');

  /* ---- results survive a refresh; retaking uses the same questions as retries ---- */
  await p.reload(); await p.waitForSelector('#v-test h2:has-text("results")');
  T.ok(/3 of 8correct/.test(await T.text(p, '#v-test')), 'refreshing on the results page shows the same results again');
  const firstsBefore = JSON.stringify(Object.fromEntries(Object.entries((await LS(p)).q).map(([k, v]) => [k, v.f])));
  await p.click('#v-test button:has-text("Take Practice test 1 again")');
  await p.waitForSelector('#v-test form legend');
  const seen = [];
  for (let i = 0; i < 8; i++) { seen.push((await answerTest(p, true)).id); await nextBtn(p); }
  await p.click('#v-test button:has-text("Submit test")'); await p.click('#v-test button:has-text("Yes, submit my test")');
  await p.waitForSelector('#v-test h2:has-text("results")');
  const t1 = unit('ap-physics-1', 'u3').tests[0].questionIds, L2 = await LS(p);
  T.ok(seen.slice().sort().join() === t1.slice().sort().join(), 'a retake uses exactly the same question set (it is not presented as a new test)');
  T.ok(JSON.stringify(Object.fromEntries(Object.entries(L2.q).filter(([k]) => k in JSON.parse(firstsBefore)).map(([k, v]) => [k, v.f]))) === firstsBefore && L2.u['ap-physics-1/u3'].tests.t1.n === 2 && L2.u['ap-physics-1/u3'].tests.t1.best === 8, 'retake answers are retries: first attempts are unchanged; history counts 2 submissions');
  T.ok(/answers were to questions you had answered before, so they were recorded as retries/.test(await T.text(p, '#v-test')), 'retake results explain that repeated answers are retries');
  T.ok(p.errs.length === 0, 'no page errors in the test flow (' + p.errs.join(' | ') + ')');
  await p.context().close();

  /* ---- timed mode: the clock runs out and the test is submitted ---- */
  p = await T.fresh(b);
  await T.openUnit(p, 'AP Statistics', 'u2');
  await p.click('#v-overview button:has-text("Start timed")');
  await p.waitForSelector('.test-clock-read');
  T.ok(/^1[56]:\d\d$/.test(await p.textContent('.test-clock-read')) && /\(timed\)/.test(await p.textContent('#v-test h2')), 'a timed test shows a countdown from 16 minutes');
  await p.click('#v-test .test-clock button');
  T.ok((await p.textContent('.test-clock-read')) === 'Timer hidden' && (await p.getAttribute('#v-test .test-clock button', 'aria-pressed')) === 'true', 'the timer can be hidden');
  await answerTest(p, true);
  await p.click('#v-test button:has-text("Save and exit")');
  T.ok(/In progress: 1 of 8 questions answered/.test(await T.text(p, '#test-lib')), 'Save and exit keeps the test; the unit page offers Resume');
  await p.evaluate(() => { const P = JSON.parse(localStorage.getItem('studysprint:v3')); P.runs['test|ap-statistics/u2'].test.left = 2; localStorage.setItem('studysprint:v3', JSON.stringify(P)); P.ctx.view = 'test'; localStorage.setItem('studysprint:v3', JSON.stringify(P)); });
  await p.reload();
  await p.waitForSelector('#v-test h2:has-text("results")', { timeout: 10000 });
  const auto = (await LS(p)).u['ap-statistics/u2'].tests.t1;
  T.ok(/Time ran out, so the test was submitted automatically/.test(await T.text(p, '#v-test')) && auto.auto === true && auto.answered === 1 && auto.timed, 'when time runs out the test is submitted automatically with the chosen answers');
  T.ok(p.errs.length === 0, 'no page errors in timed mode (' + p.errs.join(' | ') + ')');

  /* ---- test history in backups ---- */
  const exp = JSON.parse(await p.evaluate(() => SS.backup.exportText()));
  T.ok(exp.progress.u['ap-statistics/u2'].tests.t1.items.length === 8, 'a backup includes practice test history');
  const v = await p.evaluate((e) => SS.backup.validate(e), exp);
  T.ok(v.ok && v.clean.u['ap-statistics/u2'].tests.t1.score === auto.score && !v.skipped, 'the backup restores its test history unchanged');
  const bad = JSON.parse(JSON.stringify(exp)); bad.progress.u['ap-statistics/u2'].tests.t1.score = 99;
  const vb = await p.evaluate((e) => SS.backup.validate(e), bad);
  T.ok(vb.ok && vb.skipped === 1 && /practice test history is not valid/.test(vb.reasons.join()), 'a tampered test history is rejected with a reason');
  const more = JSON.parse(JSON.stringify(exp)); Object.assign(more.progress.u['ap-statistics/u2'].tests.t1, { n: 5, best: 0, score: 0 });
  await p.evaluate((e) => SS.backup.apply(SS.backup.validate(e).clean, 'merge'), more);
  T.ok((await LS(p)).u['ap-statistics/u2'].tests.t1.n === 5, 'merge keeps the test history with more submissions');
  await p.click('header button:has-text("My data")');
  T.ok(/Practice test history/.test(await T.text(p, '#v-data')) && /Practice tests you have started but not submitted/.test(await T.text(p, '#v-data')), 'My data says what a backup holds about practice tests');
  await p.context().close();

  /* ---- fair rotation: adaptive follow-ups never repeat a question while unused ones remain ---- */
  p = await T.fresh(b);
  await T.openUnit(p, 'AP Physics 1', 'u1');
  const rot = await p.evaluate(() => {
    const u = SS.ST.unit, A = SS.adaptive, R = { answered: [], lastId: null, lastTopic: null, prevTopic: null, sinceRetry: 0, followUp: null, recent: [] };
    const ids = [];
    for (let i = 0; i < u.questions.length; i++) {
      const x = A.pick(u, R, { noRetry: true }); ids.push(x.q.id);
      const ok = false; SS.store.record(x.q, ok); // always wrong, so a follow-up on the same concept is requested every time
      R.followUp = { topicId: x.q.topicId, level: A.lv(x.q), qid: x.q.id }; R.lastId = x.q.id; R.prevTopic = R.lastTopic; R.lastTopic = x.q.topicId;
    }
    return { n: u.questions.length, distinct: new Set(ids).size };
  });
  T.ok(rot.distinct === rot.n, 'a full round of adaptive practice with every answer wrong still serves all ' + rot.n + ' questions once before any repeat (' + rot.distinct + ' distinct)');
  await p.context().close();

  /* ---- build rules: a reshuffled or padded "test" is rejected ---- */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-tests-'));
  for (const d of ['data', 'tools', 'css', 'js']) fs.cpSync(path.join(T.ROOT, d), path.join(tmp, d), { recursive: true });
  fs.copyFileSync(path.join(T.ROOT, 'index.html'), path.join(tmp, 'index.html'));
  const f = path.join(tmp, 'data', 'courses', 'ap-calculus-ab', 'u1.json'), d = JSON.parse(fs.readFileSync(f));
  d.tests.push({ id: 't2', title: 'Practice test 2', questionIds: d.tests[0].questionIds.slice().reverse() });
  fs.writeFileSync(f, JSON.stringify(d));
  const out = spawnSync('python3', [path.join(tmp, 'tools', 'build.py')], { encoding: 'utf8' });
  T.ok(out.status !== 0 && /shares questions with another test/.test(out.stdout), 'the build rejects a second test that only reorders the first test\'s questions');
  fs.rmSync(tmp, { recursive: true, force: true });
  const status = fs.readFileSync(path.join(T.ROOT, 'CONTENT_STATUS.md'), 'utf8');
  T.ok(/## Practice tests/.test(status) && /\| Unit 1: Kinematics \| 14 \| 1 \(8\) \| 6 \| 1 \| 10 \|/.test(status) && /21 practice tests in 21 units/.test(status), 'CONTENT_STATUS.md reports tests, capacity and the original questions still needed');

  console.log(T.summary()); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
