// Padel HQ: one shared calendar, a to-do list per department, and the Circles of Excellence tracker.
// Plain JavaScript on purpose, so any classmate can open this file and change it.
'use strict';

// ---------- Fixed lists ----------

const DEPTS = [
  { id: 'racquets', name: 'Racquets', blurb: 'The set in both sizes: sourcing, samples, the Gauge and inventory.' },
  { id: 'apparel', name: 'Apparel & Booth', blurb: 'The pair-kit uniform and the booth that waits for four.' },
  { id: 'tech', name: 'Technology', blurb: 'The free scorer, the website and store, and the tech competitions.' },
  { id: 'finance', name: 'Finance & Compliance', blurb: 'Prices, the Numbers Ledger, books, payroll and taxes, and the rules and trademark checks.' },
  { id: 'sales', name: 'Sales & Marketing', blurb: 'The catalog, buyers, the sales pitch, branding, video, newsletter and social.' },
  { id: 'firm', name: 'All-firm', blurb: "The business plan, Ms. Garrison's questions, trade shows, trips and people." },
];
const deptName = (id) => (DEPTS.find((d) => d.id === id) || { name: 'Unsorted' }).name;

const KINDS = { deadline: 'Deadline', competition: 'Competition', tradeshow: 'Trade show', trip: 'Field trip', event: 'Event', internal: 'Our milestone' };
const STATUSES = { confirmed: 'Confirmed', projected: 'Projected, confirm', teacher: 'From Ms. Garrison', internal: 'Our target', nodate: 'No date yet' };
const STATUS_HELP = {
  confirmed: "VE's own site lists this date for 2026-27.",
  projected: "Guessed from last season's date. Confirm with Ms. Garrison before relying on it.",
  teacher: 'Ms. Garrison gave us this in class.',
  internal: 'A target our firm set for itself. It can move.',
  nodate: 'No date found anywhere yet.',
};

const PERIODS = [
  { id: 1, name: 'Period 1', span: 'Aug to Oct 2026', ends: '2026-10-31' },
  { id: 2, name: 'Period 2', span: 'Nov 2026', ends: '2026-11-30' },
  { id: 3, name: 'Period 3', span: 'Dec 2026', ends: '2026-12-31' },
  { id: 4, name: 'Period 4', span: 'Jan to Feb 2027', ends: '2027-02-28' },
  { id: 5, name: 'Period 5', span: 'Mar to Apr 2027', ends: '2027-04-30' },
  { id: 6, name: 'Period 6', span: 'May 2027', ends: '2027-05-31' },
  { id: 'fall-bonus', name: 'Fall bonus', span: 'Aug 1 to Jan 31, up to 2 points', ends: '2027-01-31', bonus: true },
  { id: 'spring-bonus', name: 'Spring bonus', span: 'Feb 1 to May 31, up to 2 points', ends: '2027-05-31', bonus: true },
];
const COE_TOTAL = 60;
const TIERS = [{ id: 'bronze', name: 'Bronze', pct: 60 }, { id: 'silver', name: 'Silver', pct: 80 }, { id: 'gold', name: 'Gold', pct: 90 }];

// ---------- State ----------

const S = {
  events: [], tasks: [], coe: [], log: [],
  view: 'calendar',
  month: startOfMonth(new Date()),
  calMode: window.innerWidth < 760 ? 'list' : 'month',
  showTasks: false,
  deptFilter: 'all',
  taskFilter: 'open',
  showDone: false,
  me: store('phq_me') || '',
  loaded: false,
};

// ---------- Small helpers ----------

function store(k, v) {
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; }
}
const $ = (sel, el = document) => el.querySelector(sel);
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg, bad) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (bad ? ' bad' : '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = 'toast'), 2600);
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
function daysUntil(s) { const d = parseDay(s); return d ? Math.round((d - today()) / 86400000) : null; }
function fmt(s, opts = { weekday: 'short', month: 'short', day: 'numeric' }) { const d = parseDay(s); return d ? d.toLocaleDateString('en-US', opts) : 'No date'; }
function fmtRange(a, b) { return b && b !== a ? `${fmt(a)} to ${fmt(b)}` : fmt(a); }
function relDays(n) {
  if (n === null) return '';
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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function safeLink(src) {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return `<a href="${esc(src)}" target="_blank" rel="noopener noreferrer">${esc(src.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}</a>`;
  return esc(src);
}

// ---------- Server ----------

async function api(path, opts = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  });
  let body = {};
  try { body = await r.json(); } catch { /* empty */ }
  if (r.status === 401 && !path.includes('login')) { showLogin(); throw new Error(body.error || 'Please log in'); }
  if (!r.ok) throw new Error(body.error || 'Something went wrong');
  return body;
}

