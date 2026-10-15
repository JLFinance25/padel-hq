// Login, tabs, routing, every click, keyboard, and startup.
'use strict';

// ---------- Login ----------

function showLogin() {
  if (drawerState) { drawerState = null; $('#drawer').hidden = true; $('#drawer').classList.remove('editing'); $('#scrim').hidden = true; $('#app').inert = false; document.body.style.overflow = ''; }
  S.trash = [];
  $('#app').hidden = true;
  $('#login').hidden = false;
  $('#login-name').value = S.me || '';
  setTimeout(() => ($('#login-name').value ? $('#login-pass') : $('#login-name')).focus(), 30);
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-error');
  err.textContent = '';
  const name = $('#login-name').value.trim().slice(0, 40);
  if (!name) { err.textContent = 'Please type your first name.'; $('#login-name').focus(); return; }
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Checking…';
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ passcode: $('#login-pass').value }) });
    $('#login-pass').value = '';
    S.me = name; store('phq_me', name);
    startApp();
  } catch (ex) {
    err.textContent = ex.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Log in';
  }
});

function startApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  S.loadError = null;
  lastData = ''; // the first load always repaints
  renderNameBar();
  route(); // also picks the page named in the address
  refresh();
}

$('#logout-btn').addEventListener('click', async () => {
  await api('/api/login', { method: 'DELETE' }).catch(() => {});
  showLogin();
});

