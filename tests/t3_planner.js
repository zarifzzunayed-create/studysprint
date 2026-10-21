const T = require('./helpers');
const fs = require('fs');
(async () => {
  const b = await T.chromium.launch();
  /* earlier saved progress: v3 store with Physics answers, a legacy 4-step session, plus a v2-only key */
  const legacy = {
    v: 3, q: { 'ph1u1-q01': { f: 1, rt: [], t: 1 }, 'ph1u1-q02': { f: 0, rt: [1], t: 2 }, 'ph1u3-q04': { f: 0, rt: [], t: 3 } },
    u: { 'ap-physics-1/u1': { level: 2, streak: 0, wrong: 0, pref: [1, 2], cycle: ['ph1u1-q01', 'ph1u1-q02'] } },
    ctx: { courseId: 'ap-physics-1', unitId: 'u1', unitName: 'Unit 1: Kinematics' },
    sess: [{ id: 111, t: 1760000000000, unitKey: 'ap-physics-1/u1', unitTitle: 'Unit 1: Kinematics', minutes: 30, stepsDone: 4, distinct: 6, first: 6, firstOk: 5, retries: 0, retryOk: 0, met: true }] };
  const init = `localStorage.getItem('studysprint:v3') || localStorage.setItem('studysprint:v3', ${JSON.stringify(JSON.stringify(legacy))});`;
  let p = await T.fresh(b, { init });
  T.ok(/Continue where you left off: AP Physics 1: Algebra-Based · Unit 1: Kinematics/.test(await T.text(p, '#c-resume')), 'saved course/unit context survives the upgrade');
  await T.openUnit(p, 'physics 1', 'u1');
  let ov = await T.text(p, '#v-overview');
  T.ok(/2 of 14questions attempted/.test(ov) && /1 of 2first attempts correct/.test(ov) && /1 of 1retries correct/.test(ov), 'Physics 1 saved answers intact: 2 attempted, 1 of 2 first attempts, 1 of 1 retries');
  T.ok(/Adaptive level: Challenging\. Your preferred range: Standard to Challenging/.test(await (async () => { await T.tab(p, 'Practice'); return T.text(p, '#v-practice'); })()), 'saved adaptive level and preferred range intact');
  await T.tab(p, 'Results');
  let res = await T.text(p, '#v-results');
  T.ok(/4 of 4/.test(res) && /Sessions saved before the 5-step checklist show “of 4”/.test(res), 'legacy session still reads "4 of 4" with an explanation');
  await T.openUnit(p, 'physics 1', 'u3');
  T.ok(/1 of 9questions attempted/.test(await T.text(p, '#v-overview')) && /1questions to review|1 questions to review|1question/.test((await T.text(p, '#v-overview')).replace('questions to review','question')) , 'Physics 1 Unit 3 review queue item intact');

  /* planner on a Calculus AB unit: 5 steps, all tickable, counted out of 5 */
  await T.openUnit(p, 'AP Calculus AB', 'u3');
  await T.tab(p, 'Review plan');
  let pl = await T.text(p, '#v-planner');
  T.ok(/Planning for AP Calculus AB · Unit 3: Differentiation: Composite, Implicit, and Inverse Functions/.test(pl) && /A session has 5 steps/.test(pl), 'planner is tied to the selected Calculus AB unit and says 5 steps');
  await p.click('#v-planner button:has-text("Build my study session")');
  T.ok((await p.$$('#v-planner .pl-steps li')).length === 5, 'session lists 5 steps');
  T.ok(/Step 1 of 5: Review a guide section/.test(await T.text(p, '#v-planner')), 'step headings say "of 5"');
  for (let s = 1; s <= 5; s++) {
    T.ok(await p.isVisible('#v-planner .pl-nav button:has-text("Mark this step done")'), `step ${s} has a "Mark this step done" button`);
    await p.click('#v-planner .pl-nav button:has-text("Mark this step done")');
    if (s === 2) { for (let i = 0; i < 3; i++) { await T.answer(p, false); await T.nextQ(p); } }
    if (s === 4) { let g = 0; while (await p.isVisible('#v-planner form legend') && g++ < 5) { await T.answer(p, false); await T.nextQ(p); } }
    if (s < 5) await p.click('#v-planner .pl-nav button:has-text("Next step")');
  }
  pl = await T.text(p, '#v-planner');
  T.ok(/Step 5 of 5: Results and next step/.test(pl) && /Plan completion \(your own checklist\)/.test(pl) && /5 of 5 steps marked done/.test(pl), 'results: "5 of 5 steps marked done" under Plan completion');
  T.ok(/You marked every step done, but the practice threshold was not met/.test(pl), 'all 5 ticked with wrong answers -> threshold plainly not met');
  T.ok(/Practice evidence \(submitted answers\)/.test(pl) && /0 of \d+first attempts correct/.test(pl), 'evidence comes from submitted answers, shown separately');
  await p.click('#v-planner .pl-nav button:has-text("Marked done (undo)")');
  T.ok(/4 of 5 steps marked done/.test(await T.text(p, '#v-planner')), 'un-ticking step 5 updates the count to 4 of 5');
  await T.tab(p, 'Results');
  res = await T.text(p, '#v-results');
  T.ok(/4 of 5/.test(res) && /Not met/.test(res), 'session history records "4 of 5" and "Not met"');

  /* struggle inside the planner returns to the session */
  await T.tab(p, 'Review plan'); await p.click('#v-planner button:has-text("Plan another session")');
  await p.click('#v-planner button:has-text("Build my study session")');
  await p.click('#v-planner .pl-nav button:has-text("Next step")');
  await T.answer(p, false); await T.nextQ(p); const r = await T.answer(p, false);
  if (/Two first attempts in a row/.test(r.fb)) {
    await p.click('#v-planner button:has-text("Open learning resources")');
    await p.click('#v-learn button:has-text("Return to your study session")');
    T.ok(await p.isVisible('#v-planner .fb') && /2\. Answer practice questions/.test(await p.textContent('#v-planner .pl-steps li[aria-current=step]')), 'planner: resource offer after two misses, and return lands on the same step');
  } else T.ok(false, 'planner: expected a resource offer after two wrong first attempts (answers may have been retries) — ' + r.fb.slice(0, 80));
  T.ok(p.errs.length === 0, 'no console errors ' + JSON.stringify(p.errs));
  // status report and interface agree
  const status = fs.readFileSync(require('path').join(T.ROOT, 'CONTENT_STATUS.md'), 'utf8');
  T.ok(/A planner session has \*\*5 steps\*\*/.test(status) && /x of 5 steps marked done/.test(status), 'CONTENT_STATUS.md also says 5 steps, matching the interface');
  console.log(T.summary()); await b.close();
})();
