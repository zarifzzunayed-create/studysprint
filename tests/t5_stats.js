const T = require('./helpers');
(async () => {
  const b = await T.chromium.launch(); const p = await T.fresh(b);
  await p.fill('#c-search', 'stats');
  T.ok((await p.$$eval('#c-list .opt', e => e.map(x => x.textContent))).some(o => o.startsWith('AP Statistics') && o.includes('5 of 5 units practice-ready')), 'Statistics: 5 of 5 units practice-ready in search');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelectorAll('#c-unit option').length > 3);
  const units = await p.$$eval('#c-unit option', e => e.map(x => x.textContent).slice(1));
  T.ok(units.length === 5 && units[4].startsWith('Unit 5: Regression Analysis'), 'Statistics lists the 5 units of the 2026-27 course');
  for (const uid of ['u3', 'u5']) {
    await T.openUnit(p, 'AP Statistics', uid);
    T.ok(/8 scored questions/.test(await T.text(p, '#v-overview')), `Statistics ${uid}: 8 questions`);
    await T.tab(p, 'Practice'); await p.selectOption('#p-size', '8'); await p.click('#v-practice button:has-text("Start practice")');
    const seen = new Set(); let g = 0;
    while (await p.isVisible('#v-practice form legend') && g++ < 12) { const r = await T.answer(p, true); seen.add(r.q.id); await T.nextQ(p); }
    T.ok(seen.size === 8 && [...seen].every(id => id.startsWith('stat-' + uid)), `Statistics ${uid}: a full set served all 8 different questions from this unit`);
    await T.tab(p, 'Official FRQs');
    const f = await T.text(p, '#v-frqs');
    T.ok(/written for the earlier nine-unit course/.test(f) && /2026 AP Statistics Free-Response Questions/.test(f), `Statistics ${uid}: FRQ page warns older questions follow the earlier course`);
  }
  await T.openUnit(p, 'AP Statistics', 'u4'); await T.tab(p, 'Learn first');
  const lt = await T.text(p, '#v-learn');
  T.ok(/Unit-specific practice exercise/.test(lt) && /Unit-specific textbook section/.test(lt) && /General textbook/.test(lt), 'Statistics Unit 4 Learn first: practice exercise and textbook section labelled unit-specific, book labelled general');
  await T.tab(p, 'Study planner'); await p.click('#v-planner button:has-text("Build my study session")');
  T.ok((await p.$$('#v-planner .pl-steps li')).length === 5 && /AP Statistics · Unit 4/.test(await T.text(p, '#v-planner')), 'planner works for a Statistics unit with 5 steps');
  T.ok(p.errs.length === 0, 'no console errors ' + JSON.stringify(p.errs));
  console.log(T.summary()); await b.close();
})();
