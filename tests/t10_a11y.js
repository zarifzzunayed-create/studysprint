// Phone layouts (no sideways page scroll), touch target size, names/labels, unique ids, keyboard and screen-reader feedback.
const T = require('./helpers');
const audit = p => p.evaluate(() => {
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('[hidden]'); };
  const W = document.documentElement.clientWidth;
  const over = [];
  document.querySelectorAll('body *').forEach(el => {
    if (!vis(el) || el.closest('.sr-only') || el.classList.contains('sr-only') || el.closest('.skip-link')) return;
    const r = el.getBoundingClientRect();
    if (r.right > W + 1 && !el.closest('.listbox')) over.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + el.className) + ' ' + Math.round(r.right));
  });
  const small = [];
  document.querySelectorAll('button, select, input:not([type=radio]):not([type=checkbox]), textarea, .choice, a.button').forEach(el => {
    if (!vis(el)) return; const r = el.getBoundingClientRect();
    if (r.height < 43.5) small.push((el.textContent || el.id || el.tagName).trim().slice(0, 30) + ' ' + Math.round(r.height) + 'px');
  });
  const unnamed = [];
  document.querySelectorAll('button, select, input, textarea, [role=combobox]').forEach(el => {
    if (!vis(el) && !(el.type === 'radio' || el.type === 'checkbox')) return;
    if (el.closest('[hidden]')) return;
    let name = el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent);
    if (!name && el.tagName === 'BUTTON') name = el.textContent;
    if (!name && el.id) name = document.querySelector(`label[for="${el.id}"]`)?.textContent;
    if (!name) name = el.closest('label')?.textContent;
    if (!name || !name.trim()) unnamed.push(el.outerHTML.slice(0, 80));
  });
  const ids = {}; document.querySelectorAll('[id]').forEach(e => ids[e.id] = (ids[e.id] || 0) + 1);
  const dup = Object.keys(ids).filter(k => ids[k] > 1);
  const h1 = [...document.querySelectorAll('h1')].filter(e => !e.hidden && !e.closest('[hidden]')).length;
  const describedBy = [...document.querySelectorAll('[aria-describedby]')].filter(e => !e.closest('[hidden]')).filter(e => e.getAttribute('aria-describedby').split(' ').some(id => !document.getElementById(id))).length;
  return { sw: document.documentElement.scrollWidth, W, over: over.slice(0, 5), small: small.slice(0, 6), unnamed: unnamed.slice(0, 4), dup, h1, describedBy };
});
(async () => {
  const b = await T.chromium.launch();
  const bad = { scroll: [], small: [], unnamed: [], dup: [], h1: [], desc: [] };
  for (const width of [320, 375, 390]) {
    const p = await T.fresh(b, { vp: { width, height: 740 } });
    const check = async (label) => {
      const a = await audit(p);
      if (a.sw > a.W) bad.scroll.push(width + ' ' + label + ': page is ' + a.sw + 'px wide; ' + a.over.join(', '));
      if (a.small.length) bad.small.push(width + ' ' + label + ': ' + a.small.join('; '));
      if (a.unnamed.length) bad.unnamed.push(label + ': ' + a.unnamed.join(' | '));
      if (a.dup.length) bad.dup.push(label + ': ' + a.dup.join(', '));
      if (a.h1 !== 1) bad.h1.push(label + ': ' + a.h1 + ' h1');
      if (a.describedBy) bad.desc.push(label);
    };
    await check('home');
    await p.fill('#c-search', 'ap'); await check('home with course list open');
    await T.openUnit(p, 'AP Physics 1', 'u1'); await check('overview');
    await T.tab(p, 'Learn first'); await check('learn first');
    await T.tab(p, 'Study guide'); await check('guide');
    await T.tab(p, 'Practice'); await check('practice setup');
    await p.click('#v-practice button:has-text("Start practice")'); await check('question');
    await T.answer(p, false); await check('feedback');
    await p.click('.fb:visible button:has-text("End and see results")'); await check('set results with concept table');
    await T.tab(p, 'Videos'); await check('videos');
    await T.tab(p, 'Official FRQs'); await check('FRQs');
    await T.tab(p, 'Study planner'); await check('planner setup');
    await p.click('#v-planner button:has-text("Build my study session")'); await check('planner step 1');
    await p.click('#v-planner button:has-text("Next step")'); await check('planner step 2');
    for (let i = 0; i < 4; i++) { if (!(await p.locator('#v-planner form legend:visible').count())) break; await T.answer(p, true); await p.locator('.fb:visible button.button-primary').first().click(); }
    for (let i = 0; i < 3; i++) await p.click('#v-planner button:has-text("Next step")');
    await check('planner results');
    await T.tab(p, 'Results'); await check('results with sessions table');
    await p.click('header button:has-text("My data")'); await check('my data');
    await p.click('#v-data button:has-text("Show backup text")'); await p.fill('#d-paste', await p.inputValue('#d-out'));
    await p.click('#v-data button:has-text("Check pasted text")'); await check('restore preview');
    await p.click('header button:has-text("About")'); await check('about');
    await T.openUnit(p, 'AP Calculus AB', 'u5'); await check('calculus overview');
    await T.openUnit(p, 'AP Statistics', 'u5'); await T.tab(p, 'Practice'); await p.click('#v-practice button:has-text("Start practice")'); await check('statistics question');
    if (p.errs.length) bad.scroll.push('page errors: ' + p.errs.join(' | '));
    await p.context().close();
  }
  T.ok(!bad.scroll.length, 'no sideways page scrolling at 320, 375 and 390 px across all views' + (bad.scroll.length ? ': ' + bad.scroll.slice(0, 4).join(' || ') : ''));
  T.ok(!bad.small.length, 'buttons, fields and answer choices are at least 44 px tall' + (bad.small.length ? ': ' + bad.small.slice(0, 4).join(' || ') : ''));
  T.ok(!bad.unnamed.length, 'every control has a label or name' + (bad.unnamed.length ? ': ' + bad.unnamed.slice(0, 3).join(' || ') : ''));
  T.ok(!bad.dup.length, 'no duplicate ids, even with planner and practice questions open together' + (bad.dup.length ? ': ' + bad.dup.slice(0, 3).join(' || ') : ''));
  T.ok(!bad.h1.length, 'exactly one level-1 heading on every view' + (bad.h1.length ? ': ' + bad.h1.slice(0, 3).join(' || ') : ''));
  T.ok(!bad.desc.length, 'every aria-describedby points to an existing element' + (bad.desc.length ? ': ' + bad.desc.join(', ') : ''));

  /* ---- keyboard only ---- */
  const p = await T.fresh(b);
  await p.focus('#c-search'); await p.keyboard.type('phys');
  await p.waitForFunction(() => document.getElementById('c-status').textContent.length > 0);
  T.ok(/courses found/.test(await p.textContent('#c-status')), 'screen readers hear how many courses match: ' + await p.textContent('#c-status'));
  await p.keyboard.press('ArrowDown');
  T.ok(await p.getAttribute('#c-search', 'aria-activedescendant') === 'opt1', 'arrow keys move through the course list');
  await p.keyboard.press('Escape');
  T.ok(await p.getAttribute('#c-search', 'aria-expanded') === 'false', 'Escape closes the list and updates aria-expanded');
  await p.fill('#c-search', 'AP Calculus AB'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelectorAll('#c-unit option').length > 3);
  await p.focus('#c-unit'); await p.selectOption('#c-unit', 'u1'); await p.keyboard.press('Tab'); await p.keyboard.press('Enter');
  await p.waitForSelector('#v-overview:not([hidden]) h2');
  T.ok(await p.evaluate(() => document.activeElement.tagName === 'H2' && document.activeElement.closest('#v-overview')), 'opening a unit moves focus to its heading');
  await T.tab(p, 'Practice'); await p.click('#v-practice button:has-text("Start practice")');
  T.ok(await p.evaluate(() => document.activeElement.tagName === 'LEGEND'), 'a new question moves focus to the question text');
  await p.locator('#v-practice button[type=submit]').focus(); await p.keyboard.press('Enter');
  const inval = await p.evaluate(() => { const fs = document.querySelector('#v-practice fieldset'); const err = document.getElementById(fs.getAttribute('aria-describedby')); return { inv: fs.getAttribute('aria-invalid'), err: err && err.textContent, role: err && err.getAttribute('role'), focus: document.activeElement.type }; });
  T.ok(inval.inv === 'true' && /Choose an answer/.test(inval.err) && inval.role === 'alert' && inval.focus === 'radio', 'submitting with no answer: error is announced, linked to the question, and focus goes to the choices');
  await p.keyboard.press('ArrowDown');
  await p.locator('#v-practice button[type=submit]').focus(); await p.keyboard.press('Enter');
  const fb = await p.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent, hid: document.activeElement.firstChild.getAttribute('aria-hidden'), inv: document.querySelector('#v-practice fieldset').getAttribute('aria-invalid') }));
  T.ok(fb.tag === 'H3' && /^(✓ Correct|✗ Not quite)$/.test(fb.text) && fb.hid === 'true' && fb.inv === null, 'after submitting, focus moves to the result ("Correct" or "Not quite"; the symbol is hidden from screen readers)');
  await p.keyboard.press('Tab');
  T.ok(await p.evaluate(() => document.activeElement.closest('.fb') !== null || document.activeElement.tagName === 'A'), 'Tab continues into the explanation and its buttons');
  // numeric validation: run a numeric question directly (AP Physics 1 unit 1 has numeric questions)
  await T.openUnit(p, 'AP Physics 1', 'u1'); await T.tab(p, 'Practice');
  const num = await p.evaluate(() => {
    const u = SS.ST.unit, q = u.questions.find(x => x.type === 'numeric'); if (!q) return null;
    const host = document.createElement('div'); document.getElementById('v-practice').append(host);
    SS.runner(host, u, { queue: [q] }).start();
    host.querySelector('button[type=submit]').click();
    const inp = host.querySelector('.q-num'), err = document.getElementById(inp.getAttribute('aria-describedby'));
    return { inv: inp.getAttribute('aria-invalid'), err: err.textContent, focus: document.activeElement === inp, label: host.querySelector(`label[for="${inp.id}"]`) !== null };
  });
  T.ok(num && num.inv === 'true' && /Enter a number/.test(num.err) && num.focus && num.label, 'numeric answer: labelled field; an empty answer is flagged, described, and focused');
  // the course/unit tabs announce the current page
  T.ok(await p.getAttribute('#ctx-nav button:has-text("Practice")', 'aria-current') === 'page', 'current unit tab is marked aria-current');
  T.ok(p.errs.length === 0, 'no page errors (' + p.errs.join(' | ') + ')');
  console.log(T.summary()); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
