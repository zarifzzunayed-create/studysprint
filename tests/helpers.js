process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
// Uses a local "playwright" package if installed, otherwise the global one (npm install -g playwright).
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { const g = require('child_process').execSync('npm root -g').toString().trim(); ({ chromium } = require(g + '/playwright')); }
const fs = require('fs'), path = require('path'), url = require('url');
// Project folder under test: the folder above tests/, or STUDYSPRINT_ROOT.
const ROOT = process.env.STUDYSPRINT_ROOT ? path.resolve(process.env.STUDYSPRINT_ROOT) : path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'courses') + path.sep;
const QBY = {};
for (const [c, n] of [['ap-physics-1', 8], ['ap-calculus-ab', 8], ['ap-statistics', 5]]) for (let i = 1; i <= n; i++) {
  const d = JSON.parse(fs.readFileSync(`${DATA}${c}/u${i}.json`)); d.questions.forEach(q => QBY[q.prompt] = q);
}
const U = url.pathToFileURL(path.join(ROOT, 'dist', 'studysprint.html')).href;
let pass = 0, fail = 0;
const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); c ? pass++ : fail++; };
async function fresh(b, opts = {}) {
  const ctx = await b.newContext({ viewport: opts.vp || { width: 1000, height: 900 } });
  if (opts.init) await ctx.addInitScript(opts.init);
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  await p.goto(U); return p;
}
async function openUnit(p, course, uid) {
  if (await p.isVisible('#ctx-change')) await p.click('#ctx-change');
  else if (!(await p.isVisible('#v-home'))) await p.click('header button:has-text("Courses")');
  await p.fill('#c-search', course); await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelectorAll('#c-unit option').length > 3);
  await p.selectOption('#c-unit', uid); await p.click('#c-go'); await p.waitForSelector('#v-overview:not([hidden]) h2');
}
const cur = async p => QBY[await p.locator('form legend:visible').first().textContent()];
async function answer(p, correct) {
  const q = await cur(p); if (!q) throw new Error('unknown question');
  if (q.type === 'multiple-choice') await p.locator(`form input.ans[value="${correct ? q.correctAnswer : (q.correctAnswer + 1) % 4}"]:visible`).check();
  else await p.locator('.q-num:visible').fill(String(correct ? q.correctAnswer : q.correctAnswer * 3));
  await p.locator('form button[type=submit]:visible').click();
  return { q, fb: await p.locator('.fb:visible').first().textContent() };
}
const nextQ = p => p.locator('.fb:visible button.button-primary').first().click();
const tab = (p, name) => p.click(`#ctx-nav button:has-text("${name}")`);
const text = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ');
module.exports = { ROOT, chromium, QBY, U, ok, fresh, openUnit, cur, answer, nextQ, tab, text, summary: () => ({ pass, fail }) };