async function refresh(quiet) {
  try {
    const data = await api('/api/data');
    S.events = data.events; S.tasks = data.tasks; S.coe = data.coe; S.log = data.log;
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
    return saved;
  } catch (e) {
    if (before) list[i] = before; else S[collection] = list.filter((x) => x.id !== item.id);
    renderTabs(); render();
    toast("Didn't save: " + e.message, true);
    throw e;
  }
}

async function removeItem(collection, item) {
  if (!confirm(`Delete "${item.title}" for everyone? This can't be undone.`)) return false;
  try {
    await api(`/api/item?collection=${collection}&id=${encodeURIComponent(item.id)}&who=${encodeURIComponent(S.me)}`, { method: 'DELETE' });
    S[collection] = S[collection].filter((x) => x.id !== item.id);
    renderTabs(); render();
    toast('Deleted');
    return true;
  } catch (e) {
    toast("Didn't delete: " + e.message, true);
    return false;
  }
}

// ---------- Login ----------

function showLogin() {
  $('#app').hidden = true;
  $('#login').hidden = false;
  $('#login-name').value = S.me;
  setTimeout(() => $('#login-pass').focus(), 30);
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-error');
  err.textContent = '';
  const name = $('#login-name').value.trim();
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ passcode: $('#login-pass').value }) });
    S.me = name; store('phq_me', name);
    $('#login-pass').value = '';
    startApp();
  } catch (ex) {
    err.textContent = ex.message;
  }
});

function startApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#me-btn').textContent = S.me || 'Set your name';
  refresh();
}

$('#logout-btn').addEventListener('click', async () => {
  await api('/api/login', { method: 'DELETE' }).catch(() => {});
  showLogin();
});

$('#me-btn').addEventListener('click', () => {
  const n = prompt('Your first name (shows next to your changes):', S.me);
  if (n && n.trim()) { S.me = n.trim().slice(0, 40); store('phq_me', S.me); $('#me-btn').textContent = S.me; }
});

// ---------- Tabs ----------

function openCount(dept) { return S.tasks.filter((t) => t.dept === dept && !t.done).length; }

function renderTabs() {
  const tab = (id, label, count) =>
    `<button class="tab" role="tab" data-view="${id}" aria-selected="${S.view === id}">${esc(label)}${count ? `<span class="count">${count}</span>` : ''}</button>`;
  $('#tabs').innerHTML =
    tab('calendar', 'Calendar') +
    tab('coe', 'Circles of Excellence') +
    '<span class="tab-sep"></span>' +
    DEPTS.map((d) => tab(d.id, d.name, openCount(d.id))).join('') +
    '<span class="tab-sep"></span>' +
    tab('activity', 'Activity');
}

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]');
  if (!b) return;
  S.view = b.dataset.view;
  location.hash = S.view;
  renderTabs(); render();
  $('#main').focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
});

window.addEventListener('hashchange', () => {
  const v = location.hash.slice(1);
  if (v && v !== S.view && isView(v)) { S.view = v; renderTabs(); render(); }
});
function isView(v) { return ['calendar', 'coe', 'activity'].includes(v) || DEPTS.some((d) => d.id === v); }

// ---------- Render router ----------

function render() {
  const main = $('#main');
  if (!S.loaded) { main.innerHTML = '<p class="empty">Loading…</p>'; return; }
  if (S.view === 'calendar') main.innerHTML = viewCalendar();
  else if (S.view === 'coe') main.innerHTML = viewCoe();
  else if (S.view === 'activity') main.innerHTML = viewActivity();
  else main.innerHTML = viewDept(S.view);
}

// ---------- Calendar ----------

function calendarItems() {
  const items = S.events
    .filter((e) => S.deptFilter === 'all' || e.dept === S.deptFilter)
    .map((e) => ({ type: 'events', id: e.id, title: e.title, date: e.date, end: e.end, kind: e.kind, status: e.status, dept: e.dept }));
  if (S.showTasks) {
    for (const t of S.tasks) {
      if (!t.due || (S.deptFilter !== 'all' && t.dept !== S.deptFilter)) continue;
      items.push({ type: 'tasks', id: t.id, title: t.title, date: t.due, kind: 'task', dept: t.dept, done: t.done });
    }
  }
  return items;
}

