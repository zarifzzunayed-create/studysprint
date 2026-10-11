// My data clarity: what a backup includes/excludes, and merge rules shown in the preview match what merge does.
const T = require('./helpers');
const LS = p => p.evaluate(() => JSON.parse(localStorage.getItem('studysprint:v3')));
const sess = (id, t) => ({ id, t, unitKey: 'ap-physics-1/u1', unitTitle: 'U1', minutes: 30, stepsDone: 2, stepsTotal: 5, distinct: 5, first: 5, firstOk: 3, retries: 0, retryOk: 0, met: false });
const DEVICE = { v: 3, ctx: null, runs: {}, sess: [sess(1, 1000)],
  q: { 'ph1u1-q01': { f: 0, rt: [], t: 100 }, 'ph1u1-q02': { f: 1, rt: [1, 0], t: 100 }, 'ph1u1-q03': { f: 1, rt: [], t: 100 } },
  u: { 'ap-physics-1/u1': { level: 2, streak: 1, wrong: 0, pref: [1, 2], cycle: ['ph1u1-q01'], conf: { value: 4, t: 500 } } } };
const BACKUP = { app: 'StudySprint', format: 1, exportedAt: '2026-10-01T12:00:00Z', progress: {
  q: { 'ph1u1-q01': { f: 1, rt: [1, 1], t: 50 }, 'ph1u1-q02': { f: 0, rt: [], t: 900 }, 'ph1u1-q03': { f: 0, rt: [], t: 200 }, 'ph1u1-q04': { f: 1, rt: [], t: 300 } },
  u: { 'ap-physics-1/u1': { level: 0, streak: 0, wrong: 1, pref: [0, 0], cycle: [], conf: { value: 1, t: 900 }, warmup: { correct: 1, total: 3, conf: 1, t: 900 } },
       'ap-calculus-ab/u1': { level: 1, streak: 0, wrong: 0, pref: [0, 2], cycle: [] } },
  sess: [sess(1, 1000), sess(2, 2000)] } };
(async () => {
  const b = await T.chromium.launch();
  const p = await T.fresh(b, { init: `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('studysprint:v3', ${JSON.stringify(JSON.stringify(DEVICE))}); }` });
  // leave an unfinished set on this device
  await T.openUnit(p, 'AP Physics 1', 'u2'); await T.tab(p, 'Practice');
  await p.click('#v-practice button:has-text("Start practice")'); await T.answer(p, true);
  const unfinishedKey = 'practice|ap-physics-1/u2';
  T.ok(!!(await LS(p)).runs[unfinishedKey], 'setup: an unfinished set exists on this device');

  await p.click('header button:has-text("My data")'); await p.waitForSelector('#v-data:not([hidden]) h2');
  const page = await T.text(p, '#v-data');
  T.ok(/A backup includes:/.test(page) && /Answer results/.test(page) && /Unit settings: your adaptive level, preferred difficulty range/.test(page) && /Completed study-session history/.test(page), 'page lists what a backup includes');
  T.ok(/A backup does not include:/.test(page) && /Unfinished practice sets or planner sessions\. They stay in this browser on this device and will not transfer with a backup/.test(page), 'page says unfinished sets are not in a backup and stay on this device');
  T.ok(/Answers you already submitted in them are included as answer results/.test(page), 'page says submitted answers from an unfinished set are still backed up');
  const exp = JSON.parse(await p.evaluate(() => SS.backup.exportText()));
  T.ok(!('runs' in exp.progress) && Object.keys(exp.progress).sort().join() === 'q,sess,u', 'the backup file really holds only answer results, unit settings and sessions (no unfinished sets)');
  T.ok(Object.keys(exp.progress.q).length === 4, 'the answer submitted in the unfinished set is in the backup');

  await p.fill('#d-paste', JSON.stringify(BACKUP)); await p.click('#v-data button:has-text("Check pasted text")');
  await p.waitForSelector('#d-review .card');
  const pv = await T.text(p, '#d-review');
  T.ok(/Not included: unfinished practice sets or planner sessions/.test(pv), 'preview says unfinished sets are not included');
  T.ok(/the same question: one record is kept, not combined/.test(pv), 'preview says overlapping questions are not combined');
  T.ok(/share 3 questions: 2 would use the backup's record and 1 would keep this device's/.test(pv), 'preview counts shared questions correctly: ' + (pv.match(/share 3[^.]*\./) || [''])[0]);
  T.ok(/this device keeps its adaptive level, difficulty range, and the questions seen in the current round/.test(pv) && /share 1 unit; 1 would take a newer confidence rating or warm-up result/.test(pv), 'preview explains unit settings stay local except newer rating/warm-up');
  T.ok(/1 session in this backup is already here/.test(pv) && /Unfinished sets on this device stay as they are/.test(pv), 'preview covers sessions and unfinished sets');
  T.ok(/After this merge, this device will have 5 answered questions, 3 units with progress, and 2 study sessions/.test(pv), 'merge result counts are right: ' + (pv.match(/After this merge[^)]*\)/) || [''])[0]);
  await p.check('#d-mode-replace');
  T.ok(await p.isHidden('#d-merge-rules') && /All progress on this device is removed, including unfinished sets/.test(await T.text(p, '#d-review')) && /1 unfinished set will be discarded/.test(await T.text(p, '#d-review')), 'replace hides merge rules and says unfinished sets are removed');
  await p.check('#d-mode-merge');
  T.ok(await p.isVisible('#d-merge-rules'), 'merge rules show again for merge');

  await p.click('#d-review button:has-text("Restore this backup")');
  const m = await LS(p);
  T.ok(JSON.stringify(m.q['ph1u1-q01']) === JSON.stringify({ f: 1, rt: [1, 1], t: 50 }), 'question with more attempts in the backup: backup record used whole');
  T.ok(JSON.stringify(m.q['ph1u1-q02']) === JSON.stringify({ f: 1, rt: [1, 0], t: 100 }), 'question with more attempts on the device: device record kept whole (not mixed)');
  T.ok(m.q['ph1u1-q03'].f === 0 && m.q['ph1u1-q03'].t === 200, 'equal attempts: the more recent record is kept');
  T.ok(!!m.q['ph1u1-q04'] && !!m.u['ap-calculus-ab/u1'], 'items only in the backup are added');
  const u = m.u['ap-physics-1/u1'];
  T.ok(u.level === 2 && u.streak === 1 && JSON.stringify(u.pref) === '[1,2]' && JSON.stringify(u.cycle) === '["ph1u1-q01"]', 'shared unit keeps this device\'s level, streak, range and seen list');
  T.ok(u.conf.value === 1 && u.warmup && u.warmup.correct === 1, 'shared unit takes the newer confidence rating and warm-up from the backup');
  T.ok(m.sess.length === 2 && m.sess.filter(s => s.id === 1).length === 1, 'shared session listed once');
  T.ok(!!m.runs[unfinishedKey], 'the unfinished set on this device is still there after a merge');
  T.ok(p.errs.length === 0, 'no page errors (' + p.errs.join(' | ') + ')');
  console.log(T.summary()); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
