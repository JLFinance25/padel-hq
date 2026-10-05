// Padel HQ core: fixed lists, shared state, helpers, the server, flip letters and "what's new" tracking.
// Plain JavaScript, loaded in order: core, board, views, drawer, main.
'use strict';

const DEPTS = [
  { id: 'racquets', name: 'Racquets', code: 'Racquets', blurb: 'The set in both sizes: sourcing, samples, the Gauge and inventory.' },
  { id: 'apparel', name: 'Apparel & Booth', code: 'Apparel', blurb: 'The pair-kit uniform and the booth that waits for four.' },
  { id: 'tech', name: 'Technology', code: 'Tech', blurb: 'The free scorer, the website and store, and the tech competitions.' },
  { id: 'finance', name: 'Finance & Compliance', code: 'Finance', blurb: 'Prices, the Numbers Ledger, books, payroll and taxes, and the rules and trademark checks.' },
  { id: 'sales', name: 'Sales & Marketing', code: 'Sales', blurb: 'The catalog, buyers, the sales pitch, branding, video, newsletter and social.' },
  { id: 'firm', name: 'All-firm', code: 'All firm', blurb: 'The business plan, questions for our teacher, trade shows, trips and people.' },
];
const dept = (id) => DEPTS.find((d) => d.id === id) || { id: '', name: 'Unsorted', code: '—', blurb: '' };

const KINDS = { deadline: 'Deadline', competition: 'Competition', tradeshow: 'Trade show', trip: 'Field trip', event: 'Event', internal: 'Our milestone', dayoff: 'No school' };
const STATUSES = { confirmed: 'Confirmed', projected: 'Projected', teacher: 'From our teacher', internal: 'Our target', nodate: 'No date yet' };
const BOARD_STATUS = { confirmed: 'Confirmed', projected: 'Projected', teacher: 'From teacher', internal: 'Our target', nodate: 'No date' };
const STATUS_HELP = {
  confirmed: 'An official 2026–27 calendar lists this date (VE or the school district; see Source).',
  projected: "Guessed from last season's date. Confirm with our teacher before relying on it.",
  teacher: 'Our teacher gave us this in class.',
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
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DATE_MIN = '2026-01-01', DATE_MAX = '2027-12-31';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = () => window.innerWidth <= 680;

const S = {
  events: [], tasks: [], coe: [], posts: [], log: [],
  view: 'board', loaded: false,
  boardFilter: 'dates', boardTeam: 'all', boardFull: false, showLate: false, olderPosts: false,
  month: startOfMonth(new Date()), sel: null, slide: '', monthTeam: 'all', monthTasks: false,
  taskFilter: 'all', showDone: false,
  me: store('phq_me') || '',
};

// ---------- Small helpers ----------

function store(k, v) {
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); return v; } catch { return v === undefined ? null : v; }
}
const $ = (sel, el = document) => el.querySelector(sel);
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const icon = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

// Toast, optionally with one action button (used for Undo).
function toast(msg, bad, action) {
  const t = $('#toast');
  t.innerHTML = (bad ? '' : icon('check')) + `<span>${esc(msg)}</span>` + (action ? `<button class="toast-btn" type="button">${esc(action.label)}</button>` : '');
  t.className = 'toast show' + (bad ? ' bad' : '') + (action ? ' has-action' : '');
  if (action) t.querySelector('.toast-btn').onclick = () => { t.className = 'toast'; action.run(); };
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = 'toast'), action ? 6500 : 2800);
}
function newId(title) {
  const slug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
  return slug + '-' + Math.random().toString(36).slice(2, 7);
}
const sameName = (a, b) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
// "Mine" = my name is one of the owners. "Maya, Sam" or "Maya & Sam" both count for Sam; "Al" doesn't match "Alex".
const ownerMatches = (owner, me) => !!me && String(owner || '').split(/\s*(?:,|&|\/|\band\b)\s*/i).some((n) => sameName(n, me));

