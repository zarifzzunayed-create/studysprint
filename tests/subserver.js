// Serves the project under a GitHub Pages-style project subpath (/studysprint-site/) and 404s everything else.
// /__fail?file=<suffix>&n=<count>&code=<status> makes the next <count> requests for that file fail.
const http = require('http'), fs = require('fs'), path = require('path');
const { ROOT } = require('./helpers');
const PRE = '/studysprint-site/';
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const fails = {}; const log = [];
function start(port) {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/__fail') { fails[u.searchParams.get('file')] = { n: +u.searchParams.get('n'), code: +(u.searchParams.get('code') || 503) }; res.end('ok'); return; }
    log.push(u.pathname + u.search);
    if (u.pathname === '/studysprint-site') { res.writeHead(301, { Location: PRE }); res.end(); return; }
    if (!u.pathname.startsWith(PRE)) { res.writeHead(404); res.end('outside project subpath'); return; }
    let rel = decodeURIComponent(u.pathname.slice(PRE.length)) || 'index.html';
    for (const k in fails) if (rel.endsWith(k) && fails[k].n > 0) { fails[k].n--; res.writeHead(fails[k].code); res.end('injected failure'); return; }
    const f = path.join(ROOT, rel);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(port, () => r({ srv, log, fails })));
}
module.exports = { start, PRE };
