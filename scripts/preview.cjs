const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const allowed = new Set(['/preview/index.html', '/preview/demo.js', '/extension/core.js', '/extension/content.js']);
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = pathname === '/' ? '/preview/index.html' : pathname;
  if (!allowed.has(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8');
  fs.createReadStream(path.join(root, file)).pipe(res);
}).listen(4173, '127.0.0.1', () => console.log('Preview: http://localhost:4173 (mock data only)'));
