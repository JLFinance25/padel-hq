// Padel HQ core: fixed lists, shared state, helpers, the server, flip letters and "what's new" tracking.
// Plain JavaScript, loaded in order: core, board, views, drawer, main.
'use strict';

const DEPTS = [
  { id: 'racquets', name: 'Racquets', code: 'Racquets', blurb: 'The set in both sizes: sourcing, samples, the Gauge and inventory.' },
  { id: 'apparel', name: 'Apparel & Booth', code: 'Apparel', blurb: 'The pair-kit uniform and the booth that waits for four.' },
  { id: 'tech', name: 'Technology', code: 'Tech', blurb: 'The free scorer, the website and store, and the tech competitions.' },
  { id: 'finance', name: 'Finance & Compliance', code: 'Finance', blurb: 'Prices, the Numbers Ledger, books, payroll and taxes, and the rules and trademark checks.' },
  { id: 'sales', name: 'Sales & Marketing', code: 'Sales', blurb: 'The catalog, buyers, the sales pitch, branding, video, newsletter and social.' },
  { id: 'firm', name: 'All-firm', code: 'All firm', blurb: "The business plan, Ms. Garrison's questions, trade shows, trips and people." },
];
const dept = (id) => DEPTS.find((d) => d.id === id) || { id: '', name: 'Unsorted', code: '—', blurb: '' };

const KINDS = { deadline: 'Deadline', competition: 'Competition', tradeshow: 'Trade show', trip: 'Field trip', event: 'Event', internal: 'Our milestone' };
const STATUSES = { confirmed: 'Confirmed', projected: 'Projected', teacher: 'From Ms. Garrison', internal: 'Our target', nodate: 'No date yet' };
const BOARD_STATUS = { confirmed: 'Confirmed', projected: 'Check date', teacher: 'From teacher', internal: 'Our target' };
const STATUS_HELP = {
  confirmed: "VE's own site lists this date for 2026–27.",
  projected: "Guessed from last season's date. Confirm with Ms. Garrison before relying on it.",
  teacher: 'Ms. Garrison gave us this in class.',
  internal: 'A target our firm set for itself. It can move.',
  nodate: 'No date found anywhere yet.',
};
const PERIODS = [
  { id: 1, name: 'Period 1', short: 'P1', span: 'Aug to Oct 2026', starts: '2026-08-01', ends: '2026-10-31' },
  { id: 2, name: 'Period 2', short: 'P2', span: 'Nov 2026', starts: '2026-11-01', ends: '2026-11-30' },
  { id: 3, name: 'Period 3', short: 'P3', span: 'Dec 2026', starts: '2026-12-01', ends: '2026-12-31' },
  { id: 4, name: 'Period 4', short: 'P4', span: 'Jan to Feb 2027', starts: '2027-01-01', ends: '2027-02-28' },
  { id: 5, name: 'Period 5', short: 'P5', span: 'Mar to Apr 2027', starts: '2027-03-01', ends: '2027-04-30' },
  { id: 6, name: 'Period 6', short: 'P6', span: 'May 2027', starts: '2027-05-01', ends: '2027-05-31' },
  { id: 'fall-bonus', name: 'Fall bonus', span: 'Aug 1 to Jan 31, up to 2 points', ends: '2027-01-31', bonus: true },
  { id: 'spring-bonus', name: 'Spring bonus', span: 'Feb 1 to May 31, up to 2 points', ends: '2027-05-31', bonus: true },
];
const COE_TOTAL = 60;
const TIERS = [{ id: 'bronze', name: 'Bronze', pct: 60 }, { id: 'silver', name: 'Silver', pct: 80 }, { id: 'gold', name: 'Gold', pct: 90 }];
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = () => window.innerWidth <= 680;

const S = {
  events: [], tasks: [], coe: [], posts: [], log: [],
  view: 'board', loaded: false,
  boardFilter: 'all', boardTeam: 'all', boardFull: false, olderPosts: false,
  month: startOfMonth(new Date()), sel: null, slide: '', monthTeam: 'all', monthTasks: false,
  taskFilter: 'all', showDone: false,
  me: store('phq_me') || '',
};

// ---------- Small helpers ----------