function viewCalendar() {
  const items = calendarItems();
  const upcoming = S.events
    .filter((e) => e.date && daysUntil(e.end || e.date) >= 0 && e.kind !== 'internal')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const head = `
    <div class="page-head">
      <div><h1>Calendar</h1><p>Deadlines, competitions, trade shows and trips from now to June. Click anything for the details.</p></div>
      <button class="btn btn-primary" data-act="new-event">+ Add to calendar</button>
    </div>
    ${upcoming.length ? `<div class="nextup">${upcoming.map((e) => {
      const n = daysUntil(e.date);
      return `<button class="nu ${n <= 7 ? 'urgent' : ''}" data-open="events:${esc(e.id)}">
        <span class="nu-days">${n <= 0 ? 'Now' : n}${n > 0 ? `<small>day${n === 1 ? '' : 's'}</small>` : ''}</span>
        <span class="nu-title">${esc(e.title)}</span>
        <span class="nu-date">${fmt(e.date)} · <span class="chip k-${esc(e.kind)}">${esc(KINDS[e.kind] || e.kind)}</span></span>
      </button>`;
    }).join('')}</div>` : ''}
    <div class="page-head" style="margin-bottom:12px">
      <div class="cal-nav" ${S.calMode === 'list' ? 'style="visibility:hidden"' : ''}>
        <button class="btn btn-sm" data-act="prev" aria-label="Previous month">‹</button>
        <h2>${S.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <button class="btn btn-sm" data-act="next" aria-label="Next month">›</button>
        <button class="btn btn-ghost btn-sm" data-act="today">Today</button>
      </div>
      <div class="toolbar">
        <div class="seg" role="group" aria-label="View">
          <button data-act="mode-month" aria-pressed="${S.calMode === 'month'}">Month</button>
          <button data-act="mode-list" aria-pressed="${S.calMode === 'list'}">List</button>
        </div>
        <select class="compact" data-act="dept-filter" aria-label="Department">
          <option value="all">All departments</option>
          ${DEPTS.map((d) => `<option value="${d.id}" ${S.deptFilter === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
        </select>
        <label class="check"><input type="checkbox" data-act="show-tasks" ${S.showTasks ? 'checked' : ''}> Show to-dos</label>
      </div>
    </div>`;

  const body = S.calMode === 'month' ? monthGrid(items) : agenda(items);
  const legend = `<div class="legend">${Object.entries(KINDS).map(([k, v]) => `<span class="chip k-${k}">${v}</span>`).join('')}${S.showTasks ? '<span class="chip k-task">To-do</span>' : ''}</div>`;
  return head + body + legend;
}

function monthGrid(items) {
  const first = S.month;
  const start = new Date(first); start.setDate(1 - first.getDay());
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const cells = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
  const byDay = {};
  for (const it of items) {
    if (!it.date) continue;
    const a = parseDay(it.date), b = parseDay(it.end) || a;
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) (byDay[dayKey(d)] ||= []).push(it);
  }
  const t = dayKey(today());
  let html = '<div class="month"><div class="dow">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<div>${d}</div>`).join('') + '</div><div class="weeks">';
  for (let i = 0; i < cells; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = dayKey(d);
    // One-day calendar items first, then multi-day windows, then to-dos.
    const rank = (it) => (it.type === 'tasks' ? 2 : it.end && it.end !== it.date ? 1 : 0);
    const list = (byDay[k] || []).sort((a, b) => rank(a) - rank(b));
    const shown = list.slice(0, 3);
    html += `<div class="day ${d.getMonth() !== first.getMonth() ? 'out' : ''} ${k === t ? 'today' : ''}">
      <span class="dnum">${d.getDate()}</span>
      ${shown.map((it) => `<button class="ev k-${esc(it.kind)} ${it.done ? 'done' : ''}" data-open="${it.type}:${esc(it.id)}" title="${esc(it.title)}">${esc(it.title)}</button>`).join('')}
      ${list.length > 3 ? `<button class="more" data-act="day" data-day="${k}">+${list.length - 3} more</button>` : ''}
    </div>`;
  }
  return html + '</div></div>';
}

function agenda(items) {
  const t = today();
  const dated = items.filter((i) => i.date).sort((a, b) => a.date.localeCompare(b.date));
  const undated = S.events.filter((e) => !e.date && (S.deptFilter === 'all' || e.dept === S.deptFilter));
  // Show from the start of last month so recent things are still visible.
  const from = dayKey(new Date(t.getFullYear(), t.getMonth() - 1, 1));
  let html = '', cur = '';
  for (const it of dated) {
    if ((it.end || it.date) < from) continue;
    const m = fmt(it.date, { month: 'long', year: 'numeric' });
    if (m !== cur) { html += `<div class="agenda-month">${m}</div>`; cur = m; }
    html += agendaRow(it);
  }
  if (undated.length) {
    html += '<div class="agenda-month">No date yet · ask Ms. Garrison</div>';
    html += undated.map((e) => agendaRow({ type: 'events', ...e })).join('');
  }
  return html || '<p class="empty">Nothing on the calendar yet.</p>';
}

