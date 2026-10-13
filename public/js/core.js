// Padel HQ core: fixed lists, shared state, helpers, the server and flip letters.
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
const STATUS_HELP = {
  confirmed: 'An official 2026–27 calendar lists this date (VE or the school district; see Source).',
  projected: "Guessed from last season's date. Confirm with our teacher before relying on it.",
  teacher: 'Our teacher gave us this in class.',
  internal: 'A target our firm set for itself. It can move.',
  nodate: 'No date found anywhere yet.',
};
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DATE_MIN = '2026-01-01', DATE_MAX = '2027-12-31';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = () => window.innerWidth <= 680;

const S = {
  events: [], tasks: [],
  view: 'board', loaded: false,
  boardFull: false, showLate: false,
  month: startOfMonth(new Date()), sel: null, slide: '', monthTeam: 'all', monthTasks: false,
  showDone: false,
  addTeam: store('phq_add_team') || 'firm', // the Add page remembers the last team you added a to-do for
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
    S.events = data.events || []; S.tasks = data.tasks || [];
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
    return saved;
  } catch (e) {
    if (e.status === 404) S[collection] = S[collection].filter((x) => x.id !== id); else putLocal(collection, before);
    renderTabs(); render();
    toast(e.status === 404 ? 'Someone deleted this item.' : "Didn't save: " + e.message, true);
    throw e;
  }
}

// Check off or un-check, with an Undo button in the message.
async function toggleDone(collection, id) {
  const item = findItem(collection, id);
  if (!item) return null;
  const saved = await updateItem(collection, id, { done: !item.done });
  toast(saved.done ? 'Checked off' : 'Marked not done', false, {
    label: 'Undo',
    run: () => updateItem(collection, id, { done: !saved.done }).then(() => toast('Undone')).catch(() => {}),
  });
  return saved;
}

async function removeItem(collection, item) {
  if (!confirm(`Delete "${item.title}" for everyone? This can't be undone.`)) return false;
  try {
    await api(`/api/item?collection=${collection}&id=${encodeURIComponent(item.id)}&who=${encodeURIComponent(S.me)}`, { method: 'DELETE' });
  } catch (e) {
    if (e.status !== 404) { toast("Didn't delete: " + e.message, true); return false; }
  }
  S[collection] = S[collection].filter((x) => x.id !== item.id);
  renderTabs(); render();
  toast('Deleted');
  return true;
}

function findItem(collection, id) { return (S[collection] || []).find((x) => x.id === id); }
