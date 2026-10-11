const T = require('./helpers');
async function rate(p, n) { await p.check(`#lf-conf-${n}`); }
async function warmup(p, pattern) { // pattern: array of booleans for 3 answers
  await p.click('#v-learn button:has-text("Start the 3-question warm-up")');
  const qs = [];
  for (let i = 0; i < 3; i++) { const r = await T.answer(p, pattern[i]); qs.push(r.q); await T.nextQ(p); }
  return qs;
}
(async () => {
  const b = await T.chromium.launch();
  /* 1. confidence 2 and 1 of 3 correct -> recommend */
  let p = await T.fresh(b); await T.openUnit(p, 'AP Calculus AB', 'u2');
  await T.tab(p, 'Learn first');
  await p.click('#v-learn button:has-text("Start the 3-question warm-up")');
  T.ok(/Choose a confidence rating first/.test(await T.text(p, '#v-learn')), 'warm-up asks for a confidence rating first');
  await rate(p, 2);
  T.ok(/never counted as evidence/.test(await T.text(p, '#v-learn')), 'rating is saved and labelled self-reported, not evidence');
  const wq = await warmup(p, [true, false, false]);
  T.ok(wq.every(q => q.difficulty === 'introductory') && new Set(wq.map(q => q.id)).size === 3, 'warm-up uses 3 different introductory questions: ' + wq.map(q => q.id).join(','));
  let t = await T.text(p, '#v-learn');
  T.ok(/You rated your confidence 2 and answered 1 of 3 warm-up questions correctly\. We recommend/.test(t), 'confidence 2 + 1 of 3 correct -> resources recommended');
  const links = await p.$$eval('#learn-resources a', a => a.map(x => x.href));
  T.ok(links.includes('https://www.khanacademy.org/math/ap-calculus-ab/ab-differentiation-1-new') && links.includes('https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative'), 'resource panel lists the verified unit links (Khan unit page, OpenStax section)');
  const chips = await p.$$eval('#learn-resources .chip', c => c.map(x => x.textContent));
  T.ok(chips.includes('Unit-specific lesson page') && chips.includes('Unit-specific textbook section') && chips.includes('General textbook') && chips.includes('General course overview'), 'each link is labelled unit-specific or general: ' + [...new Set(chips)].join(' | '));
  // warm-up answers are ordinary first attempts
  const st = await p.evaluate(() => { const r = SS.store.P.q; return Object.keys(r).filter(k => k.startsWith('cab-u2')).map(k => r[k].f); });
  T.ok(st.length === 3 && st.filter(x => x === 1).length === 1, 'warm-up answers were recorded as 3 first attempts (1 correct)');
  // easier practice
  const prefBefore = await p.evaluate(() => JSON.stringify(SS.store.unit('ap-calculus-ab/u2').pref));
  await p.click('#v-learn button:has-text("Try easier practice in this unit")');
  await p.waitForSelector('#v-practice form legend');
  const lvls = [];
  for (let i = 0; i < 5; i++) {
    const why = await T.text(p, '#v-practice .panel');
    if (i === 0) T.ok(/This easier set uses Introductory to Standard questions; your saved range is unchanged/.test(why) && /Adaptive level: Introductory/.test(why), 'easier practice: introductory–standard only, level reset to introductory, saved range unchanged');
    const r = await T.answer(p, true); lvls.push(r.q.difficulty); await T.nextQ(p);
  }
  T.ok(lvls.every(l => l !== 'challenging'), 'easier practice never served a challenging question: ' + lvls.join(','));
  T.ok(prefBefore === await p.evaluate(() => JSON.stringify(SS.store.unit('ap-calculus-ab/u2').pref)), 'saved difficulty range unchanged after easier practice');
  T.ok(/Calculus AB · Unit 2/.test(await p.textContent('#ctx-title')), 'easier practice stayed in the same course and unit');
  await p.close();

  /* 2. confidence 4 and all correct -> no recommendation; confidence 4, two wrong in a row -> offered */
  p = await T.fresh(b); await T.openUnit(p, 'AP Calculus AB', 'u5'); await T.tab(p, 'Learn first');
  await rate(p, 4); await warmup(p, [true, true, false]);
  t = await T.text(p, '#v-learn');
  T.ok(/Warm-up done: 2 of 3 correct/.test(t) && !/We recommend/.test(t), 'confidence 4 + 2 of 3 correct -> neutral message, no recommendation');
  await p.close();
  p = await T.fresh(b); await T.openUnit(p, 'AP Calculus AB', 'u6'); await T.tab(p, 'Learn first');
  await rate(p, 5); await warmup(p, [false, false, true]);
  t = await T.text(p, '#v-learn');
  T.ok(/You missed two first attempts in a row in the warm-up/.test(t), 'confidence 5 but two wrong first attempts in a row -> resources offered anyway');
  await p.close();
  p = await T.fresh(b); await T.openUnit(p, 'AP Calculus AB', 'u7'); await T.tab(p, 'Learn first');
  await rate(p, 1); await warmup(p, [true, true, false]);
  T.ok(!/We recommend/.test(await T.text(p, '#v-learn')), 'confidence 1 but 2 of 3 correct -> rule not triggered (needs ≤ 1 correct)');
  await p.close();

  /* 3. two wrong first attempts in regular practice -> offer, open, return to the same question */
  p = await T.fresh(b); await T.openUnit(p, 'AP Calculus AB', 'u4'); await T.tab(p, 'Practice');
  await p.click('#v-practice button:has-text("Start practice")');
  let r = await T.answer(p, false);
  T.ok(!/Open learning resources/.test(r.fb), 'one wrong first attempt: no resource offer yet');
  await T.nextQ(p); r = await T.answer(p, false);
  T.ok(/Two first attempts in a row were missed/.test(r.fb), 'two wrong first attempts in a row: resource offer appears in the feedback');
  const before = await p.textContent('#v-practice .fb h3');
  await p.click('#v-practice button:has-text("Open learning resources")');
  t = await T.text(p, '#v-learn');
  T.ok(/You missed two first attempts in a row, so here are learning resources/.test(t) && /Made for this unit/.test(t), 'learn view opens with the struggle message and this unit\'s resources');
  await p.click('#v-learn button:has-text("Return to your practice set")');
  T.ok(await p.isVisible('#v-practice .fb') && (await p.textContent('#v-practice .fb h3')) === before, 'return goes back to the same practice set, at the same feedback');
  await T.nextQ(p); await T.answer(p, true); await T.nextQ(p); r = await T.answer(p, false);
  T.ok(!/Open learning resources/.test(r.fb), 'a correct answer resets the count (wrong, right, wrong = no offer)');
  // Physics 1 struggle uses the unit's existing links, labelled
  await T.openUnit(p, 'physics 1', 'u5'); await T.tab(p, 'Learn first');
  t = await T.text(p, '#v-learn');
  T.ok(/No verified unit-specific outside resources yet/.test(t) && /AP Physics 1 course overview/.test(t), 'Physics 1 Unit 5: honest "no unit-specific resource" plus the general course overview');
  T.ok(p.errs.length === 0, 'no console errors ' + JSON.stringify(p.errs));
  console.log(T.summary()); await b.close();
})();
