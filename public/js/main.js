// Login, tabs, routing, every click, keyboard, and startup.
'use strict';

// ---------- Login ----------

// Where a day falls in the school year, as a percent: the lock screen's ball sits at today.
const SEASON = { start: '2026-09-01', end: '2027-06-15' };
function pos(s) {
  const a = parseDay(SEASON.start), b = parseDay(SEASON.end), d = parseDay(s);
  return Math.max(0, Math.min(100, ((d - a) / (b - a)) * 100));
}

function showLogin() {
  if (drawerState) { drawerState = null; $('#drawer').hidden = true; $('#scrim').hidden = true; $('#app').inert = false; document.body.style.overflow = ''; }
  $('#app').hidden = true;
  $('#login').hidden = false;
  $('.route-line').style.setProperty('--at', pos(todayKey()).toFixed(1) + '%'); // the ball sits where today falls in the season
  $('#login-name').value = S.me;
  setTimeout(() => $('#login-pass').focus(), 30);
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-error');
  err.textContent = '';
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Checking…';
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ passcode: $('#login-pass').value }) });
    S.me = $('#login-name').value.trim().slice(0, 40); store('phq_me', S.me);
    $('#login-pass').value = '';
    startApp();
  } catch (ex) {
    err.textContent = ex.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Open the board';
  }
});

function paintMe() {
  $('#me-btn span').textContent = S.me || 'Set your name';
}

function startApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  paintMe();
  S.loadError = null;
  render();
  refresh();
}

$('#logout-btn').addEventListener('click', async () => {
  await api('/api/login', { method: 'DELETE' }).catch(() => {});
  showLogin();
});

// Name box (instead of the browser's prompt)
$('#me-btn').addEventListener('click', () => {
  const dlg = $('#name-dialog');
  $('#name-input').value = S.me;
  dlg.showModal();
  $('#name-input').select();
});
$('#name-cancel').addEventListener('click', () => $('#name-dialog').close());
$('#name-form').addEventListener('submit', (e) => {
  const n = $('#name-input').value.trim().slice(0, 40);
  if (!n) { e.preventDefault(); $('#name-input').focus(); return; }
  S.me = n; store('phq_me', n); paintMe(); render();
  toast(`Your changes will show as ${n}`);
});

// The Add page's form. The form is cleared before saving so a second click can't add it twice;
// the team stays picked for the next one.
async function addTask(form) {
  const f = form.elements;
  const title = f.title.value.trim();
  if (!title) { f.title.setCustomValidity('Give it a title.'); f.title.reportValidity(); f.title.setCustomValidity(''); return; }
  if (!f.due.checkValidity()) { f.due.reportValidity(); return; }
  const data = { title, dept: f.dept.value, due: f.due.value || null, owner: f.owner.value.trim(), desc: f.desc.value.trim() };
  S.addTeam = store('phq_add_team', data.dept);
  for (const k of ['title', 'due', 'owner', 'desc']) f[k].value = '';
  try {
    await createItem('tasks', { id: newId(title), done: false, createdAt: new Date().toISOString(), ...data });
    toast(`Added to ${dept(data.dept).name}`);
    $('#add-title')?.focus();
  } catch {
    // The save failed: put back what they typed (the next repaint of the Add page fills it in).
    S.addDraft = data;
    if (S.view === 'add') { render(); $('#add-title')?.focus(); }
  }
}

// ---------- Focus that survives repaints ----------
// The page repaints often. Before it does, remember what had focus; afterwards, put focus back on the same thing.

function focusKey(el) {
  if (!el || el === document.body) return null;
  if (el.id) return '#' + CSS.escape(el.id);
  for (const a of ['data-open', 'data-tick', 'data-day']) if (el.hasAttribute(a)) return `${el.tagName.toLowerCase()}${el.classList[0] ? '.' + CSS.escape(el.classList[0]) : ''}[${a}="${CSS.escape(el.getAttribute(a))}"]`;
  if (el.dataset.act) return `[data-act="${CSS.escape(el.dataset.act)}"]` + (el.dataset.v ? `[data-v="${CSS.escape(el.dataset.v)}"]` : '') + (el.dataset.id ? `[data-id="${CSS.escape(el.dataset.id)}"]` : '');
  if (el.matches('a[href]')) return `a[href="${CSS.escape(el.getAttribute('href'))}"]`;
  return null;
}
function restoreFocus(key) {
  if (!key) return;
  const el = document.querySelector(key);
  if (el) el.focus({ preventScroll: true });
}

