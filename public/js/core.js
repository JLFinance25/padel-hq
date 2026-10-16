// Padel HQ core: fixed lists, shared state, helpers and the server.
// Plain JavaScript, loaded in order: core, board, views, drawer, main.
'use strict';

const DEPTS = [
  { id: 'ceo', name: 'CEO office', code: 'CEO', blurb: 'The business plan as a whole, decisions, and every talk with our teacher and the judges.' },
  { id: 'ops', name: 'Operations', code: 'Ops', blurb: "The set and what's in the box, samples, inventory, and getting everything to the booth." },
  { id: 'finance', name: 'Finance & Compliance', code: 'Finance', blurb: 'Prices, the Numbers Ledger, payroll and taxes, and the rules: legal form, disclaimer, trademark, labels.' },
  { id: 'marketing', name: 'Marketing', code: 'Marketing', blurb: 'The brand, branding PDF, video, newsletter, social, apparel and the booth design.' },
  { id: 'sales', name: 'Sales', code: 'Sales', blurb: 'The catalog, buyer list, firm-to-firm selling and selling at trade shows.' },
  { id: 'tech', name: 'Technology', code: 'Tech', blurb: 'The scorer, the website and store, and this site.' },
  { id: 'hr', name: 'HR', code: 'HR', blurb: 'Hiring into seats, training, reviews, payroll records and the booth shift rota.' },
  { id: 'firm', name: 'All-firm', code: 'All firm', blurb: 'Trade shows, trips, competitions and anything everyone does.' },
];
// Old team ids and the office each one probably belongs to. For display only: such items stay under
// Unsorted until someone moves them (nothing is changed in the saved data).
const LEGACY = { racquets: 'ops', apparel: 'marketing' };
const LEGACY_NAMES = { racquets: 'Racquets', apparel: 'Apparel & Booth' };
const dept = (id) => DEPTS.find((d) => d.id === id) || { id: '', name: 'Unsorted', code: '—', blurb: '', was: Object.hasOwn(LEGACY_NAMES, id) ? LEGACY_NAMES[id] : '' };
const isOffice = (id) => DEPTS.some((d) => d.id === id);
// "Operations", or "Unsorted (was Racquets)" for an item still on an old team.
const deptLabel = (id) => { const d = dept(id); return d.was ? `${d.name} (was ${d.was})` : d.name; };

const KINDS = { deadline: 'Deadline', competition: 'Competition', tradeshow: 'Trade show', trip: 'Field trip', event: 'Event', internal: 'Our milestone', dayoff: 'No school' };
const STATUSES = { confirmed: 'Confirmed', projected: 'Projected', teacher: 'From our teacher', internal: 'Our target', nodate: 'No date yet' };
const STATUS_HELP = {
  confirmed: 'An official 2026–27 calendar lists this date (VE or the school district; see Source).',
  projected: "Guessed from last season's date. Confirm with our teacher before relying on it.",
  teacher: 'Our teacher gave us this in class.',
  internal: 'A target our firm set for itself. It can move.',
  nodate: 'No date found anywhere yet.',
};
// Circles of Excellence: VE's yearly points checklist.
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
const TIERS = [{ id: 'bronze', name: 'Bronze', points: 36 }, { id: 'silver', name: 'Silver', points: 48 }, { id: 'gold', name: 'Gold', points: 54 }];
const DATE_MIN = '2026-01-01', DATE_MAX = '2027-12-31';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = () => window.innerWidth <= 680;

const S = {
  events: [], tasks: [], links: [], coe: [],
  view: 'home', office: '', loaded: false,
  month: startOfMonth(new Date()), sel: null,
  seen: store('phq_seen') || '', // when this device was last opened (ISO time); empty on the very first visit
  nameEdit: false, // Mine: the name box is open
  comingAll: { overdue: false, next: false }, // Home: which Coming up groups show every row
  doneOpen: '',    // the office whose "Done" list is showing
  me: store('phq_me') || '', // first name, so check-offs show who did them
  trash: [],       // recently deleted items (anyone logged in can put them back)
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
  toast.timer = setTimeout(() => { t.className = 'toast'; t.querySelector('.toast-btn')?.remove(); }, action ? 6500 : 2800);
}
function newId(title) {
  const slug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
  return slug + '-' + Math.random().toString(36).slice(2, 7);
}

