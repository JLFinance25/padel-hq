// test/helpers.mjs: run API handlers against a throwaway data file. Never touches the live database.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function useTempData() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'casapala-'));
  process.chdir(dir); // _lib.js picks its data file from the working folder when it is first imported
  for (const k of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'VERCEL']) delete process.env[k];
  process.env.CLASS_PASSCODE = 'class-test';
  delete process.env.OWNER_PASSCODE;
  return dir;
}

export function seed(db) {
  fs.mkdirSync('.data', { recursive: true });
  fs.writeFileSync('.data/db.json', JSON.stringify({ events: {}, tasks: {}, coe: {}, suggestions: {}, links: {}, trash: {}, log: [], ...db }));
}
export const readDb = () => JSON.parse(fs.readFileSync('.data/db.json', 'utf8'));

export async function call(handler, { method = 'GET', url = '/api/x', body, cookie = '' } = {}) {
  const req = { method, url, headers: { cookie, 'x-forwarded-for': '10.0.0.' + Math.floor(Math.random() * 250) }, body: body ?? {}, socket: {} };
  const res = {
    statusCode: 200, headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(s) { this.body = s ? JSON.parse(s) : null; },
  };
  await handler(req, res);
  return res;
}

export function cookiesFrom(res) {
  return [].concat(res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).filter((c) => !c.endsWith('=')).join('; ');
}

export async function login(loginHandler, passcode) {
  const r = await call(loginHandler, { method: 'POST', body: { passcode } });
  if (r.statusCode !== 200) throw new Error('login failed: ' + JSON.stringify(r.body));
  return cookiesFrom(r);
}