// ---------- Tabs and routing ----------

const isView = (v) => ['board', 'month', 'add'].includes(v) || DEPTS.some((d) => d.id === v);

function renderTabs() {
  const tab = (id, label, ic = '', count = 0, title = '') =>
    `<a class="tab" href="#${id}" ${S.view === id ? 'aria-current="page"' : ''} ${title ? `title="${esc(title)}"` : ''}>${ic ? icon(ic) : ''}${esc(label)}${count ? `<span class="count">${count}</span>` : ''}</a>`;
  $('#tabs').innerHTML =
    tab('board', 'Board', 'board') +
    tab('month', 'Month', 'grid') +
    '<span class="tab-sep" aria-hidden="true"></span>' +
    DEPTS.map((d) => {
      const open = S.tasks.filter((t) => t.dept === d.id && !t.done).length;
      return tab(d.id, d.name, '', open, `${open} open to-dos`);
    }).join('') +
    '<span class="tab-sep" aria-hidden="true"></span>' +
    tab('add', 'Add to-do', 'plus', 0, 'Add a to-do for any team');
}

function route() {
  const v = (location.hash.slice(1) || 'board').split('/')[0];
  const next = isView(v) ? v : 'board';
  const changed = next !== S.view;
  if (changed && drawerState) closeDrawer();
  S.view = next;
  renderTabs(); render();
  if (changed) { window.scrollTo({ top: 0 }); $('#main').focus({ preventScroll: true }); }
  if (changed) enterMain();
  $('#tabs [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// A new page rises in once. The class comes off right after, so background repaints never replay it.
function enterMain() {
  const m = $('#main');
  m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter');
  clearTimeout(enterMain.t); enterMain.t = setTimeout(() => m.classList.remove('enter'), 600);
}
window.addEventListener('hashchange', route);

function render() {
  const main = $('#main');
  if (!S.loaded) {
    const head = `<div class="board-head"><h1 class="board-title"><span class="ball" aria-hidden="true"></span>Departures</h1></div>`;
    main.innerHTML = S.loadError
      ? `<div class="board board-error" role="alert">${head}<div class="board-empty"><p class="err-title">The board didn't load</p><p class="err-msg">${esc(S.loadError)}</p><button class="btn btn-sm" data-act="retry">Try again</button></div></div>`
      : `<div class="board" aria-busy="true">${head}<p class="sr">Loading the board…</p><ol class="rows skeleton" aria-hidden="true">${'<li class="dep"><span></span><span class="sk sk-when"></span><span class="sk sk-in"></span><span class="sk sk-title"></span></li>'.repeat(6)}</ol></div>`;
    return;
  }
  // Remember focus and anything half-typed on the Add page, then repaint, then put them back.
  const fk = focusKey(document.activeElement);
  const drafts = ['add-title', 'add-dept', 'add-due', 'add-owner', 'add-desc'].map((id) => {
    const el = document.getElementById(id);
    return el && { id, value: el.value, at: el.selectionStart };
  }).filter((k) => k && k.value);
  const viewBefore = render.lastView;

  if (S.view === 'board') main.innerHTML = viewBoard();
  else if (S.view === 'month') main.innerHTML = viewMonth();
  else if (S.view === 'add') main.innerHTML = viewAdd();
  else main.innerHTML = viewTeam(S.view);
  render.lastView = S.view;

  for (const k of drafts) {
    if (viewBefore !== S.view) continue; // only a repaint of the same page keeps what was typed
    const el = document.getElementById(k.id);
    if (!el) continue;
    el.value = k.value;
    if (document.activeElement === el || fk === '#' + k.id) { el.focus({ preventScroll: true }); try { el.setSelectionRange(k.at, k.at); } catch { /* date inputs */ } }
  }
  if (!drawerState) restoreFocus(fk);
}

// ---------- Clicks ----------

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
    e.preventDefault();
    const [c, id] = tick.dataset.tick.split(':');
    toggleDone(c, id).catch(() => {});
    return;
  }
  const el = e.target.closest('[data-act]');
  // Clicking the empty part of a month day picks that day.
  if (!el) {
    const day = e.target.closest('.day[data-day]');
    if (day) pickDay(day.dataset.day, true);
    return;
  }
  const act = el.dataset.act;
  switch (act) {
    case 'board-full': S.boardFull = !S.boardFull; render(); break;
    case 'toggle-late': S.showLate = !S.showLate; render(); break;
    case 'take': {
      const it = currentItem();
      if (!it) break;
      if (!S.me) { toast('Set your name at the top right first', true); break; }
      const owner = it.owner ? `${it.owner}, ${S.me}` : S.me;
      try { await updateItem('tasks', it.id, { owner }); paintDrawer(); toast(`Assigned to ${S.me}`); ($('#drawer [data-act=edit]') || $('#drawer [data-act=drawer-tick]'))?.focus(); } catch { /* shown */ }
      break;
    }
    case 'to-nodate':
      e.preventDefault();
      if (location.hash !== '#month') location.hash = 'month'; else render();
      setTimeout(() => { const n = $('#nodate'); if (n) { n.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); n.focus({ preventScroll: true }); } }, 80);
      break;
    case 'prev': shiftMonth(-1); break;
    case 'next': shiftMonth(1); break;
    case 'today': S.month = startOfMonth(new Date()); S.sel = todayKey(); render(); break;
    case 'pick-day': pickDay(el.dataset.day, true); break;
    case 'new-event': openDrawer('events', null, true); break;
    case 'new-task': openDrawer('tasks', null, true); break;
    case 'toggle-done': S.showDone = !S.showDone; render(); break;
    case 'close': closeDrawerSafely(); break;
    case 'edit': if (!drawerState) break; drawerState.editing = true; drawerState.snap = null; paintDrawer(); setTimeout(() => $('#drawer [name=title]')?.focus(), 30); break;
    case 'cancel-edit': if (!drawerState) break; if (drawerIsDirty() && !confirm('Discard your unsaved changes?')) break; drawerState.editing = false; drawerState.snap = null; paintDrawer(); $('#drawer [data-act=edit]')?.focus(); break;
    case 'skip': $('#main').focus(); $('#main').scrollIntoView(); break;
    case 'retry': S.loadError = null; render(); refresh(); break;
    case 'save': break; // the Save button submits the form; see the submit handler
    case 'delete': { const it = currentItem(); if (it && await removeItem(drawerState.collection, it)) closeDrawer(); break; }
    case 'drawer-tick': {
      const st = drawerState;
      if (!st) break;
      try { await toggleDone(st.collection, st.id); if (drawerState === st) { paintDrawer(); $('#drawer [data-act=drawer-tick]')?.focus(); } } catch { /* shown */ }
      break;
    }
  }
});

