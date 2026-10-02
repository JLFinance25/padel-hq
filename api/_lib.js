// Shared helpers for every API route: the passcode session, the database, and small HTTP utilities.
// Files in /api that start with "_" are not turned into routes by Vercel.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// posts = the pinned announcements in the Updates panel.
export const COLLECTIONS = ['events', 'tasks', 'coe', 'posts'];
const PREFIX = 'phq:';
const LOG_KEY = PREFIX + 'log';
const LOG_KEEP = 500;
const SESSION_DAYS = 30;
const MAX_ITEM_BYTES = 8000;

// ---------- HTTP ----------

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

// Vercel may have parsed the body already; the local dev server has not.
export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error('Request too large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function query(req) {
  return new URL(req.url, 'http://x').searchParams;
}

// ---------- Session (one class passcode) ----------

function secret() {
  const pass = process.env.CLASS_PASSCODE;
  if (!pass) return null;
  // Changing the passcode (or SESSION_SECRET) logs everyone out, which is what we want.
  return crypto.createHash('sha256').update((process.env.SESSION_SECRET || '') + '|' + pass).digest();
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function passcodeMatches(given) {
  const pass = process.env.CLASS_PASSCODE;
  if (!pass || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given.trim()).digest();
  const b = crypto.createHash('sha256').update(pass.trim()).digest();
  return crypto.timingSafeEqual(a, b);
}

export function sessionCookie(req) {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  const token = payload + '.' + sign(payload);
  const secure = isHttps(req) ? '; Secure' : '';
  return `phq_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}

export function clearCookie() {
  return 'phq_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

function isHttps(req) {
  return (req.headers['x-forwarded-proto'] || '').includes('https');
}

export function isLoggedIn(req) {
  if (!secret()) return false;
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/(?:^|;\s*)phq_session=([^;]+)/);
  if (!m) return false;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return false;
  try {
    const a = Buffer.from(sig), b = Buffer.from(sign(payload));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}

// Returns true if the request may continue; otherwise it has already answered.
export function requireLogin(req, res) {
  if (!process.env.CLASS_PASSCODE) {
    send(res, 500, { error: 'The class passcode has not been set up yet (CLASS_PASSCODE).' });
    return false;
  }
  if (!isLoggedIn(req)) {
    send(res, 401, { error: 'Please enter the class passcode.' });
    return false;
  }
  return true;
}

// ---------- Item validation ----------

export function cleanWho(who) {
  return String(who || 'Someone').replace(/[<>]/g, '').trim().slice(0, 40) || 'Someone';
}

export function checkItem(collection, item) {
  if (!COLLECTIONS.includes(collection)) return 'Unknown list.';
  if (!item || typeof item !== 'object' || Array.isArray(item)) return 'Missing item.';
  if (typeof item.id !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(item.id)) return 'Bad item id.';
  if (typeof item.title !== 'string' || !item.title.trim()) return 'Every item needs a title.';
  if (JSON.stringify(item).length > MAX_ITEM_BYTES) return 'That item is too long.';
  for (const k of ['date', 'end', 'due']) {
    const v = item[k];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return `The ${k === 'end' ? 'end date' : 'date'} must look like 2026-10-22.`;
    const y = Number(v.slice(0, 4));
    if (y < 2024 || y > 2030) return `The ${k === 'end' ? 'end date' : 'date'} has to be between 2024 and 2030.`;
  }
  if (item.date && item.end && item.end < item.date) return 'The end date is before the start date.';
  return null;
}

// ---------- Database ----------
// On Vercel: Upstash Redis over its REST API (env vars are added when you connect it).
// On your own computer with no database set up: a JSON file in .data/ so you can try things.

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redis(commands) {
  const cfg = redisConfig();
  const r = await fetch(cfg.url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error('Database error ' + r.status);
  const out = await r.json();
  const bad = out.find((x) => x.error);
  if (bad) throw new Error('Database error: ' + bad.error);
  return out.map((x) => x.result);
}

const FILE = path.join(process.cwd(), '.data', 'db.json');

function fileLoad() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { events: {}, tasks: {}, coe: {}, posts: {}, log: [] };
  }
}

function fileSave(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 1));
}

function usingFile() {
  if (redisConfig()) return false;
  if (process.env.VERCEL) throw new Error('The database is not connected yet. Connect Upstash Redis in the Vercel project.');
  return true;
}

function parseAll(hash) {
  const out = [];
  if (!hash) return out;
  // Upstash returns HGETALL as a flat [field, value, field, value] list.
  if (Array.isArray(hash)) {
    for (let i = 1; i < hash.length; i += 2) {
      try { out.push(JSON.parse(hash[i])); } catch { /* skip a broken row */ }
    }
  } else {
    for (const v of Object.values(hash)) out.push(typeof v === 'string' ? JSON.parse(v) : v);
  }
  return out;
}

export async function loadAll() {
  if (usingFile()) {
    const db = fileLoad();
    return {
      events: Object.values(db.events),
      tasks: Object.values(db.tasks),
      coe: Object.values(db.coe),
      posts: Object.values(db.posts || {}),
      log: db.log.slice(0, 100),
    };
  }
  const [events, tasks, coe, posts, log] = await redis([
    ['HGETALL', PREFIX + 'events'],
    ['HGETALL', PREFIX + 'tasks'],
    ['HGETALL', PREFIX + 'coe'],
    ['HGETALL', PREFIX + 'posts'],
    ['LRANGE', LOG_KEY, '0', '99'],
  ]);
  return {
    events: parseAll(events),
    tasks: parseAll(tasks),
    coe: parseAll(coe),
    posts: parseAll(posts),
    log: (log || []).map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean),
  };
}

function logEntry(who, action, collection, title, id) {
  return { t: new Date().toISOString(), who: cleanWho(who), action, collection, title: String(title || '').slice(0, 120), id: id || null };
}

export async function getItem(collection, id) {
  if (usingFile()) { const c = fileLoad()[collection] || {}; return Object.hasOwn(c, id) ? c[id] : null; }
  const [v] = await redis([['HGET', PREFIX + collection, id]]);
  return v ? JSON.parse(v) : null;
}

export async function saveItem(collection, item, who, action) {
  item.updatedAt = new Date().toISOString();
  item.updatedBy = cleanWho(who);
  const entry = logEntry(who, action, collection, item.title, item.id);
  if (usingFile()) {
    const db = fileLoad();
    db[collection] ||= {};
    db[collection][item.id] = item;
    db.log.unshift(entry);
    db.log = db.log.slice(0, LOG_KEEP);
    fileSave(db);
    return item;
  }
  await redis([
    ['HSET', PREFIX + collection, item.id, JSON.stringify(item)],
    ['LPUSH', LOG_KEY, JSON.stringify(entry)],
    ['LTRIM', LOG_KEY, '0', String(LOG_KEEP - 1)],
  ]);
  return item;
}

export async function deleteItem(collection, id, who, title) {
  const entry = logEntry(who, 'deleted', collection, title || id, id);
  if (usingFile()) {
    const db = fileLoad();
    if (db[collection]) delete db[collection][id];
    db.log.unshift(entry);
    db.log = db.log.slice(0, LOG_KEEP);
    fileSave(db);
    return;
  }
  await redis([
    ['HDEL', PREFIX + collection, id],
    ['LPUSH', LOG_KEY, JSON.stringify(entry)],
    ['LTRIM', LOG_KEY, '0', String(LOG_KEEP - 1)],
  ]);
}

// Adds only items whose id is not already there, so importing twice never overwrites anyone's edits.
export async function importItems(data, who) {
  const counts = { added: 0, skipped: 0 };
  const now = new Date().toISOString();
  const rows = [];
  for (const collection of COLLECTIONS) {
    const list = Array.isArray(data[collection]) ? data[collection] : [];
    for (const item of list) {
      if (checkItem(collection, item)) { counts.skipped++; continue; }
      // importedAt lets the board tell starter data apart from real edits, so an import doesn't light every row as new.
      rows.push([collection, { ...item, updatedAt: now, importedAt: now, updatedBy: cleanWho(who) }]);
    }
  }
  if (usingFile()) {
    const db = fileLoad();
    for (const [c, item] of rows) {
      db[c] ||= {};
      if (Object.hasOwn(db[c], item.id)) counts.skipped++;
      else { db[c][item.id] = item; counts.added++; }
    }
    db.log.unshift(logEntry(who, `imported ${counts.added} items into`, 'all', 'the starter data'));
    fileSave(db);
    return counts;
  }
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const results = await redis(batch.map(([c, item]) => ['HSETNX', PREFIX + c, item.id, JSON.stringify(item)]));
    for (const r of results) r === 1 ? counts.added++ : counts.skipped++;
  }
  await redis([
    ['LPUSH', LOG_KEY, JSON.stringify(logEntry(who, `imported ${counts.added} items into`, 'all', 'the starter data'))],
    ['LTRIM', LOG_KEY, '0', String(LOG_KEEP - 1)],
  ]);
  return counts;
}

// Login throttle: every attempt counts first (so parallel guesses can't slip through),
// more than 20 tries from one address in 10 minutes waits, and a correct passcode clears the count.
const memTries = new Map();
function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
}
export async function countTry(req) {
  const key = PREFIX + 'tries:' + clientIp(req);
  if (!redisConfig()) {
    const now = Date.now();
    const rec = memTries.get(key);
    const fresh = rec && now - rec.start < 600_000 ? rec : { n: 0, start: now };
    fresh.n++;
    memTries.set(key, fresh);
    return fresh.n;
  }
  const [n] = await redis([['INCR', key]]);
  if (Number(n) === 1) await redis([['EXPIRE', key, '600']]);
  return Number(n);
}
export async function clearTries(req) {
  const key = PREFIX + 'tries:' + clientIp(req);
  if (!redisConfig()) { memTries.delete(key); return; }
  await redis([['DEL', key]]);
}
export const MAX_TRIES = 20;
