// Login, tabs, routing, every click, keyboard, and startup.
'use strict';

// ---------- Login ----------

function showLogin() {
  if (drawerState) { drawerState = null; $('#drawer').hidden = true; $('#scrim').hidden = true; $('#app').inert = false; document.body.style.overflow = ''; }
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
    btn.disabled = false; btn.textContent = 'Open the board';
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

const isView = (v) => ['board', 'month', 'coe', 'log'].includes(v) || DEPTS.some((d) => d.id === v);

function renderTabs() {
  const tab = (id, label, ic = '', count = 0, hot = false, title = '') =>
    `<a class="tab" href="#${id}" ${S.view === id ? 'aria-current="page"' : ''} ${title ? `title="${esc(title)}"` : ''}>${ic ? icon(ic) : ''}${esc(label)}${count ? `<span class="count${hot ? ' hot' : ''}">${count}</span>` : ''}</a>`;
  const lit = litItems();
  $('#tabs').innerHTML =
    tab('board', 'Board', 'board', lit.length, true, lit.length ? `${lit.length} changed since you last looked` : '') +
    tab('month', 'Month', 'grid') +
    tab('coe', 'Circles', '', 0, false, 'Circles of Excellence') +
    '<span class="tab-sep" aria-hidden="true"></span>' +
    DEPTS.map((d) => {
      const open = S.tasks.filter((t) => t.dept === d.id && !t.done).length;
      const hot = lit.some(([c, it]) => c === 'tasks' && it.dept === d.id);
      return tab(d.id, d.name, '', open, hot, `${open} open to-dos${hot ? ', some changed since you last looked' : ''}`);
    }).join('') +
    '<span class="tab-sep" aria-hidden="true"></span>' +
    tab('log', 'Log');
}

function route() {
  const v = (location.hash.slice(1) || 'board').split('/')[0];
  const next = isView(v) ? v : 'board';
  const changed = next !== S.view;
  if (changed && drawerState) closeDrawer();
  if (changed) S.taskFilter = 'all'; // filters don't follow you to another tab
  S.view = next;
  renderTabs(); render();
  if (v === 'updates') setTimeout(() => $('#updates')?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }), 30);
  else if (changed) { window.scrollTo({ top: 0 }); $('#main').focus({ preventScroll: true }); }
  $('#tabs [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
window.addEventListener('hashchange', route);

function render() {
  const main = $('#main');
  if (!S.loaded) {
    main.innerHTML = `<div class="board" aria-busy="true"><div class="board-head"><h1 class="board-title"><span class="ball"></span>Departures</h1></div><p class="board-empty">Loading the board…</p></div>`;
    return;
  }
  // Remember focus, scroll spots and anything half-typed, then repaint, then put them back.
  const fk = focusKey(document.activeElement);
  const mapScroll = $('#linemap-scroll')?.scrollLeft;
  const railScroll = $('#updates-scroll')?.scrollTop;
  const drafts = ['post-text', 'quick-title', 'quick-due'].map((id) => {
    const el = document.getElementById(id);
    return el && { id, view: S.view, value: el.value, at: el.selectionStart, open: el.closest('form')?.classList.contains('open') };
  }).filter((k) => k && k.value);
  const viewBefore = render.lastView;

  if (S.view === 'board') main.innerHTML = viewBoard();
  else if (S.view === 'month') main.innerHTML = viewMonth();
  else if (S.view === 'coe') main.innerHTML = viewCoe();
  else if (S.view === 'log') main.innerHTML = viewLog();
  else main.innerHTML = viewTeam(S.view);
  render.lastView = S.view;

  for (const k of drafts) {
    if (k.id !== 'post-text' && viewBefore !== S.view) continue; // a draft for one team never shows up in another
    const el = document.getElementById(k.id);
    if (!el) continue;
    el.value = k.value;
    if (k.open) el.closest('form')?.classList.add('open');
    if (k.id === 'post-text') { const cc = el.closest('form')?.querySelector('.charcount'); if (cc) cc.textContent = `${k.value.length} / 280`; }
    if (document.activeElement === el || fk === '#' + k.id) { el.focus({ preventScroll: true }); try { el.setSelectionRange(k.at, k.at); } catch { /* date inputs */ } }
  }
  const pt = document.getElementById('post-text');
  if (pt && !pt.value && S.postDraft) { pt.value = S.postDraft; pt.closest('form').classList.add('open'); const cc = pt.closest('form').querySelector('.charcount'); if (cc) cc.textContent = `${S.postDraft.length} / 280`; }
  const sm = $('#linemap-scroll');
  if (sm) {
    if (mapScroll !== undefined) sm.scrollLeft = mapScroll;
    else { const h = sm.querySelector('.here'); if (h) sm.scrollLeft = Math.max(0, h.offsetLeft - sm.clientWidth / 3); }
  }
  if (railScroll !== undefined && $('#updates-scroll')) $('#updates-scroll').scrollTop = railScroll;
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
    case 'bf': S.boardFilter = el.dataset.v; S.boardFull = false; if (S.boardFilter === 'mine' && !S.me) toast('Set your name at the top right first', true); render(); break;
    case 'board-full': S.boardFull = !S.boardFull; render(); break;
    case 'toggle-late': S.showLate = !S.showLate; render(); break;
    case 'older-posts': S.olderPosts = !S.olderPosts; render(); break;
    case 'seen-all': markAllSeen(); renderTabs(); render(); toast('All caught up'); $('#updates-title')?.focus(); break;
    case 'take': {
      const it = currentItem();
      if (!it) break;
      if (!S.me) { toast('Set your name at the top right first', true); break; }
      const owner = it.owner ? `${it.owner}, ${S.me}` : S.me;
      try { await updateItem('tasks', it.id, { owner }); paintDrawer(); toast(`Assigned to ${S.me}. It's under Mine now.`); $('#drawer [data-act=edit]')?.focus(); } catch { /* shown */ }
      break;
    }
    case 'to-updates': e.preventDefault(); $('#updates')?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); break;
    case 'to-nodate':
      e.preventDefault();
      if (location.hash !== '#month') location.hash = 'month'; else render();
      setTimeout(() => { const n = $('#nodate'); if (n) { n.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); n.focus({ preventScroll: true }); } }, 80);
      break;
    case 'map-day': location.hash = 'month'; setTimeout(() => pickDay(el.dataset.day, true), 30); break;
    case 'post-cancel': { S.postDraft = ''; const f = el.closest('form'); f.reset(); f.classList.remove('open'); f.querySelector('.charcount').textContent = '0 / 280'; break; }
    case 'post-del': { const p = findItem('posts', el.dataset.id); if (p) removeItem('posts', p, 'Remove'); break; }
    case 'prev': shiftMonth(-1); break;
    case 'next': shiftMonth(1); break;
    case 'today': S.month = startOfMonth(new Date()); S.sel = todayKey(); render(); break;
    case 'pick-day': pickDay(el.dataset.day, true); break;
    case 'new-event': openDrawer('events', null, true); break;
    case 'tf': S.taskFilter = el.dataset.v; if (S.taskFilter === 'mine' && !S.me) toast('Set your name at the top right first', true); render(); break;
    case 'toggle-done': S.showDone = !S.showDone; render(); break;
    case 'close': closeDrawerSafely(); break;
    case 'edit': if (!drawerState) break; drawerState.editing = true; drawerState.snap = null; paintDrawer(); setTimeout(() => $('#drawer [name=title]')?.focus(), 30); break;
    case 'cancel-edit': if (!drawerState) break; if (drawerIsDirty() && !confirm('Discard your unsaved changes?')) break; drawerState.editing = false; drawerState.snap = null; paintDrawer(); $('#drawer [data-act=edit]')?.focus(); break;
    case 'skip': $('#main').focus(); $('#main').scrollIntoView(); break;
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
  if (act === 'board-team') { S.boardTeam = e.target.value; S.boardFull = false; render(); }
  if (act === 'month-team') { S.monthTeam = e.target.value; render(); }
  if (act === 'month-tasks') { S.monthTasks = e.target.checked; render(); }
  if (act === 'import' && e.target.files[0]) importFile(e.target.files[0]);
});

