// Login, tabs, routing, every click, and startup.
'use strict';

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
    btn.disabled = false; btn.textContent = 'Board';
  }
});

function paintMe() { $('#me-btn span').textContent = S.me || 'Set your name'; }

function startApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  paintMe();
  store('phq_lastvisit', new Date().toISOString()); // next visit compares against now; this visit still uses PREV_VISIT
  render();
  refresh();
}

$('#logout-btn').addEventListener('click', async () => {
  await api('/api/login', { method: 'DELETE' }).catch(() => {});
  showLogin();
});

$('#me-btn').addEventListener('click', () => {
  const n = prompt('Your first name (shows next to your changes):', S.me);
  if (n && n.trim()) { S.me = n.trim().slice(0, 40); store('phq_me', S.me); paintMe(); render(); }
});

// ---------- Tabs and routing ----------

const isView = (v) => ['board', 'month', 'coe', 'log'].includes(v) || DEPTS.some((d) => d.id === v);

function renderTabs() {
  const tab = (id, label, ic = '', count = 0, hot = false) =>
    `<a class="tab" href="#${id}" ${S.view === id ? 'aria-current="page"' : ''}>${ic ? icon(ic) : ''}${esc(label)}${count ? `<span class="count${hot ? ' hot' : ''}">${count}</span>` : ''}</a>`;
  const lit = litItems();
  $('#tabs').innerHTML =
    tab('board', 'Board', 'board', lit.length, true) +
    tab('month', 'Month', 'grid') +
    tab('coe', 'Circles') +
    '<span class="tab-sep" aria-hidden="true"></span>' +
    DEPTS.map((d) => {
      const open = S.tasks.filter((t) => t.dept === d.id && !t.done).length;
      const hot = lit.some(([c, it]) => c === 'tasks' && it.dept === d.id);
      return tab(d.id, d.name, '', open, hot);
    }).join('') +
    '<span class="tab-sep" aria-hidden="true"></span>' +
    tab('log', 'Log');
}

function route() {
  const v = (location.hash.slice(1) || 'board').split('/')[0];
  const next = isView(v) ? v : v === 'updates' ? 'board' : 'board';
  const changed = next !== S.view;
  S.view = next;
  renderTabs(); render();
  if (v === 'updates') setTimeout(() => $('#updates')?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }), 30);
  else if (changed) { window.scrollTo({ top: 0 }); $('#main').focus({ preventScroll: true }); }
  const active = $('#tabs [aria-current="page"]');
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
window.addEventListener('hashchange', route);

