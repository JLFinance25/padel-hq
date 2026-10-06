// Run the site on your own computer: CLASS_PASSCODE=test OFFICER_PASSCODE=boss node dev-server.mjs
// It serves /public and sends /api/* to the same files Vercel uses. Data goes to .data/db.json.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3030);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  try { await handle(req, res); } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.statusCode = 400; res.end('Bad request'); }
  }
}).listen(PORT, () => console.log(`Padel HQ running at http://localhost:${PORT}`));

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z]/g, '');
    const file = path.resolve('api', name + '.js');
    if (!name || name.startsWith('_') || !fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
    const mod = await import(file); // restart the dev server after changing api/ files
    return mod.default(req, res);
  }
  let p = path.join('public', decodeURIComponent(url.pathname));
  if (!p.startsWith('public')) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
}