// Dates are stored as "YYYY-MM-DD" and always read as local calendar days.
function parseDay(s) { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
const todayKey = () => dayKey(today());
function daysUntil(s) { const d = parseDay(s); return d ? Math.round((d - today()) / 86400000) : null; }
function fmt(s, opts = { weekday: 'short', month: 'short', day: 'numeric' }) { const d = parseDay(s); return d ? d.toLocaleDateString('en-US', opts) : 'No date'; }
function boardDate(s) { const d = parseDay(s); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'; }
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
// ---------- Server ----------

async function api(path, opts = {}) {
  let r;
  try {
    r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' });
  } catch {
    // No answer came back. The change may still have reached the server, so callers check again (see recheck).
    const e = new Error("Couldn't reach the site. Check your internet connection.");
    e.network = true;
    throw e;
  }
  let body = {};
  try { body = await r.json(); } catch { /* empty */ }
  if (r.status === 401 && !path.includes('login')) { showLogin(); throw new Error(body.error || 'Please log in'); }
  if (!r.ok) { const e = new Error(body.error || 'Something went wrong'); e.status = r.status; throw e; }
  return body;
}

let lastData = '';
// Returns true when the newest copy was loaded, false when it could not be.
async function refresh(quiet) {
  try {
    const data = await api('/api/data');
    const raw = JSON.stringify(data) + todayKey(); // a new day repaints even if nothing else changed
    if (quiet && raw === lastData && S.loaded) return true; // nothing changed: don't repaint (keeps focus, scroll and open menus)
    lastData = raw;
    const first = !S.loaded;
    S.events = data.events || []; S.tasks = data.tasks || []; S.links = data.links || []; S.coe = data.coe || [];
    S.trash = data.trash || [];
    S.loaded = true; S.loadError = null;
    if (first) store('phq_seen', new Date().toISOString()); // next visit, anything newer than S.seen (read at start) is "New"
    renderTabs(); render(); // an open form is left alone: syncDrawer skips it
    if (drawerState) syncDrawer();
    return true;
  } catch (e) {
    // Nothing on screen yet: say what went wrong where the board would be, with a way to try again.
    if (!S.loaded) { S.loadError = e.message; render(); return false; }
    if (!quiet) toast(e.message, true);
    return false;
  }
}

function putLocal(collection, item) {
  if (!S[collection]) return; // a list this page doesn't keep
  const i = S[collection].findIndex((x) => x.id === item.id);
  if (i >= 0) S[collection][i] = item; else S[collection].push(item);
}

// After a lost answer, ask the server what it really saved, so the screen doesn't keep showing an old state.
// A 409 on a new item means an earlier try did save it. lastData is cleared so the screen repaints even if
// the server's copy is the same as the last one loaded.
function recheck(e) { if (e && (e.network || e.status === 409)) setTimeout(() => { lastData = ''; refresh(true); }, 1500); }

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
    recheck(e);
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
    if (collection === 'coe') { renderTabs(); render(); } // the server adds who ticked it and when
    return saved;
  } catch (e) {
    if (e.status === 404) S[collection] = S[collection].filter((x) => x.id !== id); else putLocal(collection, before);
    renderTabs(); render();
    toast(e.status === 404 ? 'Someone deleted this item.' : "Didn't save: " + e.message, true);
    recheck(e);
    throw e;
  }
}

// Delete goes to Recently deleted, with Undo in the message.
async function removeItem(collection, id) {
  const before = findItem(collection, id);
  S[collection] = S[collection].filter((x) => x.id !== id);
  renderTabs(); render();
  try {
    const { trash } = await api(`/api/item?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(id)}&who=${encodeURIComponent(S.me)}`, { method: 'DELETE' });
    S.trash = S.trash.filter((t) => t.id !== trash.id).concat(trash);
    renderTabs(); render();
    toast('Deleted', false, { label: 'Undo', run: () => restoreItem(trash.id).catch(() => {}) });
  } catch (e) {
    if (before && e.status !== 404) putLocal(collection, before); // a 404 means it is already gone, so leave it gone
    renderTabs(); render();
    toast("Didn't delete: " + e.message, true);
    recheck(e);
    throw e;
  }
}

