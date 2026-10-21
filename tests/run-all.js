// Runs every StudySprint browser test suite in order and prints the combined count.
// Usage (from the project folder):  python3 tools/build.py && node tests/run-all.js
// Needs Node 18+, Python 3, and Playwright with Chromium (npm install -g playwright && npx playwright install chromium).
const { spawnSync } = require('child_process');
const path = require('path');
const SUITES = ['t1_catalog', 't2_learn', 't3_planner', 't4_kbd', 't5_stats', 't6_http', 't7_subpath', 't8_resume', 't9_backup', 't10_a11y', 't11_merge', 't12_tests'];
let pass = 0, fail = 0, broken = [];
for (const s of SUITES) {
  const r = spawnSync(process.execPath, [path.join(__dirname, s + '.js')], { encoding: 'utf8', timeout: 600000, env: process.env });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/\{ pass: (\d+), fail: (\d+) \}/);
  if (!m) { broken.push(s); console.log(s.padEnd(12), 'DID NOT FINISH'); console.log(out.split('\n').slice(-15).join('\n')); continue; }
  pass += +m[1]; fail += +m[2];
  console.log(s.padEnd(12), m[1].padStart(3), 'passed', m[2] === '0' ? '' : m[2] + ' FAILED');
  out.split('\n').filter((l) => l.startsWith('FAIL')).forEach((l) => console.log('   ', l));
}
console.log('\nTotal:', pass, 'passed,', fail, 'failed' + (broken.length ? ', suites that did not finish: ' + broken.join(', ') : ''));
process.exit(fail || broken.length ? 1 : 0);
