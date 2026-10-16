// test/fake-redis.mjs: a tiny stand-in for the Upstash REST database, on this computer only, with a delay
// on every call like a real network. It knows just the commands the site uses.
import http from 'node:http';

export function startFakeRedis(delayMs = 30) {
  const H = new Map(), L = new Map(), K = new Map(), EXP = new Map();
  const h = (k) => (H.has(k) || H.set(k, new Map()), H.get(k));
  const live = (k) => K.has(k) && !(EXP.has(k) && EXP.get(k) <= Date.now());
  function run([cmd, ...a]) {
    switch (String(cmd).toUpperCase()) {
      case 'HGETALL': return [...h(a[0])].flat();
      case 'HGET': return h(a[0]).get(a[1]) ?? null;
      case 'HSET': { const m = h(a[0]); for (let i = 1; i < a.length; i += 2) m.set(a[i], a[i + 1]); return 1; }
      case 'HDEL': { const m = h(a[0]); let n = 0; for (const f of a.slice(1)) if (m.delete(f)) n++; return n; }
      case 'LPUSH': { const l = L.get(a[0]) || []; l.unshift(...a.slice(1).reverse()); L.set(a[0], l); return l.length; }
      case 'LTRIM': { const l = L.get(a[0]) || []; L.set(a[0], l.slice(Number(a[1]), Number(a[2]) + 1)); return 'OK'; }
      case 'LRANGE': return (L.get(a[0]) || []).slice(Number(a[1]), Number(a[2]) + 1);
      case 'SET': {
        const up = a.map((x) => String(x).toUpperCase());
        if (up.includes('NX') && live(a[0])) return null;
        K.set(a[0], a[1]);
        const px = up.indexOf('PX');
        if (px > 0) EXP.set(a[0], Date.now() + Number(a[px + 1])); else EXP.delete(a[0]);
        return 'OK';
      }
      case 'DEL': { let n = 0; for (const k of a) { if (K.delete(k)) n++; EXP.delete(k); } return n; }
      case 'INCR': { const n = (Number(K.get(a[0])) || 0) + 1; K.set(a[0], n); return n; }
      case 'EXPIRE': return 1;
      default: throw new Error('unsupported ' + cmd);
    }
  }
  const server = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => setTimeout(() => {
      const out = JSON.parse(b || '[]').map((c) => { try { return { result: run(c) }; } catch (e) { return { error: e.message }; } });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(out));
    }, delayMs));
  });
  return new Promise((resolve) => server.listen(0, () => resolve({
    url: `http://localhost:${server.address().port}`,
    hash: (k) => h(k),
    close: () => new Promise((r) => server.close(r)),
  })));
}