// Put something from Recently deleted back exactly as it was.
async function restoreItem(trashId) {
  try {
    const { item } = await api('/api/item', { method: 'POST', body: JSON.stringify({ op: 'restore', trashId, who: S.me }) });
    const [collection] = trashId.split(':');
    putLocal(collection, item);
    S.trash = S.trash.filter((t) => t.id !== trashId);
    renderTabs(); render();
    toast('Put back');
    return item;
  } catch (e) {
    toast("Didn't put it back: " + e.message, true);
    if (e.status === 404 || e.status === 409) refresh(true);
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

// ---------- To-dos and their checklists ----------
// Each one changes the page first, then tells the server, and undoes itself with a message if the server says no.

const MAX_STEPS = 30;
const stepsOf = (t) => (t && Array.isArray(t.steps) ? t.steps : []);
const repaintAll = () => { renderTabs(); render(); if (drawerState) syncDrawer(); };

function postItem(body) {
  return api('/api/item', { method: 'POST', body: JSON.stringify({ ...body, who: S.me }) });
}

// A new to-do. fields: title, dept, due, owner, desc. A retry passes the same id, so it can't make a second copy.
async function addTask(fields, id = newId(fields.title)) {
  const sent = { id, title: fields.title, dept: fields.dept, due: fields.due || null, owner: fields.owner || '', desc: fields.desc || '' };
  putLocal('tasks', { ...sent, done: false, steps: [], addedBy: S.me });
  repaintAll();
  try {
    const { item } = await postItem({ op: 'add-task', item: sent });
    putLocal('tasks', item);
    repaintAll();
    return item;
  } catch (e) {
    S.tasks = S.tasks.filter((x) => x.id !== id);
    repaintAll();
    toast("Didn't save: " + e.message, true);
    recheck(e);
    throw e;
  }
}

// What to do when a checklist change fails. A 404 about the to-do means it is gone: drop it here and close its popup.
// A 404 about one step means only that step is gone, so the list is just refreshed.
function stepFailed(taskId, e, undo) {
  const stepGone = e.status === 404 && /step/i.test(e.message);
  const todoGone = e.status === 404 && !stepGone;
  if (todoGone) S.tasks = S.tasks.filter((x) => x.id !== taskId); else undo();
  if (todoGone && drawerState && drawerState.id === taskId) closeDrawer(); else repaintAll();
  toast(todoGone ? 'Someone deleted this to-do.' : stepGone ? 'That step was removed.' : "Didn't save: " + e.message, true);
  if (stepGone) refresh(true); else recheck(e);
}

// Add a step at the end of the checklist.
async function addStep(taskId, text) {
  const task = findItem('tasks', taskId);
  if (!task) { toast('Someone deleted this to-do.', true); throw new Error('gone'); }
  text = String(text).trim().slice(0, 200);
  if (!text) throw new Error('empty');
  if (stepsOf(task).length >= MAX_STEPS) { toast("This to-do's checklist is full (30 steps).", true); throw new Error('full'); }
  // Step ids are at most 40 characters, so the words are cut short before newId adds its ending.
  let id = newId(text.slice(0, 30));
  while (stepsOf(task).some((x) => x.id === id)) id = newId(text.slice(0, 30));
  putLocal('tasks', { ...task, steps: [...stepsOf(task), { id, text, done: false, addedBy: S.me }] });
  repaintAll();
  try {
    const { item } = await postItem({ op: 'add-step', taskId, step: { id, text } });
    putLocal('tasks', item);
    repaintAll();
    return item;
  } catch (e) {
    stepFailed(taskId, e, () => { const cur = findItem('tasks', taskId); if (cur) putLocal('tasks', { ...cur, steps: stepsOf(cur).filter((x) => x.id !== id) }); });
    throw e;
  }
}

// Tick a step, or un-tick it. Ticking the last one does not tick the to-do itself.
async function tickStep(taskId, stepId) {
  const task = findItem('tasks', taskId);
  const step = stepsOf(task).find((x) => x.id === stepId);
  if (!step) { toast('That step was removed.', true); refresh(true); throw new Error('gone'); }
  const done = !step.done;
  const mark = (s) => stepsOf(findItem('tasks', taskId)).map((x) => (x.id === stepId ? s : x));
  const { doneBy, doneAt, ...plain } = step;
  putLocal('tasks', { ...task, steps: mark(done ? { ...plain, done: true, doneBy: S.me, doneAt: new Date().toISOString() } : { ...plain, done: false }) });
  repaintAll();
  try {
    const { item } = await postItem({ op: 'tick-step', taskId, stepId, done });
    putLocal('tasks', item);
    repaintAll();
    return item;
  } catch (e) {
    stepFailed(taskId, e, () => { const cur = findItem('tasks', taskId); if (cur) putLocal('tasks', { ...cur, steps: mark(step) }); });
    throw e;
  }
}

// Replace the whole checklist with a shorter or re-ordered one (one step removed, or two swapped).
// The server only accepts the steps exactly as saved, so this always starts from the newest copy.
let stepQueue = Promise.resolve(); // checklist rewrites go one after another, never overlapping
function saveSteps(taskId, build) {
  const run = stepQueue.then(() => saveStepsNow(taskId, build));
  stepQueue = run.catch(() => {});
  return run;
}
async function saveStepsNow(taskId, build) {
  if (!(await refresh(true))) { toast("Couldn't check the latest list. Try again.", true); throw new Error('stale'); } // never act on an old copy
  const task = findItem('tasks', taskId);
  if (!task) { toast('Someone deleted this to-do.', true); throw new Error('gone'); }
  const before = stepsOf(task);
  const next = build(before);
  if (!next) throw new Error('nothing to do');
  putLocal('tasks', { ...task, steps: next });
  repaintAll();
  try {
    const { item } = await postItem({ collection: 'tasks', item: { id: taskId, steps: next }, patch: true, stepsWas: before.map((x) => x.id) });
    putLocal('tasks', item);
    repaintAll();
    return item;
  } catch (e) {
    if (e.status === 400) { // someone changed the checklist in between
      putLocal('tasks', { ...task, steps: before });
      repaintAll();
      toast('The checklist changed while you were looking. It is up to date now, so try again.', true);
      refresh(true);
    } else stepFailed(taskId, e, () => putLocal('tasks', { ...task, steps: before }));
    throw e;
  }
}

// Remove one step (after asking). The message has Undo, which adds the words back at the end of the list.
async function removeStep(taskId, stepId) {
  const step = stepsOf(findItem('tasks', taskId)).find((x) => x.id === stepId);
  if (!step) return;
  if (!confirm(`Remove this step?\n\n"${step.text}"`)) return;
  let gone = null;
  try {
    await saveSteps(taskId, (steps) => {
      gone = steps.find((x) => x.id === stepId);
      return gone ? steps.filter((x) => x.id !== stepId) : null; // someone else already removed it
    });
  } catch (e) { if (e.message === 'nothing to do') toast('That step was already removed.'); return; }
  toast('Step removed', false, { label: 'Undo', run: () => addStep(taskId, gone.text).then(() => toast('Step put back')).catch(() => {}) });
}

// Move a step up (-1) or down (+1).
async function moveStep(taskId, stepId, dir) {
  try {
    await saveSteps(taskId, (steps) => {
      const i = steps.findIndex((x) => x.id === stepId), j = i + dir;
      if (i < 0 || j < 0 || j >= steps.length) return null;
      const out = steps.slice();
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });
  } catch { /* the message is already shown */ }
}

// How sure a calendar item's date is: its saved status, 'nodate' with no date, and '' (no label) for a date with no status. Never a guess.
function eventStatus(e) { return e.status || (e.date ? '' : 'nodate'); }
// The name as the server saves it in updatedBy (see cleanWho in api/_lib.js).
const cleanName = (n) => String(n || 'Someone').replace(/[<>]/g, '').trim().slice(0, 40) || 'Someone';

function findItem(collection, id) { return (S[collection] || []).find((x) => x.id === id); }

// The Circles score. done = points ticked (bonus items left out), bonus = up to 2 per bonus window,
// listed = every regular point on the list (VE says 60, the list may add up to more).
function coeScore() {
  const pts = (c) => Number(c.points) || 0;
  const sum = (list) => list.reduce((n, c) => n + pts(c), 0);
  const regular = S.coe.filter((c) => !c.bonus);
  const bonusIn = (p) => Math.min(2, sum(S.coe.filter((c) => c.bonus && c.period === p && c.done)));
  return { done: sum(regular.filter((c) => c.done)), bonus: bonusIn('fall-bonus') + bonusIn('spring-bonus'), listed: sum(regular) };
}