function agendaRow(it) {
  const d = parseDay(it.date);
  const past = d && daysUntil(it.end || it.date) < 0;
  return `<button class="row ${past || it.done ? 'past' : ''}" data-open="${it.type}:${esc(it.id)}">
    <span class="datebox">${d ? `<b>${d.getDate()}</b><span>${d.toLocaleDateString('en-US', { weekday: 'short' })}</span>` : '<span>TBD</span>'}</span>
    <span>
      <span class="row-title">${esc(it.title)}</span>
      <span class="row-meta">
        <span class="chip k-${esc(it.kind)}">${it.kind === 'task' ? 'To-do' : esc(KINDS[it.kind] || it.kind)}</span>
        ${it.status ? `<span class="chip s-${esc(it.status)}">${esc(STATUSES[it.status] || it.status)}</span>` : ''}
        ${it.end && it.end !== it.date ? `<span class="chip k-event">to ${fmt(it.end, { month: 'short', day: 'numeric' })}</span>` : ''}
        ${d ? `<span class="due">${relDays(daysUntil(it.date))}</span>` : ''}
      </span>
    </span>
    <span class="row-dept">${esc(deptName(it.dept))}</span>
  </button>`;
}

// ---------- Department to-dos ----------

function viewDept(id) {
  const dept = DEPTS.find((d) => d.id === id);
  const all = S.tasks.filter((t) => t.dept === id);
  const done = all.filter((t) => t.done);
  const pct = all.length ? Math.round((done.length / all.length) * 100) : 0;
  let list = all;
  if (S.taskFilter === 'mine') list = list.filter((t) => S.me && (t.owner || '').toLowerCase().includes(S.me.toLowerCase()));
  if (S.taskFilter === 'unassigned') list = list.filter((t) => !t.owner);
  const open = list.filter((t) => !t.done).sort(byDue);
  const groups = [
    { title: 'Overdue', cls: 'red', items: open.filter((t) => t.due && daysUntil(t.due) < 0) },
    { title: 'Next 2 weeks', items: open.filter((t) => t.due && daysUntil(t.due) >= 0 && daysUntil(t.due) <= 14) },
    { title: 'Later', items: open.filter((t) => t.due && daysUntil(t.due) > 14) },
    { title: 'No date yet', items: open.filter((t) => !t.due) },
  ];
  const doneList = list.filter((t) => t.done).sort(byDue);

  return `
    <div class="page-head">
      <div><h1>${esc(dept.name)}</h1><p>${esc(dept.blurb)}</p></div>
      <div class="dept-stats"><div class="bar"><i style="width:${pct}%"></i></div><span class="stat-text">${done.length} of ${all.length} done</span></div>
    </div>
    <form class="addbar" data-form="quick-task">
      <input type="text" name="title" placeholder="Add a to-do for ${esc(dept.name)}…" maxlength="160" aria-label="New to-do">
      <button class="btn btn-primary" type="submit">Add</button>
    </form>
    <div class="toolbar" style="margin-bottom:6px">
      <div class="seg" role="group" aria-label="Filter">
        <button data-act="tf-open" aria-pressed="${S.taskFilter === 'open'}">Everything</button>
        <button data-act="tf-mine" aria-pressed="${S.taskFilter === 'mine'}">Mine</button>
        <button data-act="tf-unassigned" aria-pressed="${S.taskFilter === 'unassigned'}">Unassigned</button>
      </div>
    </div>
    ${all.length === 0 ? '<p class="empty">No to-dos here yet. Add the first one above.</p>' : ''}
    ${groups.filter((g) => g.items.length).map((g) => `
      <div class="group-title ${g.cls || ''}">${g.title} · ${g.items.length}</div>
      ${g.items.map(taskRow).join('')}`).join('')}
    ${doneList.length ? `
      <div class="group-title">Done · ${doneList.length} <button class="btn btn-ghost btn-sm" data-act="toggle-done">${S.showDone ? 'Hide' : 'Show'}</button></div>
      ${S.showDone ? doneList.map(taskRow).join('') : ''}` : ''}`;
}

function byDue(a, b) { return (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title); }