function store(k, v) {
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); return v; } catch { return null; }
}
const $ = (sel, el = document) => el.querySelector(sel);
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const icon = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
function toast(msg, bad) {
  const t = $('#toast');
  t.innerHTML = (bad ? '' : icon('check')) + `<span>${esc(msg)}</span>`;
  t.className = 'toast show' + (bad ? ' bad' : '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = 'toast'), 2800);
}
function newId(title) {
  const slug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
  return slug + '-' + Math.random().toString(36).slice(2, 7);
}
const sameName = (a, b) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

// Dates are stored as "YYYY-MM-DD" and always read as local calendar days.
function parseDay(s) { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
const todayKey = () => dayKey(today());
function daysUntil(s) { const d = parseDay(s); return d ? Math.round((d - today()) / 86400000) : null; }
function fmt(s, opts = { weekday: 'short', month: 'short', day: 'numeric' }) { const d = parseDay(s); return d ? d.toLocaleDateString('en-US', opts) : 'No date'; }
const boardDate = (s) => (s ? fmt(s, { month: 'short', day: 'numeric' }).toUpperCase().replace(/(\D)(\d)$/, '$1 0$2').replace(/ (\d\d)$/, ' $1') : '—');
function relDays(n) {
  if (n === null || n === undefined) return '';
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
  if (s < 86400 * 6) return Math.floor(s / 86400) + (s < 86400 * 2 ? ' day ago' : ' days ago');
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function safeLink(src) {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return `<a href="${esc(src)}" target="_blank" rel="noopener noreferrer">${esc(src.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}</a>`;
  return esc(src);
}
// Short name for tight spots (season map labels): drop "(projected)", stop at ":" or ",".
function shortTitle(t, max = 24) {
  let s = String(t).replace(/\s*\([^)]*\)/g, '').split(/[:,]/)[0].trim();
  if (s.length <= max) return s;
  s = s.slice(0, max + 1);
  return s.slice(0, s.lastIndexOf(' ')) + '…';
}

// ---------- Flip letters ----------
// Each character sits in its own tile. A tile set only flips when its text changed since the last paint.
const flapMemory = new Map();
function flap(key, text, delay = 0) {
  text = String(text).toUpperCase();
  const go = flapMemory.get(key) !== text && !REDUCED;
  flapMemory.set(key, text);
  const tiles = [...text].map((ch, i) => (ch === ' '
    ? '<span class="fc sp"> </span>'
    : `<span class="fc" style="--d:${Math.min(delay + i * 32, 900)}ms">${esc(ch)}</span>`)).join('');
  return `<span class="flaps${go ? ' go' : ''}" aria-hidden="true">${tiles}</span><span class="sr">${esc(text)}</span>`;
}

// ---------- What's new for me ----------
// "since" = when this browser first opened the app. "seen" = which version of each item I've opened.
const NOW_ISO = new Date().toISOString();
const SINCE = store('phq_since') || store('phq_since', NOW_ISO);
let PREV_VISIT = store('phq_lastvisit') || SINCE;
let seen = {};
try { seen = JSON.parse(store('phq_seen') || '{}'); } catch { seen = {}; }

function isLit(collection, item) {
  if (!item || !item.updatedAt || item.updatedAt <= SINCE) return false;
  if (item.importedAt && item.updatedAt === item.importedAt) return false;
  if (sameName(item.updatedBy, S.me)) return false;
  return seen[collection + ':' + item.id] !== item.updatedAt;
}
const litWord = (item) => (item.createdAt && item.createdAt > SINCE ? 'New' : 'Updated');
function markSeen(collection, item) {
  if (!item) return;
  seen[collection + ':' + item.id] = item.updatedAt;
  store('phq_seen', JSON.stringify(seen));
}
function litItems() {
  const out = [];
  for (const c of ['events', 'tasks', 'coe']) for (const it of S[c]) if (isLit(c, it)) out.push([c, it]);
  return out;
}
function markAllSeen() {
  for (const [c, it] of litItems()) seen[c + ':' + it.id] = it.updatedAt;
  store('phq_seen', JSON.stringify(seen));
  PREV_VISIT = new Date().toISOString();
  store('phq_lastvisit', PREV_VISIT);
}

// ---------- Server ----------

async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' });
  let body = {};
  try { body = await r.json(); } catch { /* empty */ }
  if (r.status === 401 && !path.includes('login')) { showLogin(); throw new Error(body.error || 'Please log in'); }
  if (!r.ok) throw new Error(body.error || 'Something went wrong');
  return body;
}

async function refresh(quiet) {
  try {
    const data = await api('/api/data');
    S.events = data.events || []; S.tasks = data.tasks || []; S.coe = data.coe || []; S.posts = data.posts || []; S.log = data.log || [];
    S.loaded = true;
    if (!drawerIsEditing()) { renderTabs(); render(); }
  } catch (e) {
    if (!quiet) toast(e.message, true);
  }
}

async function saveItem(collection, item) {
  const list = S[collection];
  const i = list.findIndex((x) => x.id === item.id);
  const before = i >= 0 ? list[i] : null;
  if (i >= 0) list[i] = item; else list.push(item);
  renderTabs(); render();
  try {
    const { item: saved } = await api('/api/item', { method: 'POST', body: JSON.stringify({ collection, item, who: S.me }) });
    const j = S[collection].findIndex((x) => x.id === saved.id);
    if (j >= 0) S[collection][j] = saved;
    markSeen(collection, saved);
    refreshLogSoon();
    return saved;
  } catch (e) {
    if (before) list[i] = before; else S[collection] = list.filter((x) => x.id !== item.id);
    renderTabs(); render();
    toast("Didn't save: " + e.message, true);
    throw e;
  }
}

async function removeItem(collection, item, word = 'Delete') {
  if (!confirm(`${word} "${item.title}" for everyone? This can't be undone.`)) return false;
  try {
    await api(`/api/item?collection=${collection}&id=${encodeURIComponent(item.id)}&who=${encodeURIComponent(S.me)}`, { method: 'DELETE' });
    S[collection] = S[collection].filter((x) => x.id !== item.id);
    renderTabs(); render();
    toast(word === 'Delete' ? 'Deleted' : 'Removed');
    refreshLogSoon();
    return true;
  } catch (e) {
    toast(`Didn't ${word.toLowerCase()}: ` + e.message, true);
    return false;
  }
}

// The log updates on the server; pull it shortly after a change so the Updates feed shows it.
function refreshLogSoon() { clearTimeout(refreshLogSoon.t); refreshLogSoon.t = setTimeout(() => refresh(true), 700); }

const findItem = (collection, id) => (S[collection] || []).find((x) => x.id === id);

// Log lines in plain words. Starter-data imports read as one line, and empty re-imports are hidden.
function logLines(limit) {
  return S.log.filter((l) => !/^imported 0 /.test(l.action)).slice(0, limit);
}
function logWords(l) {
  const m = /^imported (\d+) items/.exec(l.action);
  if (m) return { action: `loaded the starter data (${m[1]} items)`, what: '' };
  return { action: l.action, what: l.collection === 'all' ? esc(l.title) : `“${esc(l.title)}”` };
}