// The post box grows when you start typing and counts characters.
document.addEventListener('focusin', (e) => { if (e.target.id === 'post-text') e.target.closest('form').classList.add('open'); });
document.addEventListener('input', (e) => {
  if (e.target.id === 'post-text') { S.postDraft = e.target.value; e.target.closest('form').querySelector('.charcount').textContent = `${e.target.value.length} / 280`; }
});

document.addEventListener('submit', async (e) => {
  const kind = e.target.dataset.form;
  if (kind === 'quick-task') {
    e.preventDefault();
    const form = e.target;
    const title = form.elements.title.value.trim();
    const due = form.elements.due.value || null;
    if (!title) { form.elements.title.focus(); return; }
    if (due && !form.elements.due.checkValidity()) { form.elements.due.reportValidity(); return; }
    form.elements.title.value = ''; form.elements.due.value = '';
    try {
      await createItem('tasks', { id: newId(title), dept: S.view, title, desc: '', due, owner: '', done: false, coe: null, source: '', createdAt: new Date().toISOString() });
      toast(due ? 'Added' : 'Added. Tap it to add an owner and due date.');
    } catch {
      const t = $('#quick-title'); if (t) t.value = title; // keep what they typed
      const d = $('#quick-due'); if (d) d.value = due || '';
    }
    $('#quick-title')?.focus();
  }
  if (kind === 'post') {
    e.preventDefault();
    const form = e.target;
    const text = form.elements.text.value.trim();
    if (!text) { form.elements.text.focus(); return; }
    if (!S.me) { toast('Set your name at the top right first, so people know who posted', true); return; }
    // Clear the box before saving, so a second click can't post it twice.
    form.reset(); form.classList.remove('open'); form.querySelector('.charcount').textContent = '0 / 280';
    S.postDraft = '';
    const id = newId(text);
    try {
      await createItem('posts', { id, title: text.slice(0, 280), by: S.me, createdAt: new Date().toISOString() });
      toast('Posted for the class');
      document.getElementById('post-' + id)?.focus();
    } catch {
      const ta = $('#post-text');
      S.postDraft = text;
      if (ta) { ta.value = text; ta.closest('form').classList.add('open'); ta.focus(); }
    }
  }
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
