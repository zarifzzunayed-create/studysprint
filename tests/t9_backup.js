// Progress export, validated restore with preview, undo, clear-all, hostile files, blocked storage.
const T = require('./helpers');
const fs = require('fs'), path = require('path');
const TMP = path.join(require('os').tmpdir(), 'studysprint-test-files'); fs.mkdirSync(TMP, { recursive: true });
const LS = p => p.evaluate(() => JSON.parse(localStorage.getItem('studysprint:v3')));
const raw = p => p.evaluate(() => localStorage.getItem('studysprint:v3'));
const myData = async p => { await p.click('header button:has-text("My data")'); await p.waitForSelector('#v-data:not([hidden]) h2'); };
const stat = async (p, label) => (await p.locator(`#v-data .stat:has-text("${label}") b`).first().textContent());
async function loadFile(p, name, content) {
  const f = path.join(TMP, name); fs.writeFileSync(f, content);
  await p.setInputFiles('#d-file', f);
  await p.waitForSelector('#d-review > *');
  return T.text(p, '#d-review');
}
(async () => {
  const b = await T.chromium.launch();
  let p = await T.fresh(b);
  await T.openUnit(p, 'AP Physics 1', 'u1'); await T.tab(p, 'Practice');
  await p.click('#v-practice button:has-text("Start practice")');
  for (let i = 0; i < 3; i++) { await T.answer(p, i !== 1); await T.nextQ(p); }
  await T.tab(p, 'Learn first'); await p.click('#lf-conf-2');

  /* ---- export ---- */
  await myData(p);
  T.ok(await stat(p, 'questions answered') === '3' && await stat(p, 'units with progress') === '1', 'My data shows what is on this device');
  T.ok(/Practice/.test(await p.title()) === false && /My data/.test(await p.title()), 'My data page has its own title');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#v-data button:has-text("Download backup file")')]);
  T.ok(/^studysprint-progress-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), 'download has a dated file name: ' + dl.suggestedFilename());
  const file = path.join(TMP, 'backup.json'); await dl.saveAs(file);
  const exp = JSON.parse(fs.readFileSync(file, 'utf8'));
  T.ok(exp.app === 'StudySprint' && exp.format === 1 && Object.keys(exp.progress.q).length === 3 && exp.progress.u['ap-physics-1/u1'].conf.value === 2, 'backup file holds answers, levels and the confidence rating');
  T.ok(!('runs' in exp.progress) && !('ctx' in exp.progress), 'backup holds progress only (no unfinished-set internals)');
  await p.click('#v-data button:has-text("Show backup text")');
  T.ok(JSON.parse(await p.inputValue('#d-out')).progress.q !== undefined, 'backup text can be shown for copying');
  const exported = await raw(p);
  await p.context().close();

  /* ---- restore into another browser: preview, nothing changes until confirmed ---- */
  p = await T.fresh(b);
  await T.openUnit(p, 'AP Calculus AB', 'u1'); await T.tab(p, 'Practice');
  await p.click('#v-practice button:has-text("Start practice")'); await T.answer(p, true);
  await myData(p);
  const beforeRaw = await raw(p);
  const pv = await loadFile(p, 'b1.json', fs.readFileSync(file, 'utf8'));
  T.ok(/Check before restoring/.test(pv) && /3 answered questions/.test(pv) && /AP Physics 1: Algebra-Based: 1 unit/.test(pv), 'preview lists what the backup contains: ' + pv.slice(0, 160));
  T.ok(/After this merge, this device will have 4 answered questions/.test(pv), 'preview shows the result of a merge');
  T.ok(await raw(p) === beforeRaw, 'nothing is changed before the restore is confirmed');
  await p.check('#d-mode-replace');
  T.ok(/After this replacement, this device will have 3 answered questions/.test(await T.text(p, '#d-review')), 'preview updates for replace');
  await p.click('#d-review button:has-text("Cancel")');
  T.ok(await raw(p) === beforeRaw && (await p.textContent('#d-review')) === '', 'Cancel changes nothing');
  await loadFile(p, 'b1.json', fs.readFileSync(file, 'utf8'));
  await p.click('#d-review button:has-text("Restore this backup")');
  T.ok(/Backup restored/.test(await T.text(p, '#v-data')) && await stat(p, 'questions answered') === '4', 'merge restore applied: 4 questions');
  T.ok(await p.evaluate(() => document.activeElement.classList.contains('notice')), 'focus moves to the confirmation message');
  const merged = await LS(p);
  T.ok(merged.u['ap-physics-1/u1'].conf.value === 2 && Object.keys(merged.q).some(k => k.startsWith('cab-')), 'merge keeps this device\'s answers and adds the backup\'s');
  await T.openUnit(p, 'AP Physics 1', 'u1');
  T.ok(/3 of \d+/.test(await T.text(p, '#v-overview')), 'restored progress shows in the unit');
  /* undo */
  await myData(p);
  await p.click('#v-data button:has-text("Undo")');
  T.ok(await raw(p) === beforeRaw, 'Undo puts progress back exactly as it was before the restore');
  T.ok(/Undone/.test(await T.text(p, '#v-data')) && !(await p.isVisible('#v-data button:has-text("Undo:")')), 'undo confirmed; the undo copy is used up');
  /* replace */
  await loadFile(p, 'b1.json', fs.readFileSync(file, 'utf8'));
  await p.check('#d-mode-replace'); await p.click('#d-review button:has-text("Restore this backup")');
  const rep = await LS(p);
  T.ok(Object.keys(rep.q).length === 3 && !Object.keys(rep.q).some(k => k.startsWith('cab-')), 'replace uses only the backup');
  await p.click('#v-data button:has-text("Undo")');
  T.ok(await raw(p) === beforeRaw, 'replace can be undone too');
  /* paste path, raw v3 storage copy */
  await p.fill('#d-paste', exported);
  await p.click('#v-data button:has-text("Check pasted text")');
  T.ok(/3 answered questions/.test(await T.text(p, '#d-review')), 'pasted text (a raw saved-progress copy) is accepted and previewed');
  await p.click('#d-review button:has-text("Cancel")');

  /* ---- hostile and broken files ---- */
  const before2 = await raw(p);
  const bad = async (name, content, re, label) => {
    const t = await loadFile(p, name, content);
    T.ok(re.test(t) && /Nothing on this device was changed/.test(t) && await raw(p) === before2, label + ': ' + t.replace(/^This backup cannot be restored\. Nothing on this device was changed\./, '').slice(0, 110));
  };
  await bad('x.json', '{not json', /not valid JSON/, 'invalid JSON rejected');
  await bad('x2.json', JSON.stringify({ hello: 1 }), /does not look like a StudySprint backup/, 'unrelated JSON rejected');
  await bad('x3.json', JSON.stringify({ app: 'StudySprint', format: 9, progress: {} }), /newer or unknown version/, 'unknown format rejected');
  await bad('x4.json', JSON.stringify({ app: 'StudySprint', format: 1, progress: { q: [] } }), /not in the expected shape/, 'wrong shape rejected');
  await bad('x5.json', '{"app":"StudySprint","format":1,"progress":{"q":{"__proto__":{"f":1,"rt":[]},"<img src=x onerror=window.__pwned=1>":{"f":1,"rt":[]},"constructor":{"f":1,"rt":[]}},"u":{"../../evil":{"level":1}}}}', /None of the progress/, 'prototype keys, HTML in ids and path-like keys rejected');
  T.ok(await p.evaluate(() => !window.__pwned && !({}).f && !document.querySelector('#v-data img')), 'no script ran, no prototype pollution, no HTML inserted');
  await bad('x6.json', 'x'.repeat(2.1 * 1024 * 1024), /larger than 2 MB/, 'oversized file rejected before reading');
  await bad('x7.json', JSON.stringify({ app: 'StudySprint', format: 1, progress: { q: { a: { f: 5, rt: [] }, b: { f: 1, rt: ['x'] } } } }), /None of the progress/, 'out-of-range values rejected');
  // mixed: good + bad entries -> preview lists what is skipped; only clean values are restored
  const mixed = { app: 'StudySprint', format: 1, exportedAt: '2026-10-01T10:00:00Z', progress: {
    q: { 'ph1u2-q01': { f: 1, rt: [1, 0], t: 10, extra: '<b>x</b>' }, 'bad id!': { f: 1, rt: [] } },
    u: { 'ap-physics-1/u2': { level: 1, streak: 0, wrong: 0, pref: [0, 2], cycle: [], conf: { value: 4, t: 1 }, warmup: { correct: 2, total: 3, conf: 4, t: 2 }, junk: 1 },
         'ap-physics-1/u3': { level: 1, streak: 0, wrong: 0, pref: [0, 2], cycle: [], conf: { value: 9, t: 1 } } },
    sess: [{ id: 1, t: 2, unitKey: 'ap-physics-1/u2', unitTitle: 'U2', minutes: 30, stepsDone: 2, stepsTotal: 5, distinct: 5, first: 5, firstOk: 3, retries: 1, retryOk: 1, met: false }, { id: 2, t: 3, unitKey: 'ap-physics-1/u2', unitTitle: 'U2', minutes: 30, stepsDone: 2, distinct: 5, first: 5, firstOk: 9, retries: 0, retryOk: 0, met: false }] } };
  const mt = await loadFile(p, 'mixed.json', JSON.stringify(mixed));
  T.ok(/3 entries in the file could not be used/.test(mt) && /confidence rating is not valid/.test(mt) && /question id is not valid/.test(mt), 'preview says which entries are skipped: ' + mt.match(/\d+ entries[^.]*\./)?.[0]);
  await p.click('#d-review button:has-text("Restore this backup")');
  const m2 = await LS(p);
  T.ok(!m2.q['ph1u2-q01'].extra && !m2.u['ap-physics-1/u2'].junk && m2.u['ap-physics-1/u2'].warmup.correct === 2 && !m2.u['ap-physics-1/u3'] && m2.sess.some(s => s.id === 1 && s.stepsTotal === 5) && !m2.sess.some(s => s.id === 2), 'only validated fields are stored (unknown fields dropped)');
  await p.click('#v-data button:has-text("Undo")');

  /* ---- clear all, with confirmation and undo ---- */
  const before3 = await raw(p);
  await p.click('#v-data button:has-text("Clear all progress")');
  T.ok(await p.isVisible('#v-data button:has-text("Click again to clear all progress")') && await raw(p) === before3, 'clear all asks for a second click first');
  await p.click('#v-data button:has-text("Click again to clear all progress")');
  T.ok(await stat(p, 'questions answered') === '0', 'clear all empties progress');
  await p.click('#v-data button:has-text("Undo")');
  T.ok(await raw(p) === before3, 'clear all can be undone');
  /* unit reset gets an undo too */
  await T.openUnit(p, 'AP Calculus AB', 'u1'); await T.tab(p, 'Results');
  await p.click('#v-results button:has-text("Reset progress")'); await p.click('#v-results button:has-text("Click again")');
  await p.click('#v-results button:has-text("Undo reset")');
  const pick = o => JSON.stringify([o.q, o.u, o.sess]);
  T.ok(pick(await LS(p)) === pick(JSON.parse(before3)), 'unit reset can be undone');
  T.ok(/Reset undone|Results and review/.test(await T.text(p, '#v-results')) && /questions attempted/.test(await T.text(p, '#v-results')), 'results view shows the progress again');
  T.ok(p.errs.length === 0, 'no page errors (' + p.errs.join(' | ') + ')');
  await p.context().close();

  /* ---- storage blocked (private mode / disabled) ---- */
  p = await T.fresh(b, { init: () => { Storage.prototype.setItem = function () { throw new DOMException('blocked', 'SecurityError'); }; } });
  await p.waitForSelector('#c-resume .notice');
  T.ok(/not letting StudySprint save progress/.test(await T.text(p, '#c-resume')), 'home warns when storage is blocked');
  await T.openUnit(p, 'AP Physics 1', 'u1'); await T.tab(p, 'Practice');
  await p.click('#v-practice button:has-text("Start practice")');
  const r = await T.answer(p, true);
  T.ok(/Correct/.test(r.fb), 'practice still works with storage blocked');
  T.ok(!/refreshing the page will not lose it/.test(await T.text(p, '#v-practice')), 'does not promise a saved place when it cannot save');
  await myData(p);
  T.ok(/blocking storage/.test(await T.text(p, '#v-data')) && await stat(p, 'questions answered') === '1', 'My data warns and still offers a backup of this tab\'s answers');
  T.ok(p.errs.length === 0, 'no page errors with storage blocked (' + p.errs.join(' | ') + ')');

  console.log(T.summary()); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
