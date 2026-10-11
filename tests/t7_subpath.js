// GitHub Pages project subpath + load failures with retry.
const T = require('./helpers');
const S = require('./subserver');
const BASE = 'http://localhost:8791' + S.PRE;
(async () => {
  const { srv, log } = await S.start(8791);
  const fail = (file, n, code) => fetch(`http://localhost:8791/__fail?file=${encodeURIComponent(file)}&n=${n}&code=${code || 503}`);
  const b = await T.chromium.launch();
  async function page() {
    const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }); const p = await ctx.newPage();
    p.errs = []; p.bad = [];
    p.on('pageerror', e => p.errs.push(e.message));
    p.on('response', r => { if (r.status() >= 400 && !r.url().includes('__fail')) p.bad.push(r.status() + ' ' + r.url()); });
    return p;
  }

  // 1. Full session from the subpath, without trailing slash (redirect) and with it.
  let p = await page();
  await p.goto(BASE.slice(0, -1));
  T.ok(p.url() === BASE, 'project URL without trailing slash redirects to the subpath root (' + p.url() + ')');
  await p.waitForSelector('#c-search:not([disabled])');
  const bg = await p.evaluate(() => getComputedStyle(document.querySelector('.panel')).borderRadius);
  T.ok(bg !== '0px', 'stylesheet loaded from the subpath');
  await T.openUnit(p, 'AP Calculus AB', 'u6');
  await T.tab(p, 'Practice'); await p.click('#v-practice button:has-text("Start practice")');
  await T.answer(p, true); await T.nextQ(p); await T.answer(p, false);
  await T.tab(p, 'Study planner'); await p.waitForSelector('#v-planner button:has-text("Build my study session")');
  await T.tab(p, 'Learn first'); await p.waitForSelector('#v-learn h2');
  const outside = log.filter(x => !x.startsWith(S.PRE) && x !== S.PRE.slice(0, -1) && !x.startsWith('/__fail'));
  T.ok(outside.length === 0, 'every request stays inside the project subpath (' + (outside.join(', ') || 'none outside') + ')');
  T.ok(p.bad.length === 0, 'no failed requests (' + p.bad.join(', ') + ')');
  T.ok(log.filter(x => x.includes('/data/')).every(x => /\?v=[0-9a-f]{10}$/.test(x)), 'data requests carry the build stamp');
  T.ok(log.filter(x => /\.(js|css)/.test(x)).every(x => /\?v=[0-9a-f]{10}$/.test(x)), 'script and style requests carry the build stamp');
  T.ok(p.errs.length === 0, 'no page errors on the subpath (' + p.errs.join(' | ') + ')');

  // 2. Refresh mid-question on the hosted site: same question comes back.
  await T.tab(p, 'Practice'); await T.nextQ(p);
  const before = await p.locator('form legend:visible').first().textContent();
  await p.reload(); await p.waitForSelector('#v-practice:not([hidden]) form legend');
  const after = await p.locator('form legend:visible').first().textContent();
  T.ok(before === after, 'hosted: refresh during a question shows the same question');
  await p.context().close();

  // 3. Catalog fails (both the request and its automatic retry) -> clear error with Try again; retry works.
  p = await page();
  await fail('data/catalog.json', 2);
  await p.goto(BASE);
  await p.waitForSelector('#load-error:not([hidden])');
  const errText = await T.text(p, '#load-error');
  T.ok(/course list could not be loaded/.test(errText) && /Try again/.test(errText), 'catalog failure shows an error with Try again: ' + errText.slice(0, 120));
  T.ok(await p.evaluate(() => document.activeElement.textContent === 'Try again'), 'focus moves to Try again');
  T.ok(await p.isDisabled('#c-search'), 'course search is disabled while there is no catalog (not a broken form)');
  await p.click('#load-error button');
  await p.waitForSelector('#c-search:not([disabled])');
  T.ok(await p.isHidden('#load-error'), 'error clears after a successful retry');
  await T.openUnit(p, 'AP Physics 1', 'u2');
  T.ok(await p.isVisible('#v-overview .cards'), 'site works normally after the retry');
  await p.context().close();

  // 4. One transient failure is retried automatically and never shown.
  p = await page();
  await fail('data/catalog.json', 1);
  await p.goto(BASE); await p.waitForSelector('#c-search:not([disabled])');
  T.ok(await p.isHidden('#load-error'), 'a single failed request is retried automatically with no error shown');

  // 5. Course file fails -> error + retry, unit list then loads.
  await fail('ap-statistics/course.json', 2, 500);
  await p.fill('#c-search', 'AP Statistics'); await p.keyboard.press('Enter');
  await p.waitForSelector('#load-error:not([hidden])');
  T.ok(/unit list for AP Statistics could not be loaded/.test(await T.text(p, '#load-error')), 'course failure: clear error');
  T.ok((await p.textContent('#c-unit')).includes('could not be loaded'), 'unit menu says the units could not be loaded');
  await p.click('#load-error button');
  await p.waitForFunction(() => document.querySelectorAll('#c-unit option').length > 3);
  T.ok(await p.isHidden('#load-error'), 'course retry succeeds');

  // 6. Unit file fails -> error + retry; never a fake "outline only" page.
  await fail('ap-statistics/u3.json', 2);
  await p.selectOption('#c-unit', 'u3'); await p.click('#c-go');
  await p.waitForSelector('#load-error:not([hidden])');
  const ue = await T.text(p, '#load-error');
  T.ok(/study content for AP Statistics · Unit 3/.test(ue) && /progress is safe/.test(ue), 'unit failure: clear error naming the unit: ' + ue.slice(0, 110));
  T.ok(await p.isHidden('#v-overview'), 'no overview (and no false "no content" message) is shown for a unit that failed to load');
  await p.click('#load-error button');
  await p.waitForSelector('#v-overview:not([hidden]) .cards');
  T.ok(await p.isHidden('#load-error'), 'unit retry opens the unit with its content');

  // 7. Planner config fails -> retry inside the planner view.
  await fail('data/planner.json', 2);
  await T.tab(p, 'Study planner');
  await p.waitForSelector('#v-planner button:has-text("Try again")');
  T.ok(/planner settings could not be loaded/.test(await T.text(p, '#v-planner')), 'planner config failure: clear error');
  await p.click('#v-planner button:has-text("Try again")');
  await p.waitForSelector('#v-planner button:has-text("Build my study session")');
  T.ok(true, 'planner retry works');
  T.ok(p.errs.length === 0, 'no script errors during failures (' + p.errs.join(' | ') + ')');
  await p.context().close();

  // 8. Server returns HTML instead of JSON (misconfigured hosting) -> same error path, not a crash.
  p = await page();
  await fail('data/catalog.json', 2, 200);
  await p.goto(BASE); await p.waitForSelector('#load-error:not([hidden])');
  T.ok(/not valid JSON/.test(await T.text(p, '#load-error')), 'non-JSON response gives a clear error with technical detail');
  T.ok(p.errs.length === 0, 'no uncaught errors for a bad response');

  console.log(T.summary()); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