// ---------- First name ----------
// Check-offs show who did them. Someone logged in before names existed gets a small bar to add one.
function renderNameBar() {
  $('#name-bar').hidden = !!S.me || $('#app').hidden || S.view === 'mine'; // Mine asks for the name itself
}
function saveName(form) {
  const input = form.querySelector('input');
  const name = input.value.trim().slice(0, 40);
  if (!name) { input.focus(); return; }
  S.me = name; store('phq_me', name); S.nameEdit = false;
  renderNameBar();
  render(); // Mine and the New pills depend on the name
  toast('Thanks, ' + name);
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

// The pages: #home (also #calendar), #o/<office>, #mine, #circles, #deleted, #unsorted.
// Anything else (like the old #suggest) goes Home.
function parseHash() {
  const [v, id] = (location.hash.slice(1) || 'home').split('/');
  if (v === 'home' || v === 'calendar') return { view: 'home', office: '' };
  if (v === 'o' && isOffice(id)) return { view: 'office', office: id };
  if (v === 'mine' || v === 'circles' || v === 'deleted' || v === 'unsorted') return { view: v, office: '' };
  return null;
}

let lastTabs = '';
function renderTabs() {
  const view = S.view, off = S.office;
  const link = (href, label, current) => `<a class="tab" href="${href}" ${current ? 'aria-current="page"' : ''}>${esc(label)}</a>`;
  const n = unsortedCount();
  const onOffice = view === 'office', onUnsorted = view === 'unsorted';
  // Phones: one "Offices" picker. Wide screens: the eight offices as tabs.
  const picker = `<label class="tab tab-select${onOffice || onUnsorted ? ' is-current' : ''}"><span class="sr">Offices</span>
    <select data-act="office-pick" aria-label="Offices">
      <option value="" ${onOffice || onUnsorted ? '' : 'selected'} disabled hidden>Offices</option>
      ${DEPTS.map((d) => `<option value="o/${d.id}" ${onOffice && off === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
      ${n || onUnsorted ? `<option value="unsorted" ${onUnsorted ? 'selected' : ''}>Unsorted (${n})</option>` : ''}
    </select></label>`;
  const officeTabs = DEPTS.map((d) => link('#o/' + d.id, d.name, onOffice && off === d.id)).join('')
    + (n || onUnsorted ? link('#unsorted', `Unsorted (${n})`, onUnsorted) : '');
  const html = link('#home', 'Home', view === 'home')
    + picker + `<span class="office-tabs">${officeTabs}</span>`
    + link('#mine', 'Mine', view === 'mine')
    + link('#circles', 'Circles', view === 'circles');
  if (html === lastTabs) return; // unchanged: leave it alone so an open picker isn't closed by a repaint
  lastTabs = html;
  $('#tabs').innerHTML = html;
}

function route() {
  const hit = parseHash();
  const next = hit || { view: 'home', office: '' };
  if (!hit && location.hash) history.replaceState(null, '', '#home'); // an address that isn't a page
  const changed = next.view !== S.view || next.office !== S.office;
  if (changed && drawerState) closeDrawer();
  if (next.view !== S.view) S.nameEdit = false; // leaving Mine closes the name box
  S.view = next.view; S.office = next.office;
  renderNameBar(); renderTabs(); render();
  if (changed) { window.scrollTo({ top: 0 }); $('#main').focus({ preventScroll: true }); }
  $('#tabs [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
window.addEventListener('hashchange', route);

function render() {
  const main = $('#main');
  if (!S.loaded) {
    main.innerHTML = S.loadError
      ? `<div class="load-msg" role="alert"><h1>The site didn't load</h1><p class="error">${esc(S.loadError)}</p><button class="btn" data-act="retry">Try again</button></div>`
      : `<div class="load-msg" aria-busy="true"><p>Loading…</p></div>`;
    return;
  }
  // Remember focus, then repaint, then put it back.
  const fk = focusKey(document.activeElement);
  const typed = $('#mine-name') ? $('#mine-name').value : null; // a name being typed survives a repaint

  if (S.view === 'home') main.innerHTML = viewHome();
  else if (S.view === 'office') main.innerHTML = viewDept(S.office);
  else if (S.view === 'mine') main.innerHTML = viewMine();
  else if (S.view === 'circles') main.innerHTML = viewCircles();
  else if (S.view === 'deleted') main.innerHTML = viewDeleted();
  else main.innerHTML = viewUnsorted();

  if (typed !== null && $('#mine-name')) $('#mine-name').value = typed;
  if (!drawerState) restoreFocus(fk);
}

// Add the typed step to the open to-do, and keep the cursor in the box for the next one.
function submitStep(form) {
  const box = form.elements.text;
  const text = box.value.trim();
  if (!text) { box.focus(); return; }
  const st = drawerState;
  if (!st || !st.id || st.collection !== 'tasks') return;
  box.value = '';
  addStep(st.id, text).catch((err) => { const b = $('#step-text'); if (b && !b.value && err.message !== 'gone') b.value = text; }); // a failed step goes back in the box
  $('#step-text')?.focus();
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
    toggleDone(c, id).then(() => { if (drawerState && !drawerIsEditing()) paintDrawer(); }).catch(() => {});
    return;
  }
  const el = e.target.closest('[data-act]');
  if (!el) {
    // Tapping the empty part of a calendar day opens that day.
    const day = e.target.closest('.day');
    const num = day && day.querySelector('[data-day]');
    if (num) openDay(num.dataset.day);
    return;
  }
  switch (el.dataset.act) {
    case 'prev': shiftMonth(-1); break;
    case 'next': shiftMonth(1); break;
    case 'today': S.month = startOfMonth(new Date()); render(); break;
    case 'open-day': openDay(el.dataset.day); break;
    case 'close': closeDrawerSafely(); break;
    case 'edit': startEdit(); break;
    case 'cancel-edit': cancelEdit(); break;
    case 'delete': deleteFromDrawer(); break;
    case 'add-todo': openNew('tasks'); break;
    case 'coming-all': S.comingAll[el.dataset.v] = !S.comingAll[el.dataset.v]; render(); break;
    case 'change-name': S.nameEdit = true; render(); $('#mine-name')?.focus(); $('#mine-name')?.select(); break;
    case 'cancel-name': S.nameEdit = false; render(); break;
    case 'add-task': openNew('tasks', { dept: el.dataset.dept }); break;
    case 'toggle-done': S.doneOpen = S.doneOpen === el.dataset.id ? '' : el.dataset.id; render(); break;
    case 'tick-step': case 'step-up': case 'step-down': case 'step-del': {
      const st = drawerState;
      if (!st || !st.id || st.collection !== 'tasks') break;
      const id = el.dataset.id;
      try {
        if (el.dataset.act === 'tick-step') await tickStep(st.id, id);
        else if (el.dataset.act === 'step-del') await removeStep(st.id, id);
        else await moveStep(st.id, id, el.dataset.act === 'step-up' ? -1 : 1);
      } catch { /* the message is already shown */ }
      break;
    }
    case 'add-event': openNew('events'); break;
    case 'add-on-day': openNew('events', { date: el.dataset.day }); break;
    case 'restore': {
      el.disabled = true;
      try { await restoreItem(el.dataset.id); } catch { el.disabled = false; } // the message is already shown
      break;
    }
    case 'retry': S.loadError = null; render(); refresh(); break;
    case 'drawer-tick': {
      const st = drawerState;
      if (!st || !st.id) break;
      try { await toggleDone(st.collection, st.id); if (drawerState === st && !drawerIsEditing()) paintDrawer(); } catch { /* shown */ }
      break;
    }
  }
});

document.addEventListener('change', (e) => {
  if (e.target.dataset?.act === 'office-pick' && e.target.value) location.hash = '#' + e.target.value;
  if (e.target.id === 'f-status') showStatusHelp(e.target);
});

// Typing again clears the form's error line.
document.addEventListener('input', (e) => {
  if (e.target.form && e.target.form.id === 'edit-form') { const box = $('#form-error'); if (box) box.textContent = ''; }
});

document.addEventListener('submit', (e) => {
  const kind = e.target.dataset.form;
  if (kind === 'name') { e.preventDefault(); saveName(e.target); }
  else if (kind === 'edit') { e.preventDefault(); saveDrawer(); }
  else if (kind === 'step') { e.preventDefault(); submitStep(e.target); }
});

$('#scrim').addEventListener('click', closeDrawerSafely);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawerState) { e.preventDefault(); closeDrawerSafely(); }
});

// Stay in sync with everyone else: refresh every 30 seconds and whenever the tab comes back into view.
setInterval(() => { if (!document.hidden && !$('#app').hidden) refresh(true); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#app').hidden) refresh(true); });

// ---------- Start ----------

(async function boot() {
  try {
    const s = await api('/api/login');
    if (s.loggedIn) startApp(); else showLogin();
  } catch {
    showLogin();
  }
  renderTabs();
})();