function taskRow(t) {
  const n = daysUntil(t.due);
  const dueCls = t.done ? '' : n !== null && n < 0 ? 'overdue' : n !== null && n <= 7 ? 'soon' : '';
  const coe = t.coe && S.coe.find((c) => c.id === t.coe);
  return `<div class="task ${t.done ? 'is-done' : ''}">
    <button class="tick" role="checkbox" aria-checked="${!!t.done}" aria-label="Done: ${esc(t.title)}" data-tick="tasks:${esc(t.id)}"></button>
    <button class="task-main" data-open="tasks:${esc(t.id)}">
      <div class="task-title">${esc(t.title)}</div>
      ${t.desc ? `<div class="task-desc">${esc(t.desc)}</div>` : ''}
    </button>
    <div class="task-side">
      ${t.due ? `<span class="due ${dueCls}">${fmt(t.due, { month: 'short', day: 'numeric' })} · ${relDays(n)}</span>` : ''}
      <span class="chip owner ${t.owner ? '' : 'none'}">${esc(t.owner || 'Unassigned')}</span>
      ${coe ? `<span class="chip coe-badge" title="Counts toward Circles of Excellence">CoE +${coe.points}</span>` : ''}
    </div>
  </div>`;
}

// ---------- Circles of Excellence ----------

function coeScore() {
  const standard = S.coe.filter((c) => !c.bonus && c.done).reduce((s, c) => s + (Number(c.points) || 0), 0);
  const cap = (p) => Math.min(2, S.coe.filter((c) => c.bonus && c.period === p && c.done).reduce((s, c) => s + (Number(c.points) || 0), 0));
  return { standard, bonus: cap('fall-bonus') + cap('spring-bonus') };
}

function viewCoe() {
  const { standard, bonus } = coeScore();
  const pct = Math.round((standard / COE_TOTAL) * 100);
  const next = TIERS.find((t) => pct < t.pct);
  const need = next ? Math.ceil((next.pct / 100) * COE_TOTAL) - standard : 0;
  const toGold = Math.max(0, Math.ceil(0.9 * COE_TOTAL) - standard);
  const msg = !next ? 'Gold level. Keep every box checked through May.'
    : next.id === 'gold' ? `${toGold} more point${toGold === 1 ? '' : 's'} to Gold.`
    : `${toGold} more points to Gold (${need} to ${next.name} along the way).`;
  const tiers = TIERS.map((t) => `<span class="tier ${t.id}" style="left:${t.pct}%">${t.name}<small>${Math.ceil((t.pct / 100) * COE_TOTAL)}</small></span>`).join('');

  return `
    <div class="page-head">
      <div><h1>Circles of Excellence</h1><p>VE's point checklist for the whole year. Gold means finishing 90% or more. This is our goal: every point, every period.</p></div>
      <a class="btn btn-sm" href="https://veinternational.org/circles-of-excellence/" target="_blank" rel="noopener noreferrer">VE's official page ↗</a>
    </div>
    <div class="coe-hero">
      <div class="coe-score"><b>${standard}</b><span>of ${COE_TOTAL} points · ${pct}%</span></div>
      <div>
        <div class="coe-track"><div class="coe-fill" style="width:${Math.min(100, pct)}%"></div>${tiers}</div>
        <p class="coe-msg">${msg}</p>
        <p class="coe-note">Bonus points: ${bonus} of 4. Check an item off when it is submitted or finished, not when it is started. Whether VE counts bonus points toward the percentage is unverified, so this bar uses the 60 regular points only. Heads up: VE's page says the year totals 60, but its listed items add up to 61 (Period 5 is labeled 16 and its items add to 17). Ms. Garrison should confirm which is right.</p>
      </div>
    </div>
    ${S.coe.length === 0 ? '<p class="empty">The checklist is empty. Load the starter data from the Activity tab.</p>' : ''}
    ${PERIODS.map((p) => {
      const items = S.coe.filter((c) => String(c.period) === String(p.id)).sort(byDue);
      if (!items.length) return '';
      const got = items.filter((c) => c.done).reduce((s, c) => s + (Number(c.points) || 0), 0);
      const max = items.reduce((s, c) => s + (Number(c.points) || 0), 0);
      const left = daysUntil(p.ends);
      const missed = left < 0 && got < max && !p.bonus;
      return `<section class="period ${missed ? 'closed-miss' : ''}">
        <div class="period-head"><h3>${p.name} · ${p.span}</h3>
          <span>${got} of ${p.bonus ? 'up to 2' : max} pts · ${left < 0 ? 'closed' : 'closes ' + fmt(p.ends, { month: 'short', day: 'numeric' }) + ' (' + relDays(left) + ')'}</span></div>
        ${items.map((c) => `<div class="coe-item ${c.done ? 'is-done' : ''}">
          <button class="tick" role="checkbox" aria-checked="${!!c.done}" aria-label="Done: ${esc(c.title)}" data-tick="coe:${esc(c.id)}"></button>
          <button class="task-main" data-open="coe:${esc(c.id)}">
            <div class="task-title">${esc(c.title)}</div>
            <div class="task-desc">${esc(deptName(c.dept))}${c.due && !p.bonus ? ' · due ' + fmt(c.due, { month: 'short', day: 'numeric' }) : ''}</div>
          </button>
          <span class="pts">${Number(c.points) ? '+' + c.points : '0 pts'}</span>
        </div>`).join('')}
      </section>`;
    }).join('')}`;
}

