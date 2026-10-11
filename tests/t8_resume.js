// Save and resume an unfinished practice set or planner session; history, titles, old-progress compatibility.
const T = require('./helpers');
const legend = p => p.locator('form legend:visible').first().textContent();
const head = p => p.locator('#v-practice .eyebrow:visible').first().textContent();
const LS = p => p.evaluate(() => JSON.parse(localStorage.getItem('studysprint:v3')));
(async () => {
  const b = await T.chromium.launch();
  let p = await T.fresh(b);

  /* ---- practice set: refresh mid-question, refresh after answering, finish ---- */
  await T.openUnit(p, 'AP Physics 1', 'u1');
  await T.tab(p, 'Practice');
  await p.selectOption('#p-size', '5'); await p.click('#v-practice button:has-text("Start practice")');
  const a1 = await T.answer(p, true); await T.nextQ(p);
  const a2 = await T.answer(p, false); await T.nextQ(p);
  const q3 = await legend(p), h3 = await head(p);
  let st = await LS(p);
  T.ok(st.runs['practice|ap-physics-1/u1'] && st.runs['practice|ap-physics-1/u1'].state.stage === 'asking', 'unfinished set is saved while a question is open');
  await p.reload(); await p.waitForSelector('#v-practice:not([hidden]) form legend');
  T.ok(await legend(p) === q3, 'refresh mid-question: the same question is shown again');
  T.ok((await head(p)) === h3 && h3.startsWith('Question 3 of 5'), 'refresh keeps the question number (' + (await head(p)) + ')');
  T.ok(await p.isVisible('#ctx-nav button[aria-current="page"]:has-text("Practice")'), 'refresh returns to the Practice tab of the same unit');
  st = await LS(p);
  T.ok(st.q[a1.q.id].f === 1 && st.q[a2.q.id].f === 0 && Object.keys(st.q).length === 2, 'answers from before the refresh are kept, nothing double-counted');
  const r3 = await T.answer(p, true);
  T.ok(/First attempt/.test(r3.fb), 'question answered after refresh still counts as a first attempt');
  await p.reload(); await p.waitForSelector('#v-practice:not([hidden]) form legend');
  const q4 = await legend(p);
  T.ok(q4 !== q3 && (await head(p)).startsWith('Question 4 of 5'), 'refresh after answering moves on to question 4, not a repeat');
  await T.answer(p, true); await T.nextQ(p); await T.answer(p, true);
  await p.click('.fb:visible button:has-text("Finish and see results")');
  await p.waitForSelector('#v-practice h2:has-text("Set results")');
  const sr = await T.text(p, '#v-practice');
  T.ok(/5\s*different questions answered/.test(sr) || sr.includes('5different questions'), 'set summary after a resumed set counts all 5 questions');
  T.ok(!(await LS(p)).runs['practice|ap-physics-1/u1'], 'finished set is removed from the unfinished list');

  /* ---- resume card on a normal visit (not a refresh) ---- */
  await T.tab(p, 'Practice'); await p.click('#v-practice button:has-text("Practice options")');
  await p.click('#v-practice button:has-text("Start practice")');
  await T.answer(p, false); await T.nextQ(p);
  const qq = await legend(p);
  await p.goto(T.U);
  await p.waitForSelector('#c-resume .card');
  const card = await T.text(p, '#c-resume');
  T.ok(/Unfinished practice/.test(card) && /AP Physics 1/.test(card) && /1 question answered of 8/.test(card), 'home lists the unfinished set with its progress: ' + card.slice(0, 140));
  T.ok(await p.isVisible('#v-home:not([hidden])'), 'a normal visit starts on the home page (no surprise jump)');
  await p.click('#c-resume button:has-text("Resume")');
  await p.waitForSelector('#v-practice:not([hidden]) form legend');
  T.ok(await legend(p) === qq, 'Resume button continues with the same question');
  // Discard needs a second click, and keeps submitted answers
  await p.goto(T.U); await p.waitForSelector('#c-resume .card');
  const nQ = Object.keys((await LS(p)).q).length;
  await p.click('#c-resume button:has-text("Discard")');
  T.ok(await p.isVisible('#c-resume button:has-text("Click again to discard")'), 'Discard asks for a second click');
  await p.click('#c-resume button:has-text("Click again to discard")');
  st = await LS(p);
  T.ok(!st.runs['practice|ap-physics-1/u1'] && Object.keys(st.q).length === nQ, 'discarding removes the unfinished set but keeps submitted answers');

  /* ---- review queue set resumes as a review set ---- */
  await T.openUnit(p, 'AP Physics 1', 'u1');
  await T.tab(p, 'Practice');
  await p.click('#v-practice button:has-text("Review missed questions")');
  const rq = await legend(p);
  await p.reload(); await p.waitForSelector('#v-practice:not([hidden]) form legend');
  T.ok(await legend(p) === rq && /Review missed questions/.test(await T.text(p, '#v-practice h2')), 'review set resumes as a review set with the same question');

  /* ---- practice setup offers the unfinished set ---- */
  await T.tab(p, 'Overview'); await T.tab(p, 'Results');
  await p.goto(T.U); await T.openUnit(p, 'AP Physics 1', 'u1'); await T.tab(p, 'Practice');
  T.ok(/You have an unfinished set/.test(await T.text(p, '#v-practice')), 'Practice tab offers to resume the unfinished set');
  await p.click('#v-practice button:has-text("Resume the unfinished set")');
  T.ok(await legend(p) === rq, 'resume from the Practice tab works');

  /* ---- planner: refresh keeps the step, answers, and ticks ---- */
  await p.goto(T.U); await T.openUnit(p, 'AP Calculus AB', 'u2');
  await T.tab(p, 'Study planner');
  await p.click('#v-planner button:has-text("Build my study session")');
  await p.click('#v-planner button:has-text("Mark this step done")');
  await p.click('#v-planner button:has-text("Next step")');
  await T.answer(p, false); await T.nextQ(p); await T.answer(p, true); await T.nextQ(p);
  const pq = await legend(p);
  await p.reload(); await p.waitForSelector('#v-planner:not([hidden]) form legend');
  const cur = await T.text(p, '#v-planner li[aria-current="step"]');
  T.ok(/^2\./.test(cur), 'planner refresh: still on step 2 (' + cur.slice(0, 40) + ')');
  T.ok(await legend(p) === pq, 'planner refresh: same practice question');
  T.ok(/1\. .*Marked done/.test(await T.text(p, '#v-planner .pl-steps li:first-child')), 'planner refresh: step 1 tick kept');
  // finish practice step
  for (let i = 0; i < 12; i++) {
    if (!(await p.locator('#v-planner form legend:visible').count())) break;
    await T.answer(p, true);
    const btn = p.locator('.fb:visible button.button-primary').first(); await btn.click();
  }
  await p.click('#v-planner button:has-text("Next step")');
  const ex = await T.text(p, '#v-planner');
  T.ok(!/Answer questions in the practice step first/.test(ex), 'step 3 shows explanations for misses made before the refresh');
  await p.reload(); await p.waitForSelector('#v-planner:not([hidden]) .pl-steps');
  T.ok(/^3\./.test(await T.text(p, '#v-planner li[aria-current="step"]')), 'planner refresh on step 3 keeps step 3');
  await p.click('#v-planner button:has-text("Next step")');
  const rt = await legend(p);
  await p.reload(); await p.waitForSelector('#v-planner:not([hidden]) form legend');
  T.ok(await legend(p) === rt, 'planner refresh on step 4: same targeted question');
  await p.click('#v-planner button:has-text("Next step")');
  await p.waitForSelector('#v-planner h4:has-text("Plan completion")');
  T.ok(!(await LS(p)).runs['planner|ap-calculus-ab/u2'], 'reaching results saves the session and clears the unfinished planner');
  const sess = (await LS(p)).sess.filter(s => s.unitKey === 'ap-calculus-ab/u2');
  T.ok(sess.length === 1 && sess[0].stepsDone === 1 && sess[0].stepsTotal === 5, 'one session saved with the tick from before the refresh');
  // Start over needs confirmation
  await p.click('#v-planner button:has-text("Plan another session")');
  await p.click('#v-planner button:has-text("Build my study session")');
  await p.click('#v-planner button:has-text("Start over")');
  T.ok(await p.isVisible('#v-planner button:has-text("Click again to discard this session")'), 'Start over asks for a second click');
  await p.click('#v-planner button:has-text("Click again")');
  T.ok(await p.isVisible('#v-planner button:has-text("Build my study session")'), 'second click starts over');

  /* ---- history, titles, headings ---- */
  await T.tab(p, 'Study guide'); await T.tab(p, 'Videos');
  T.ok(/^Videos — AP Calculus AB · Unit 2/.test(await p.title()), 'page title names the view, course and unit: ' + await p.title());
  T.ok(/Videos/.test(await p.textContent('#sr-title')), 'each view has a page-level heading for screen readers');
  await p.goBack();
  T.ok(await p.isVisible('#v-guide:not([hidden])'), 'browser Back returns to the previous view');
  await p.goForward();
  T.ok(await p.isVisible('#v-videos:not([hidden])'), 'browser Forward works too');
  await p.click('header button:has-text("Courses")'); await p.goBack();
  T.ok(await p.isVisible('#v-videos:not([hidden])') && await p.isVisible('#ctx'), 'Back from home returns to the unit view');
  T.ok(p.errs.length === 0, 'no page errors (' + p.errs.join(' | ') + ')');
  await p.context().close();

  /* ---- compatibility with progress saved by earlier versions ---- */
  p = await T.fresh(b, { init: () => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('studysprint:v3', JSON.stringify({ v: 3, q: { 'ph1u1-q01': { f: 1, rt: [0], t: 5 } }, u: { 'ap-physics-1/u1': { level: 2, streak: 1, wrong: 0, pref: [0, 2], cycle: ['ph1u1-q01'] } }, ctx: { courseId: 'ap-physics-1', unitId: 'u1', unitName: 'Unit 1' }, sess: [{ id: 1, t: 1700000000000, unitKey: 'ap-physics-1/u1', unitTitle: 'U1', minutes: 30, stepsDone: 4, distinct: 5, first: 5, firstOk: 4, retries: 0, retryOk: 0, met: true }] })); } } });
  await T.openUnit(p, 'AP Physics 1', 'u1'); await T.tab(p, 'Results');
  const res = await T.text(p, '#v-results');
  T.ok(/1 of 1/.test(res) && /4 of 4/.test(res) && /0 of 1/.test(res), 'progress saved before this update (no runs field) still shows: first attempt, old 4-step session, retry');
  await T.tab(p, 'Practice'); await p.click('#v-practice button:has-text("Start practice")'); await T.answer(p, true);
  T.ok((await LS(p)).q['ph1u1-q01'].f === 1, 'old records are kept when new answers are saved');
  await p.context().close();
  p = await T.fresh(b, { init: () => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('studysprint:v2', JSON.stringify({ 'ph1u1-q02': { f: 0, rt: [1] } })); } } });
  await T.openUnit(p, 'AP Physics 1', 'u1');
  T.ok(/1 of 9|1 of \d+questions attempted|0 of 1/.test(await T.text(p, '#v-overview')), 'v2 progress from the first version is still migrated');
  T.ok(p.errs.length === 0, 'no page errors (' + p.errs.join(' | ') + ')');

  console.log(T.summary()); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