// Dates are stored as "YYYY-MM-DD" and always read as local calendar days.
function parseDay(s) { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
const todayKey = () => dayKey(today());
function daysUntil(s) { const d = parseDay(s); return d ? Math.round((d - today()) / 86400000) : null; }
function fmt(s, opts = { weekday: 'short', month: 'short', day: 'numeric' }) { const d = parseDay(s); return d ? d.toLocaleDateString('en-US', opts) : 'No date'; }
function boardDate(s) { const d = parseDay(s); return d ? `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}` : '—'; }
function relDays(n) {
  if (n === null || n === undefined) return '';
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (!isFinite(s)) return '';
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
  if (s < 86400 * 6) return Math.floor(s / 86400) + (s < 86400 * 2 ? ' day ago' : ' days ago');
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function safeLink(src) {
  if (!src) return '';
  src = String(src);
  if (/^https?:\/\//i.test(src)) return `<a href="${esc(src)}" target="_blank" rel="noopener noreferrer">${esc(src.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}</a>`;
  return esc(src);
}
// Name for tight spots (season map): the item's own short name if it has one, else a trimmed title.
function shortTitle(item, max = 22) {
  if (item.short) return item.short;
  let s = String(item.title).replace(/\s*\([^)]*\)/g, '').split(/[:,]/)[0].trim();
  if (s.length <= max) return s;
  s = s.slice(0, max + 1);
  return s.slice(0, s.lastIndexOf(' ')) + '…';
}

// ---------- Flip letters ----------
// Each character sits in its own tile. On the first paint the whole board cascades once.
// After that, tiles only flip when their text actually changes, never just because a filter changed.
const flapMemory = new Map();
let flapArmed = false;
function flap(key, text, delay = 0) {
  text = String(text).toUpperCase();
  const prev = flapMemory.get(key);
  const go = !REDUCED && (prev === undefined ? !flapArmed : prev !== text);
  flapMemory.set(key, text);
  const tiles = [...text].map((ch, i) => (ch === ' '
    ? '<span class="fc sp"> </span>'
    : `<span class="fc" style="--d:${Math.min(delay + i * 32, 900)}ms">${esc(ch)}</span>`)).join('');
  return `<span class="flaps${go ? ' go' : ''}" aria-hidden="true">${tiles}</span><span class="sr">${esc(text)}</span>`;
}

// ---------- What's new for me ----------
// "since" = when this browser first opened the app. "seen" = which version of each item I've opened.
const NOW_ISO = new Date().toISOString();
const SINCE = store('phq_since') || store('phq_since', NOW_ISO) || NOW_ISO;
let PREV_VISIT = store('phq_lastvisit') || SINCE;
let seen = {};
try { seen = JSON.parse(store('phq_seen') || '{}'); } catch { seen = {}; }

function isLit(collection, item) {
  if (!item || !item.updatedAt || item.updatedAt <= SINCE) return false;
  if (item.importedAt && item.updatedAt === item.importedAt) return false;
  if (sameName(item.updatedBy, S.me)) return false;
  return seen[collection + ':' + item.id] !== item.updatedAt;
}
function litWord(collection, item) {
  const neverOpened = !Object.hasOwn(seen, collection + ':' + item.id);
  return neverOpened && item.createdAt && item.createdAt > SINCE ? 'New' : 'Updated';
}
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

// ---------- Log wording ----------
// Starter-data imports read as one line, and empty re-imports are hidden.
function logLines(limit) {
  return S.log.filter((l) => !/^imported 0 /.test(l.action)).slice(0, limit);
}
function logWords(l) {
  const m = /^imported (\d+) items/.exec(l.action);
  if (m) return { action: `loaded the starter data (${m[1]} items)`, what: '' };
  return { action: l.action, what: l.collection === 'all' ? esc(l.title) : `“${esc(l.title)}”` };
}
// Where a log line should open, if anywhere. Posts and deleted things have no panel.
function logTarget(l) {
  if (l.collection === 'all' || l.collection === 'posts' || l.action === 'deleted') return null;
  const it = l.id ? findItem(l.collection, l.id) : (S[l.collection] || []).find((x) => x.title === l.title);
  return it ? { c: l.collection, it } : null;
}
const freshLog = () => logLines(100).filter((l) => l.t > PREV_VISIT && !sameName(l.who, S.me));

// ---------- Server ----------

async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' });
  let body = {};
  try { body = await r.json(); } catch { /* empty */ }
  if (r.status === 401 && !path.includes('login')) { showLogin(); throw new Error(body.error || 'Please log in'); }
  if (!r.ok) { const e = new Error(body.error || 'Something went wrong'); e.status = r.status; throw e; }
  return body;
}

let lastData = '';
async function refresh(quiet) {
  try {
    const data = await api('/api/data');
    const raw = JSON.stringify(data) + todayKey(); // a new day repaints even if nothing else changed
    if (quiet && raw === lastData && S.loaded) return; // nothing changed: don't repaint (keeps focus, scroll and open menus)
    lastData = raw;
    const first = !S.loaded;
    S.events = data.events || []; S.tasks = data.tasks || []; S.coe = data.coe || []; S.posts = data.posts || []; S.log = data.log || [];
    S.loaded = true; S.loadError = null;
    if (!drawerIsEditing()) { renderTabs(); render(); if (drawerState) syncDrawer(); }
    if (first) enterMain();
  } catch (e) {
    // Nothing on screen yet: say what went wrong where the board would be, with a way to try again.
    if (!S.loaded) { S.loadError = e.message; render(); return; }
    if (!quiet) toast(e.message, true);
  }
}

function putLocal(collection, item) {
  const i = S[collection].findIndex((x) => x.id === item.id);
  if (i >= 0) S[collection][i] = item; else S[collection].push(item);
}

// Create a new item (the whole thing).
async function createItem(collection, item) {
  putLocal(collection, item);
  renderTabs(); render();
  try {
    const { item: saved } = await api('/api/item', { method: 'POST', body: JSON.stringify({ collection, item, who: S.me }) });
    putLocal(collection, saved);
    markSeen(collection, saved);
    refreshLogSoon();
    return saved;
  } catch (e) {
    S[collection] = S[collection].filter((x) => x.id !== item.id);
    renderTabs(); render();
    toast("Didn't save: " + e.message, true);
    throw e;
  }
}

// Change some fields of an existing item. Only the changed fields go to the server,
// which merges them onto the newest saved copy, so classmates' edits aren't overwritten.
async function updateItem(collection, id, fields) {
  const before = findItem(collection, id);
  if (!before) { toast('Someone deleted this item.', true); throw new Error('gone'); }
  putLocal(collection, { ...before, ...fields });
  renderTabs(); render();
  try {
    const { item: saved } = await api('/api/item', { method: 'POST', body: JSON.stringify({ collection, item: { id, ...fields }, patch: true, who: S.me }) });
    putLocal(collection, saved);
    markSeen(collection, saved);
    refreshLogSoon();
    return saved;
  } catch (e) {
    if (e.status === 404) S[collection] = S[collection].filter((x) => x.id !== id); else putLocal(collection, before);
    renderTabs(); render();
    toast(e.status === 404 ? 'Someone deleted this item.' : "Didn't save: " + e.message, true);
    throw e;
  }
}

// A to-do linked to a Circles item moves with it: the Circles item is done when every to-do linked to it is,
// and checking the Circles item itself checks its linked to-dos.
async function setDone(collection, id, done) {
  const saved = await updateItem(collection, id, { done });
  const sync = [];
  if (collection === 'tasks' && saved.coe) {
    const c = findItem('coe', saved.coe);
    const all = S.tasks.filter((t) => t.coe === saved.coe).every((t) => t.done);
    if (c && !!c.done !== all) sync.push(['coe', c.id, all]);
  } else if (collection === 'coe') {
    for (const t of S.tasks) if (t.coe === id && !!t.done !== done) sync.push(['tasks', t.id, done]);
  }
  for (const [c, i, d] of sync) await updateItem(c, i, { done: d }).catch(() => {}); // a failure already showed its own message
  return saved;
}

// Check off or un-check, with an Undo button in the message.
async function toggleDone(collection, id) {
  const item = findItem(collection, id);
  if (!item) return null;
  const saved = await setDone(collection, id, !item.done);
  const coe = collection === 'tasks' && saved.coe && findItem('coe', saved.coe);
  const msg = saved.done ? (coe && coe.done ? `Checked off. Circles +${coe.points} counted.` : 'Checked off') : 'Marked not done';
  toast(msg, false, {
    label: 'Undo',
    run: () => setDone(collection, id, !saved.done).then(() => toast('Undone')).catch(() => {}),
  });
  return saved;
}

async function removeItem(collection, item, word = 'Delete') {
  if (!confirm(`${word} "${item.title}" for everyone? This can't be undone.`)) return false;
  try {
    await api(`/api/item?collection=${collection}&id=${encodeURIComponent(item.id)}&who=${encodeURIComponent(S.me)}`, { method: 'DELETE' });
  } catch (e) {
    if (e.status !== 404) { toast(`Didn't ${word.toLowerCase()}: ` + e.message, true); return false; }
  }
  S[collection] = S[collection].filter((x) => x.id !== item.id);
  renderTabs(); render();
  toast(word === 'Delete' ? 'Deleted' : 'Removed');
  refreshLogSoon();
  return true;
}

// The log updates on the server; pull it shortly after a change so the Updates feed shows it.
function refreshLogSoon() { clearTimeout(refreshLogSoon.t); refreshLogSoon.t = setTimeout(() => refresh(true), 700); }

// Circles of Excellence items no to-do already covers. They show in their team's list and on the board's To-dos view,
// so money jobs like payroll and taxes are visible where teams look, as one item with one checkbox.
function looseCoe(dept) {
  const covered = new Set(S.tasks.map((t) => t.coe).filter(Boolean));
  return S.coe.filter((c) => !covered.has(c.id) && (!dept || c.dept === dept));
}

function findItem(collection, id) { return (S[collection] || []).find((x) => x.id === id); }
