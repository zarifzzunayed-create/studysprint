const T = require('./helpers');
(async () => {
  const b = await T.chromium.launch(); const p = await T.fresh(b);
  await p.fill('#c-search', 'calc');
  const opts = await p.$$eval('#c-list .opt', e => e.map(x => x.textContent));
  T.ok(opts.some(o => o.startsWith('AP Calculus AB') && o.includes('8 of 8 units practice-ready')), 'search "calc": Calculus AB shows 8 of 8 units practice-ready');
  T.ok(opts.some(o => o.startsWith('AP Calculus BC') && o.includes('Course outline available')) && opts.some(o => o.startsWith('AP Precalculus') && o.includes('Course outline available')), 'Calculus BC and Precalculus stay outline-only');
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
  T.ok(units.length === 8 && units.every(u => u.endsWith('— Practice-ready')) && units[0].startsWith('Unit 1: Limits and Continuity'), 'Calculus AB: all 8 official units listed as practice-ready');
  await p.fill('#c-search', 'AP Precalculus'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelectorAll('#c-unit option').length > 3);
  const pre = await p.$$eval('#c-unit option', e => e.map(x => x.textContent).slice(1));
  T.ok(pre.every(u => u.endsWith('Course outline available; practice questions in progress')) && (await p.$eval('#c-unit', e => e.value)) === '', 'changing course swaps the unit list (Precalculus outline-only) and clears the unit');
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
  T.ok(p.errs.length === 0, 'no console errors ' + JSON.stringify(p.errs));
  console.log(T.summary()); await b.close();
})();