// ---------- Activity + import ----------

function viewActivity() {
  const empty = !S.events.length && !S.tasks.length && !S.coe.length;
  const importPanel = `<div class="panel">
      <h3>Load starter data</h3>
      <p>Adds the researched calendar, the to-dos and the Circles of Excellence checklist from a <code>seed.json</code> file. It only adds items that aren't here yet, so it never overwrites anyone's changes.</p>
      <input type="file" accept="application/json,.json" data-act="import" aria-label="Choose seed.json">
    </div>`;
  return `
    <div class="page-head"><div><h1>Activity</h1><p>Every change anyone makes, newest first.</p></div></div>
    ${empty ? importPanel : ''}
    ${S.log.length ? `<div class="log">${S.log.map((l) => `<div class="log-row">
        <span><b>${esc(l.who)}</b> ${esc(l.action)} ${l.collection === 'all' ? '' : '“'}${esc(l.title)}${l.collection === 'all' ? '' : '”'}</span>
        <time datetime="${esc(l.t)}">${esc(ago(l.t))}</time></div>`).join('')}</div>`
      : '<p class="empty">No changes yet.</p>'}
    ${empty ? '' : importPanel}`;
}

async function importFile(file) {
  try {
    const data = JSON.parse(await file.text());
    const r = await api('/api/import', { method: 'POST', body: JSON.stringify({ data, who: S.me }) });
    toast(`Added ${r.added} items${r.skipped ? `, skipped ${r.skipped} already here` : ''}`);
    await refresh();
  } catch (e) {
    toast('Import failed: ' + e.message, true);
  }
}

// ---------- Drawer (details + edit) ----------

let drawerState = null;
function drawerIsEditing() { return drawerState && drawerState.editing; }

function openDrawer(collection, id, editing = false) {
  const item = id ? S[collection].find((x) => x.id === id) : null;
  if (id && !item) return;
  drawerState = { collection, item, editing: editing || !item };
  paintDrawer();
  $('#scrim').hidden = false;
  $('#drawer').hidden = false;
  setTimeout(() => ($('#drawer input[name=title]') || $('#drawer .xbtn')).focus(), 30);
}

function closeDrawer() {
  drawerState = null;
  $('#drawer').hidden = true;
  $('#scrim').hidden = true;
  render();
}

function fieldsFor(collection) {
  const deptOpts = DEPTS.map((d) => [d.id, d.name]);
  if (collection === 'events') return [
    { k: 'title', label: 'Title', type: 'text' },
    { k: 'date', label: 'Date', type: 'date', half: true }, { k: 'end', label: 'Ends (if more than one day)', type: 'date', half: true },
    { k: 'kind', label: 'What is it', type: 'select', options: Object.entries(KINDS), half: true },
    { k: 'status', label: 'How sure is the date', type: 'select', options: Object.entries(STATUSES), half: true },
    { k: 'dept', label: 'Department', type: 'select', options: deptOpts },
    { k: 'desc', label: 'Description', type: 'textarea' },
    { k: 'source', label: 'Source (link or where it came from)', type: 'text' },
  ];
  if (collection === 'tasks') return [
    { k: 'title', label: 'To-do', type: 'text' },
    { k: 'desc', label: 'Description: what done looks like', type: 'textarea' },
    { k: 'due', label: 'Due', type: 'date', half: true }, { k: 'owner', label: 'Who owns it', type: 'text', half: true },
    { k: 'dept', label: 'Department', type: 'select', options: deptOpts },
  ];
  return [
    { k: 'title', label: 'Checklist item', type: 'text' },
    { k: 'due', label: 'Due', type: 'date', half: true }, { k: 'dept', label: 'Department', type: 'select', options: deptOpts, half: true },
    { k: 'desc', label: 'What it takes to earn the point', type: 'textarea' },
    { k: 'notes', label: 'Our notes (proof, links, who submitted)', type: 'textarea' },
  ];
}

