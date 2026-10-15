// Login, tabs, routing, every click, keyboard, and startup.
'use strict';

// ---------- Login ----------

function showLogin() {
  if (drawerState) { drawerState = null; $('#drawer').hidden = true; $('#scrim').hidden = true; $('#app').inert = false; document.body.style.overflow = ''; }
  $('#app').hidden = true;
  $('#login').hidden = false;
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
    $('#login-pass').value = '';
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
  render();
  refresh();
}

$('#logout-btn').addEventListener('click', async () => {
  await api('/api/login', { method: 'DELETE' }).catch(() => {});
  showLogin();
});

// ---------- Suggest form ----------
// The form is cleared before sending so a second click can't send it twice.
async function sendSuggestion(form) {
  const f = form.elements;
  const title = f.title.value.trim();
  if (!title) { f.title.setCustomValidity('Write what needs to be done.'); f.title.reportValidity(); f.title.setCustomValidity(''); return; }
  if (!f.dept.value) { f.dept.setCustomValidity('Pick a department.'); f.dept.reportValidity(); f.dept.setCustomValidity(''); return; }
  if (!f.due.checkValidity()) { f.due.reportValidity(); return; }
  const data = { title, dept: f.dept.value, due: f.due.value || null, desc: f.desc.value.trim() };
  form.reset();
  try {
    await createItem('suggestions', { id: newId(title), createdAt: new Date().toISOString(), ...data });
    toast('Sent. It will show up once it is approved.');
  } catch {
    S.draft = data; // put back what they typed
    if (S.view === 'suggest') render();
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

const isView = (v) => ['calendar', 'suggest'].includes(v) || DEPTS.some((d) => d.id === v);

function renderTabs() {
  const tab = (id, label, ic = '') => `<a class="tab" href="#${id}" ${S.view === id ? 'aria-current="page"' : ''}>${ic ? icon(ic) : ''}${esc(label)}</a>`;
  $('#tabs').innerHTML =
    tab('calendar', 'Calendar', 'grid') +
    tab('suggest', 'Suggest a to-do', 'plus') +
    '<span class="tab-sep" aria-hidden="true"></span>' +
    DEPTS.map((d) => tab(d.id, d.name)).join('');
}

function route() {
  const v = (location.hash.slice(1) || 'calendar').split('/')[0];
  const next = isView(v) ? v : 'calendar';
  const changed = next !== S.view;
  if (changed && drawerState) closeDrawer();
  S.view = next;
  renderTabs(); render();
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
  // Remember focus and anything half-typed in the suggest form, then repaint, then put them back.
  const fk = focusKey(document.activeElement);
  const drafts = ['s-title', 's-dept', 's-due', 's-desc'].map((id) => {
    const el = document.getElementById(id);
    return el && el.value && { id, value: el.value };
  }).filter(Boolean);
  const sameView = render.lastView === S.view;

  if (S.view === 'calendar') main.innerHTML = viewHome();
  else if (S.view === 'suggest') main.innerHTML = viewSuggest();
  else main.innerHTML = viewDept(S.view);
  render.lastView = S.view;

  if (sameView) for (const k of drafts) { const el = document.getElementById(k.id); if (el) el.value = k.value; }
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
    toggleDone(c, id).then(() => { if (drawerState) paintDrawer(); }).catch(() => {});
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
    case 'close': closeDrawer(); break;
    case 'retry': S.loadError = null; render(); refresh(); break;
    case 'drawer-tick': {
      const st = drawerState;
      if (!st || !st.id) break;
      try { await toggleDone(st.collection, st.id); if (drawerState === st) paintDrawer(); } catch { /* shown */ }
      break;
    }
  }
});

document.addEventListener('change', (e) => {
  if (e.target.dataset?.act === 'todo-team') { S.todoTeam = e.target.value; render(); }
});

document.addEventListener('submit', (e) => {
  if (e.target.dataset.form === 'suggest') { e.preventDefault(); sendSuggestion(e.target); }
});

$('#scrim').addEventListener('click', closeDrawer);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawerState) { e.preventDefault(); closeDrawer(); }
});

// Stay in sync with everyone else: refresh every 30 seconds and whenever the tab comes back into view.
setInterval(() => { if (!document.hidden && !$('#app').hidden) refresh(true); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#app').hidden) refresh(true); });

// ---------- Start ----------

(async function boot() {
  const v = (location.hash.slice(1) || 'calendar').split('/')[0];
  S.view = isView(v) ? v : 'calendar';
  try {
    const s = await api('/api/login');
    if (s.loggedIn) startApp(); else showLogin();
  } catch {
    showLogin();
  }
  renderTabs();
})();