function render() {
  const main = $('#main');
  if (!S.loaded) {
    main.innerHTML = `<div class="board" aria-busy="true"><div class="board-head"><h1 class="board-title"><span class="ball"></span>Departures</h1></div><p class="board-empty">Loading the board…</p></div>`;
    return;
  }
  const scrollMap = $('#linemap-scroll')?.scrollLeft;
  const keep = ['post-text', 'quick-title'].map((id) => {
    const el = document.getElementById(id);
    return el && { id, value: el.value, focused: document.activeElement === el, at: el.selectionStart, open: el.closest('form')?.classList.contains('open') };
  }).filter((k) => k && (k.value || k.focused));
  if (S.view === 'board') main.innerHTML = viewBoard();
  else if (S.view === 'month') main.innerHTML = viewMonth();
  else if (S.view === 'coe') main.innerHTML = viewCoe();
  else if (S.view === 'log') main.innerHTML = viewLog();
  else main.innerHTML = viewTeam(S.view);
  for (const k of keep) {
    const el = document.getElementById(k.id);
    if (!el) continue;
    el.value = k.value;
    if (k.open) el.closest('form')?.classList.add('open');
    if (el.id === 'post-text') { const cc = el.closest('form')?.querySelector('.charcount'); if (cc) cc.textContent = `${k.value.length} / 280`; }
    if (k.focused) { el.focus({ preventScroll: true }); try { el.setSelectionRange(k.at, k.at); } catch { /* date inputs */ } }
  }
  // Season map: keep scroll position, or center on today the first time.
  const sm = $('#linemap-scroll');
  if (sm) {
    if (scrollMap !== undefined) sm.scrollLeft = scrollMap;
    else { const h = sm.querySelector('.here'); if (h) sm.scrollLeft = Math.max(0, h.offsetLeft - sm.clientWidth / 3); }
  }
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
    const item = findItem(c, id);
    if (item) saveItem(c, { ...item, done: !item.done }).then((s) => toast(s.done ? 'Checked off. Nice.' : 'Marked not done')).catch(() => {});
    return;
  }
  const el = e.target.closest('[data-act]');
  // Clicking the empty part of a month day picks that day.
  if (!el) {
    const day = e.target.closest('.day[data-day]');
    if (day) { S.sel = day.dataset.day; render(); }
    return;
  }
  const act = el.dataset.act;
  switch (act) {
    case 'bf': S.boardFilter = el.dataset.v; if (S.boardFilter === 'mine' && !S.me) toast('Set your name at the top right first', true); render(); break;
    case 'board-full': S.boardFull = !S.boardFull; render(); break;
    case 'older-posts': S.olderPosts = !S.olderPosts; render(); break;
    case 'seen-all': markAllSeen(); renderTabs(); render(); toast('All caught up'); break;
    case 'to-updates': e.preventDefault(); $('#updates')?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); break;
    case 'to-nodate': e.preventDefault(); location.hash = 'month'; setTimeout(() => $('#nodate')?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }), 60); break;
    case 'post-cancel': { const f = el.closest('form'); f.reset(); f.classList.remove('open'); f.querySelector('.charcount').textContent = '0 / 280'; break; }
    case 'post-del': { const p = findItem('posts', el.dataset.id); if (p) removeItem('posts', p, 'Remove'); break; }
    case 'prev': shiftMonth(-1); break;
    case 'next': shiftMonth(1); break;
    case 'today': S.month = startOfMonth(new Date()); S.sel = todayKey(); render(); break;
    case 'pick-day': S.sel = el.dataset.day; render(); $(`.dnum[data-day="${S.sel}"]`)?.focus(); break;
    case 'new-event': openDrawer('events', null, true); break;
    case 'tf': S.taskFilter = el.dataset.v; if (S.taskFilter === 'mine' && !S.me) toast('Set your name at the top right first', true); render(); break;
    case 'toggle-done': S.showDone = !S.showDone; render(); break;
    case 'close': closeDrawer(); break;
    case 'edit': drawerState.editing = true; paintDrawer(); setTimeout(() => $('#drawer [name=title]')?.focus(), 30); break;
    case 'cancel-edit': drawerState.editing = false; paintDrawer(); break;
    case 'save': saveDrawer(); break;
    case 'delete': if (await removeItem(drawerState.collection, drawerState.item)) closeDrawer(); break;
    case 'drawer-tick': {
      const { collection, item } = drawerState;
      try { const s = await saveItem(collection, { ...item, done: !item.done }); drawerState.item = s; paintDrawer(); toast(s.done ? 'Checked off. Nice.' : 'Marked not done'); } catch { /* shown */ }
      break;
    }
  }
});

document.addEventListener('change', (e) => {
  const act = e.target.dataset?.act;
  if (act === 'board-team') { S.boardTeam = e.target.value; render(); }
  if (act === 'month-team') { S.monthTeam = e.target.value; render(); }
  if (act === 'month-tasks') { S.monthTasks = e.target.checked; render(); }
  if (act === 'import' && e.target.files[0]) importFile(e.target.files[0]);
});

// The post box grows when you start typing and counts characters.
document.addEventListener('focusin', (e) => { if (e.target.id === 'post-text') e.target.closest('form').classList.add('open'); });
document.addEventListener('input', (e) => {
  if (e.target.id === 'post-text') e.target.closest('form').querySelector('.charcount').textContent = `${e.target.value.length} / 280`;
});

document.addEventListener('submit', async (e) => {
  const kind = e.target.dataset.form;
  if (kind === 'quick-task') {
    e.preventDefault();
    const input = e.target.elements.title;
    const title = input.value.trim();
    if (!title) { input.focus(); return; }
    input.value = '';
    try {
      await saveItem('tasks', { id: newId(title), dept: S.view, title, desc: '', due: null, owner: '', done: false, coe: null, source: '', createdAt: new Date().toISOString() });
      toast('Added. Tap it to add a description, owner and due date.');
      $('#quick-title')?.focus();
    } catch { input.value = title; }
  }
  if (kind === 'post') {
    e.preventDefault();
    const ta = e.target.elements.text;
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    if (!S.me) { toast('Set your name at the top right first, so people know who posted', true); return; }
    try {
      await saveItem('posts', { id: newId(text), title: text.slice(0, 280), by: S.me, createdAt: new Date().toISOString() });
      toast('Posted for the class');
    } catch { /* shown */ }
  }
  if (e.target.id === 'edit-form') { e.preventDefault(); saveDrawer(); }
});

$('#scrim').addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawerState) { closeDrawer(); return; }
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  if (S.view === 'month' && !drawerState && !typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    if (document.activeElement?.classList.contains('dnum')) return; // let day buttons keep normal focus behavior
    e.preventDefault();
    shiftMonth(e.key === 'ArrowRight' ? 1 : -1);
  }
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