function fieldHtml(f, v) {
  const val = v ?? '';
  if (f.type === 'textarea') return `<label>${esc(f.label)}<textarea name="${f.k}">${esc(val)}</textarea></label>`;
  if (f.type === 'select') return `<label>${esc(f.label)}<select name="${f.k}">${f.options.map(([o, l]) => `<option value="${esc(o)}" ${o === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  return `<label>${esc(f.label)}<input type="${f.type}" name="${f.k}" value="${esc(val)}" ${f.k === 'title' ? 'required maxlength="160"' : 'maxlength="400"'}></label>`;
}

function paintDrawer() {
  const { collection, item, editing } = drawerState;
  const d = $('#drawer');
  const kindWord = collection === 'events' ? 'calendar item' : collection === 'tasks' ? 'to-do' : 'checklist item';

  if (editing) {
    const defaults = item || (collection === 'events'
      ? { kind: 'deadline', status: 'internal', dept: S.deptFilter !== 'all' ? S.deptFilter : 'firm', date: dayKey(today()) }
      : { dept: isView(S.view) && DEPTS.some((x) => x.id === S.view) ? S.view : 'firm' });
    const fields = fieldsFor(collection);
    let rows = '', i = 0;
    while (i < fields.length) {
      if (fields[i].half && fields[i + 1]?.half) { rows += `<div class="two">${fieldHtml(fields[i], defaults[fields[i].k])}${fieldHtml(fields[i + 1], defaults[fields[i + 1].k])}</div>`; i += 2; }
      else { rows += fieldHtml(fields[i], defaults[fields[i].k]); i++; }
    }
    d.innerHTML = `
      <div class="drawer-head"><h2 id="drawer-title">${item ? 'Edit ' + kindWord : 'New ' + kindWord}</h2><button class="xbtn" data-act="close" aria-label="Close">×</button></div>
      <form class="drawer-body form" id="edit-form">${rows}</form>
      <div class="drawer-foot">
        ${item && collection !== 'coe' ? '<button class="btn btn-danger" data-act="delete">Delete</button>' : '<span></span>'}
        <span class="toolbar"><button class="btn" data-act="${item ? 'cancel-edit' : 'close'}">Cancel</button><button class="btn btn-primary" data-act="save">Save</button></span>
      </div>`;
    return;
  }

  const facts = [];
  if (collection === 'events') {
    facts.push(['When', `${fmtRange(item.date, item.end)}${item.date ? ' · ' + relDays(daysUntil(item.date)) : ''}`]);
    facts.push(['What', `<span class="chip k-${esc(item.kind)}">${esc(KINDS[item.kind] || item.kind)}</span>`]);
    facts.push(['Date is', `<span class="chip s-${esc(item.status)}">${esc(STATUSES[item.status] || item.status)}</span> <span class="meta">${esc(STATUS_HELP[item.status] || '')}</span>`]);
  } else {
    facts.push(['Due', item.due ? `${fmt(item.due)} · ${relDays(daysUntil(item.due))}` : 'No date yet']);
    if (collection === 'tasks') facts.push(['Owner', esc(item.owner || 'Unassigned')]);
    if (collection === 'coe') facts.push(['Points', esc(item.points) + (item.bonus ? ' (bonus)' : '')]);
    facts.push(['Status', item.done ? 'Done' : 'Not done']);
  }
  facts.push(['Department', esc(deptName(item.dept))]);
  if (item.source) facts.push(['Source', safeLink(item.source)]);
  const linked = collection === 'coe' ? S.tasks.filter((t) => t.coe === item.id) : [];
  const coeLink = collection === 'tasks' && item.coe && S.coe.find((c) => c.id === item.coe);

  d.innerHTML = `
    <div class="drawer-head"><h2 id="drawer-title">${esc(item.title)}</h2><button class="xbtn" data-act="close" aria-label="Close">×</button></div>
    <div class="drawer-body">
      <dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      <p class="desc">${esc(item.desc || 'No description yet. Click Edit to add one.')}</p>
      ${item.notes ? `<h3 class="meta">Our notes</h3><p class="desc">${esc(item.notes)}</p>` : ''}
      ${coeLink ? `<p class="meta">Counts toward Circles of Excellence: <a href="#" data-open="coe:${esc(coeLink.id)}">${esc(coeLink.title)}</a> (+${coeLink.points})</p>` : ''}
      ${linked.length ? `<p class="meta">Linked to-dos: ${linked.map((t) => `<a href="#" data-open="tasks:${esc(t.id)}">${esc(t.title)}</a>${t.done ? ' ✓' : ''}`).join(', ')}</p>` : ''}
      ${item.updatedBy ? `<p class="meta">Last changed by ${esc(item.updatedBy)}, ${esc(ago(item.updatedAt))}</p>` : ''}
    </div>
    <div class="drawer-foot">
      ${collection !== 'events' ? `<button class="btn ${item.done ? '' : 'btn-primary'}" data-act="drawer-tick">${item.done ? 'Mark not done' : 'Mark done'}</button>` : '<span></span>'}
      <button class="btn" data-act="edit">Edit</button>
    </div>`;
}

async function saveDrawer() {
  const { collection, item } = drawerState;
  const form = $('#edit-form');
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  for (const k of Object.keys(data)) data[k] = data[k].trim();
  if (collection === 'events') { data.end = data.end || null; data.date = data.date || null; if (!data.date) data.status = 'nodate'; }
  if ('due' in data) data.due = data.due || null;
  const next = item ? { ...item, ...data } : { id: newId(data.title), done: false, ...(collection === 'tasks' ? { coe: null } : {}), ...data };
  try {
    const saved = await saveItem(collection, next);
    toast('Saved');
    drawerState = { collection, item: saved, editing: false };
    paintDrawer();
  } catch { /* toast already shown */ }
}

// ---------- One click handler for everything ----------

document.addEventListener('click', async (e) => {
  const open = e.target.closest('[data-open]');
  if (open) {
    e.preventDefault();
    const [c, id] = open.dataset.open.split(':');
    openDrawer(c, id);
    return;
  }
  const tick = e.target.closest('[data-tick]');
  if (tick) {
    const [c, id] = tick.dataset.tick.split(':');
    const item = S[c].find((x) => x.id === id);
    if (item) saveItem(c, { ...item, done: !item.done }).then((s) => s.done && toast('Nice. Checked off.')).catch(() => {});
    return;
  }
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  switch (act) {
    case 'prev': S.month = new Date(S.month.getFullYear(), S.month.getMonth() - 1, 1); render(); break;
    case 'next': S.month = new Date(S.month.getFullYear(), S.month.getMonth() + 1, 1); render(); break;
    case 'today': S.month = startOfMonth(new Date()); render(); break;
    case 'mode-month': S.calMode = 'month'; render(); break;
    case 'mode-list': S.calMode = 'list'; render(); break;
    case 'day': S.calMode = 'list'; render(); break;
    case 'new-event': openDrawer('events', null, true); break;
    case 'tf-open': S.taskFilter = 'open'; render(); break;
    case 'tf-mine': S.taskFilter = 'mine'; if (!S.me) toast('Set your name at the top right first'); render(); break;
    case 'tf-unassigned': S.taskFilter = 'unassigned'; render(); break;
    case 'toggle-done': S.showDone = !S.showDone; render(); break;
    case 'close': closeDrawer(); break;
    case 'edit': drawerState.editing = true; paintDrawer(); break;
    case 'cancel-edit': drawerState.editing = false; paintDrawer(); break;
    case 'save': saveDrawer(); break;
    case 'delete': if (await removeItem(drawerState.collection, drawerState.item)) closeDrawer(); break;
    case 'drawer-tick': {
      const { collection, item } = drawerState;
      try { const s = await saveItem(collection, { ...item, done: !item.done }); drawerState.item = s; paintDrawer(); } catch { /* shown */ }
      break;
    }
  }
});

document.addEventListener('change', (e) => {
  const act = e.target.dataset?.act;
  if (act === 'dept-filter') { S.deptFilter = e.target.value; render(); }
  if (act === 'show-tasks') { S.showTasks = e.target.checked; render(); }
  if (act === 'import' && e.target.files[0]) importFile(e.target.files[0]);
});

document.addEventListener('submit', async (e) => {
  if (e.target.dataset.form === 'quick-task') {
    e.preventDefault();
    const input = e.target.elements.title;
    const title = input.value.trim();
    if (!title) return;
    input.value = '';
    try {
      await saveItem('tasks', { id: newId(title), dept: S.view, title, desc: '', due: null, owner: '', done: false, coe: null, source: '' });
      toast('Added. Click it to add a description, owner and due date.');
    } catch { input.value = title; }
  }
  if (e.target.id === 'edit-form') { e.preventDefault(); saveDrawer(); }
});

$('#scrim').addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawerState) closeDrawer(); });

// Stay in sync with everyone else: refresh every 30 seconds and whenever the tab comes back into view.
setInterval(() => { if (!document.hidden && !$('#app').hidden) refresh(true); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#app').hidden) refresh(true); });

// ---------- Start ----------

(async function boot() {
  const v = location.hash.slice(1);
  if (isView(v)) S.view = v;
  try {
    const s = await api('/api/login');
    if (s.loggedIn) startApp(); else showLogin();
  } catch {
    showLogin();
  }
})();
