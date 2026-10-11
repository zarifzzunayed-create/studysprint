const T = require('./helpers');
(async () => {
  const b = await T.chromium.launch();
  const p = await T.fresh(b, { vp: { width: 390, height: 844 } });
  await T.openUnit(p, 'AP Calculus AB', 'u1');
  await T.tab(p, 'Learn first');
  // keyboard only: focus first radio, arrow to 2, tab to the warm-up button, Enter
  await p.focus('#lf-conf-1'); await p.keyboard.press('ArrowRight');
  T.ok(await p.isChecked('#lf-conf-2'), 'arrow keys move the confidence rating (radio group)');
  let guard = 0; while (guard++ < 10) { await p.keyboard.press('Tab'); if ((await p.evaluate(() => document.activeElement.textContent)) === 'Start the 3-question warm-up') break; }
  T.ok((await p.evaluate(() => document.activeElement.textContent)) === 'Start the 3-question warm-up', 'Tab reaches the warm-up button');
  await p.keyboard.press('Enter');
  T.ok(await p.isVisible('#v-learn form legend'), 'Enter starts the warm-up; focus moves to the question');
  const fw = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  T.ok(fw, 'no horizontal scrolling at phone width');
  await p.screenshot({ path: require('path').join(require('os').tmpdir(), 'studysprint-learn-mobile.png'), fullPage: true });
  console.log(T.summary()); await b.close();
})();
