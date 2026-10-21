const T = require('./helpers');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8799', '--directory', T.ROOT], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const b = await T.chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  const reqs = [], errs = []; p.on('response', r => { if (r.url().includes('/data/')) reqs.push(r.status() + ' ' + r.url().split('/data/')[1].split('?')[0]); });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8799/index.html');
  await p.fill('#c-search', 'AP Calculus AB'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelectorAll('#c-unit option').length > 3);
  await p.selectOption('#c-unit', 'u6'); await p.click('#c-go'); await p.waitForSelector('#v-overview .cards');
  await p.click('#ctx-nav button:has-text("Review plan")'); await p.waitForSelector('#v-planner button:has-text("Build my study session")');
  T.ok(['catalog.json', 'planner.json', 'courses/ap-calculus-ab/course.json', 'courses/ap-calculus-ab/u6.json'].every(f => reqs.includes('200 ' + f)), 'served over HTTP: catalog, planner config, course and unit files all load (' + reqs.join(', ') + ')');
  T.ok(errs.length === 0, 'no page errors');
  console.log(T.summary()); await b.close(); srv.kill();
})();
