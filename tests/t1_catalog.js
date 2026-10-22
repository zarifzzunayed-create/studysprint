const T = require('./helpers');
const fs = require('fs'), path = require('path');
// Badges are checked against the built catalog, so adding content never needs these checks rewritten.
const CAT = JSON.parse(fs.readFileSync(path.join(T.ROOT, 'data', 'catalog.json')));
const badge = c => (c.summary && c.summary.ready > 0 ? c.summary.ready + ' of ' + c.summary.units + ' units practice-ready' : c.outline ? 'Course outline available' : 'Catalog only');
const outlineOnly = CAT.priorityOrder.map(id => CAT.courses.find(c => c.id === id)).find(c => c && c.outline && c.summary.ready === 0);
(async () => {
  const b = await T.chromium.launch(); const p = await T.fresh(b);
  await p.fill('#c-search', 'calc');
  const opts = await p.$$eval('#c-list .opt', e => e.map(x => x.textContent));
  T.ok(opts.some(o => o.startsWith('AP Calculus AB') && o.includes('8 of 8 units practice-ready')), 'search "calc": Calculus AB shows 8 of 8 units practice-ready');
  const shown = CAT.courses.filter(c => opts.some(o => o.startsWith(c.name)));
  T.ok(shown.length >= 3 && shown.every(c => opts.find(o => o.startsWith(c.name)).includes(badge(c))) && opts.some(o => o.startsWith('AP Calculus BC') && o.includes('Course outline available')), 'search "calc": every badge matches the built content status, and Calculus BC (scope not verified) stays outline-only');
  await p.fill('#c-search', 'stats');
  T.ok((await p.$$eval('#c-list .opt', e => e.map(x => x.textContent))).some(o => o.startsWith('AP Statistics')), 'Statistics is still in the catalog');
  await p.fill('#c-search', 'physics');
  const ph = await p.$$eval('#c-list .opt', e => e.map(x => x.textContent));
  T.ok(ph.length === 4 && ph[0].startsWith('AP Physics 1') && ph[0].includes('8 of 8'), 'Physics 1 unchanged: 8 of 8, listed first among 4 Physics courses');
  await p.fill('#c-search', 'Underwater basket weaving');
  T.ok(await p.$eval('#c-msg', e => !e.hidden && e.textContent.includes('is not available yet')), 'unknown subject: "not available yet"');
  await p.fill('#c-search', 'AP Calculus AB'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelectorAll('#c-unit option').length > 3);
  const units = await p.$$eval('#c-unit option', e => e.map(x => x.textContent).slice(1));
  T.ok(units.length === 8 && units.every(u => u.endsWith('— Practice-ready · 1 practice test')) && units[0].startsWith('Unit 1: Limits and Continuity'), 'Calculus AB: all 8 official units listed as practice-ready, each with the 1 practice test its bank supports');
  await p.fill('#c-search', outlineOnly.name); await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelectorAll('#c-unit option').length > 3);
  const pre = await p.$$eval('#c-unit option', e => e.map(x => x.textContent).slice(1));
  T.ok(pre.every(u => u.endsWith('Course outline available; practice questions in progress')) && (await p.$eval('#c-unit', e => e.value)) === '', 'changing course swaps the unit list (' + outlineOnly.name + ', outline only) and clears the unit');
  // Calculus AB unit views
  for (const uid of ['u1', 'u3', 'u8']) {
    await T.openUnit(p, 'AP Calculus AB', uid);
    const ov = await T.text(p, '#v-overview');
    T.ok(/Practice-ready/.test(ov) && /8 scored questions/.test(ov) && /Learn first \(optional\)/.test(ov), `Calc AB ${uid}: overview shows practice-ready, 8 questions, Learn first card`);
    await T.tab(p, 'Study guide');
    const g = await T.text(p, '#v-guide');
    T.ok(/review guide/.test(g) && /Worked example/.test(g) && /Common misconceptions/.test(g) && (await p.$$('#v-guide .guide-sec')).length === 3, `Calc AB ${uid}: concise guide with 3 sections, example, common mistakes`);
    await T.tab(p, 'Videos');
    const v = await T.text(p, '#v-videos');
    if (uid === 'u1') T.ok(/No verified video links for this unit yet/.test(v), 'Calc AB u1: honest "no verified video" message');
    else T.ok(/Unit-specific video/.test(v) && (await p.$$eval('#v-videos a', a => a.map(x => x.href))).some(h => h.startsWith('https://www.khanacademy.org/math/ap-calculus-ab/')), `Calc AB ${uid}: Khan Academy AB video labelled unit-specific`);
    await T.tab(p, 'Official FRQs');
    const f = await T.text(p, '#v-frqs');
    const hrefs = await p.$$eval('#v-frqs a', a => a.map(x => x.href));
    T.ok(/2026 AP Calculus AB Free-Response Questions/.test(f) && /not matched to units/.test(f) && /has not matched individual released free-response questions/.test(f) && hrefs.every(h => h.startsWith('https://apcentral.collegeboard.org/')), `Calc AB ${uid}: FRQs are College Board links only, whole sets labelled not matched to units`);
  }
  // Physics 1 still intact
  await T.openUnit(p, 'physics 1', 'u1');
  T.ok(/14 scored questions/.test(await T.text(p, '#v-overview')), 'Physics 1 Unit 1 still has its 14 questions');
  await T.tab(p, 'Videos');
  const pv = await T.text(p, '#v-videos');
  T.ok(/General collection page/.test(pv) && /Unit-specific video/.test(pv), 'Physics 1 video links now say general collection page vs unit-specific video');
  // Every practice-ready unit in the built site loads with a guide, a 3-level bank of 8+ questions, and a test of real questions.
  const readyUnits = await p.evaluate(async () => {
    const cat = await SS.data.catalog(), out = [];
    for (const c of cat.courses.filter(x => x.outline)) {
      const cd = await SS.data.course(c.id);
      for (const u of cd.units.filter(x => x.status === 'practice-ready')) {
        const d = await SS.data.unit(c.id, u.id), ids = new Set(d.questions.map(q => q.id)), t = (d.tests || [])[0];
        out.push({ key: c.id + '/' + u.id, ok: d.guide.sections.length >= 3 && d.questions.length >= 8 && ['introductory', 'standard', 'challenging'].every(l => d.questions.some(q => q.difficulty === l)) &&
          d.questions.filter(q => q.difficulty === 'introductory').length >= 3 && !!t && t.questionIds.length >= 8 && t.questionIds.every(id => ids.has(id)) });
      }
    }
    return out;
  });
  T.ok(readyUnits.length >= 32 && readyUnits.every(u => u.ok), readyUnits.length + ' practice-ready units load with a guide, a 3-level question bank and a valid practice test' + (readyUnits.every(u => u.ok) ? '' : ': ' + readyUnits.filter(u => !u.ok).map(u => u.key).join(', ')));
  await T.openUnit(p, 'AP Physics 2', 'u15');
  await p.click('#v-overview button:has-text("Start untimed")');
  await p.waitForSelector('#v-test form legend');
  T.ok(/Question 1 of 8/.test(await T.text(p, '.test-status')) && /AP Physics 2: Algebra-Based · Unit 15: Modern Physics/.test(await T.text(p, '#v-test')), 'a new Physics 2 unit test opens with 8 questions');
  await p.click('#v-test button:has-text("Save and exit")');
  // Framework coverage vs exam coverage: Precalculus Unit 4 is in the framework but not assessed on the AP Exam.
  await p.click('#ctx-change');
  await p.fill('#c-search', 'AP Precalculus'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelectorAll('#c-unit option').length > 3);
  const pcu = await p.$$eval('#c-unit option', e => e.map(x => x.textContent).slice(1));
  T.ok(pcu.length === 4 && pcu[3].endsWith('· not on the AP Exam') && pcu.slice(0, 3).every(u => !/AP Exam/.test(u)), 'Precalculus unit list marks only Unit 4 as not on the AP Exam');
  await T.openUnit(p, 'AP Precalculus', 'u4');
  const u4 = await T.text(p, '#v-overview');
  T.ok(/not assessed on the AP Exam/.test(u4) && /practices course content, not exam content/.test(u4), 'Precalculus Unit 4 page says its practice covers the course, not the exam');
  await T.openUnit(p, 'AP Precalculus', 'u2');
  T.ok(!/not assessed on the AP Exam/.test(await T.text(p, '#v-overview')), 'an exam-assessed unit carries no such label');
  T.ok(p.errs.length === 0, 'no console errors ' + JSON.stringify(p.errs));
  console.log(T.summary()); await b.close();
})();