document.addEventListener('change', (e) => {
  const act = e.target.dataset?.act;
  if (act === 'month-team') { S.monthTeam = e.target.value; render(); }
  if (act === 'month-tasks') { S.monthTasks = e.target.checked; render(); }
});

document.addEventListener('submit', async (e) => {
  const kind = e.target.dataset.form;
  if (kind === 'add-task') { e.preventDefault(); addTask(e.target); }
  if (e.target.id === 'edit-form') { e.preventDefault(); saveDrawer(); }
});

$('#scrim').addEventListener('click', closeDrawerSafely);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawerState && !$('#name-dialog').open) { e.preventDefault(); closeDrawerSafely(); return; }
  if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return; // leave browser shortcuts (like Back) alone
  if (drawerState || S.view !== 'month') return;
  const active = document.activeElement;
  // On a day: arrows move between days (up/down = a week), crossing into the next month when needed.
  if (active?.classList.contains('dnum')) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) {
      e.preventDefault();
      const d = parseDay(active.dataset.day); d.setDate(d.getDate() + step);
      pickDay(dayKey(d), true);
    }
    return;
  }
  const typing = /INPUT|TEXTAREA|SELECT/.test(active?.tagName || '');
  if (!typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); shiftMonth(e.key === 'ArrowRight' ? 1 : -1); }
});

// Stay in sync with everyone else: refresh every 30 seconds and whenever the tab comes back into view.
setInterval(() => { if (!document.hidden && !$('#app').hidden) refresh(true); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#app').hidden) refresh(true); });

// ---------- Start ----------

(async function boot() {
  const v = (location.hash.slice(1) || 'board').split('/')[0];
  S.view = isView(v) ? v : 'board';
  try {
    const s = await api('/api/login');
    if (s.loggedIn) startApp(); else showLogin();
  } catch {
    showLogin();
  }
  renderTabs();
})();
