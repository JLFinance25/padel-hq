// The popup: one item's details, everything on one day, and the edit form.
'use strict';

// { collection, id } for an item, or { day } for a day. While a form is open it also has
// editing, defaults (starting values for a new item), snap (the item as it was when editing began),
// initial (the form as first painted, to tell if anything was typed) and saving.
let drawerState = null;
let openerKey = null;   // what to put keyboard focus back on when the popup closes
const drawerIsEditing = () => !!(drawerState && drawerState.editing);

function showPopup() {
  $('#scrim').hidden = false;
  $('#drawer').hidden = false;
  $('#app').inert = true;
  document.body.style.overflow = 'hidden';
  setTimeout(() => ($('#drawer [name=title]') || $('#drawer [data-act=close]'))?.focus(), 30);
}

function openDrawer(collection, id) {
  const item = findItem(collection, id);
  if (!item) { toast('That item was removed.', true); return; }
  if (!drawerState) openerKey = focusKey(document.activeElement);
  drawerState = { collection, id };
  paintDrawer();
  showPopup();
}

// A blank form. preset has starting values, like { dept } or { date }.
function openNew(collection, preset = {}) {
  if (!drawerState) openerKey = focusKey(document.activeElement);
  drawerState = { collection, id: null, editing: true, defaults: preset, saving: false };
  paintDrawer();
  showPopup();
}

function openDay(k) {
  if (!drawerState) openerKey = focusKey(document.activeElement);
  drawerState = { day: k };
  paintDrawer();
  showPopup();
}

function closeDrawer() {
  if (!drawerState) return;
  drawerState = null;
  $('#drawer').classList.remove('editing');
  fitDrawer();
  $('#drawer').hidden = true;
  $('#scrim').hidden = true;
  $('#app').inert = false;
  document.body.style.overflow = '';
  render();
  restoreFocus(openerKey);
}

// What the form says right now, to tell whether anything was typed.
function formState() {
  const f = $('#edit-form');
  return f ? JSON.stringify([...new FormData(f).entries()]) : '';
}
const drawerIsDirty = () => drawerIsEditing() && !!drawerState.initial && formState() !== drawerState.initial;
const THROW_AWAY = 'Throw away your changes?';
// Close the popup, but ask first if a form has unsaved changes.
function closeDrawerSafely() {
  if (drawerIsDirty() && !confirm(THROW_AWAY)) return;
  closeDrawer();
}

// After a background refresh: show the newest copy, or close if it's gone. A form is never repainted.
function syncDrawer() {
  if (!drawerState || drawerIsEditing()) return;
  if (drawerState.id && !findItem(drawerState.collection, drawerState.id)) { closeDrawer(); return; }
  paintDrawer();
}

const currentItem = () => (drawerState && drawerState.id ? findItem(drawerState.collection, drawerState.id) : null);

const fact = (label, value, cls = '') => `<div><span class="fact-label">${esc(label)}</span><span class="fact-val ${cls}">${value}</span></div>`;

function paintDrawer() {
  const d = $('#drawer');
  const close = `<button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button>`;
  d.classList.toggle('editing', drawerIsEditing());
  fitDrawer();

  if (drawerState.day) {
    const k = drawerState.day;
    const list = eventsByDay(k, k)[k] || [];
    const due = S.tasks.filter((t) => t.due === k && !t.done);
    d.innerHTML = `
      <div class="drawer-head"><h2 id="drawer-title">${esc(fmt(k, { weekday: 'long', month: 'long', day: 'numeric' }))}</h2>${close}</div>
      <div class="drawer-body">
        ${list.length ? `<ul class="day-list">${list.map((e) => `<li><button class="chip kind-${esc(e.kind)}" data-open="events:${esc(e.id)}">${esc(e.title)}</button></li>`).join('')}</ul>` : '<p class="hint">Nothing on the calendar this day.</p>'}
        ${due.length ? `<h3 class="todo-group">To-dos due this day (${due.length})</h3><ul class="todo-list">${due.map((t) => todoRow(t)).join('')}</ul>` : ''}
      </div>
      <div class="drawer-foot"><button class="btn" type="button" data-act="add-on-day" data-day="${esc(k)}">${icon('plus')}Add on this day</button></div>`;
    return;
  }

  const { collection } = drawerState;
  if (drawerState.editing) { paintForm(); return; }
  const item = currentItem();
  if (!item) return;
  const team = dept(item.dept);
  let facts = '';
  if (collection === 'events') {
    const when = item.date ? fmt(item.date, { weekday: 'long', month: 'long', day: 'numeric' }) + (item.end && item.end !== item.date ? ' to ' + fmt(item.end, { weekday: 'long', month: 'long', day: 'numeric' }) : '') : 'No date yet';
    const st = item.status || (item.date ? 'internal' : 'nodate');
    const sCls = { confirmed: 'green', projected: 'amber', nodate: 'red' }[st] || '';
    facts = fact('When', esc(when)) + fact('What', esc(KINDS[item.kind] || item.kind || 'Event')) + fact('Department', esc(team.name))
      + fact('Is the date sure?', esc(STATUSES[st] || st), sCls);
    facts += `<p class="status-help">${esc(STATUS_HELP[st] || '')}</p>`;
  } else if (collection === 'coe') {
    const per = PERIODS.find((x) => String(x.id) === String(item.period));
    const n = daysUntil(item.due);
    facts = fact('Points', esc('+' + (Number(item.points) || 0))) + fact('Period', esc(per ? per.name : 'Not set'))
      + fact('Due', esc(item.due ? fmt(item.due, { weekday: 'long', month: 'long', day: 'numeric' }) : 'No set date'), !item.done && n !== null && n < 0 ? 'red' : '')
      + fact('Department', esc(team.name))
      + fact('Status', esc(item.done ? checkedBy(item) : 'Not done yet'), item.done ? 'green' : '');
  } else {
    const n = daysUntil(item.due);
    const inText = item.done ? 'Done' : !item.due ? 'No date yet' : n < 0 ? `${-n === 1 ? '1 day' : -n + ' days'} late` : relDays(n);
    const inCls = item.done ? 'green' : n !== null && n < 0 ? 'red' : n !== null && n <= 3 ? 'amber' : '';
    facts = fact('Due', esc(item.due ? fmt(item.due, { weekday: 'long', month: 'long', day: 'numeric' }) : 'No date yet'))
      + fact('Status', esc(inText), inCls) + fact('Department', esc(team.name)) + fact('Who', esc(item.owner || 'Not assigned yet'));
  }

  d.innerHTML = `
    <div class="drawer-head"><h2 id="drawer-title">${esc(item.title)}</h2>${close}</div>
    <div class="drawer-body">
      <div class="facts">${facts}</div>
      ${item.desc ? `<p class="desc">${esc(item.desc)}</p>` : ''}
      ${item.source ? `<p class="meta">Source: ${safeLink(item.source)}</p>` : ''}
    </div>
    <div class="drawer-foot">
      ${collection === 'coe' ? '' : `<button class="btn btn-danger foot-left" type="button" data-act="delete">${icon('trash')}Delete</button>`}
      ${collection === 'tasks' || collection === 'coe' ? `<button class="btn ${item.done ? '' : 'btn-primary'}" data-act="drawer-tick">${item.done ? 'Mark not done' : icon('check') + 'Mark done'}</button>` : ''}
      <button class="btn" type="button" data-act="edit">${icon('edit')}Edit</button>
    </div>`;
}

// ---------- The edit form ----------

const optionsHtml = (pairs, val) => pairs.map(([o, l]) => `<option value="${esc(o)}" ${o === val ? 'selected' : ''}>${esc(l)}</option>`).join('');
const deptOptions = (val) => optionsHtml(DEPTS.map((d) => [d.id, d.name]), val);

function formHtml(collection, v) {
  if (collection === 'events') {
    const kindBlank = v.kind && Object.hasOwn(KINDS, v.kind) ? '' : '<option value="" selected disabled>Choose one</option>';
    return `
      <label for="f-title"><span>What</span><input id="f-title" type="text" name="title" value="${esc(v.title)}" required maxlength="160" autocomplete="off"></label>
      <div class="two">
        <label for="f-date"><span>Date <span class="hint">(leave empty if unknown)</span></span><input id="f-date" type="date" name="date" value="${esc(v.date)}" min="${DATE_MIN}" max="${DATE_MAX}"></label>
        <label for="f-end"><span>End date <span class="hint">(if more than one day)</span></span><input id="f-end" type="date" name="end" value="${esc(v.end)}" min="${DATE_MIN}" max="${DATE_MAX}"></label>
      </div>
      <label for="f-kind"><span>Kind</span><select id="f-kind" name="kind">${kindBlank}${optionsHtml(Object.entries(KINDS), v.kind)}</select></label>
      <div class="field-group">
        <label for="f-status"><span>How sure is this date?</span><select id="f-status" name="status" required><option value="" disabled ${v.status ? '' : 'selected'}>Choose one</option>${optionsHtml(Object.entries(STATUSES), v.status)}</select></label>
        <p class="status-help" id="status-help">${esc(STATUS_HELP[v.status] || 'Pick one so nobody mistakes a guess for a fact.')}</p>
      </div>
      <label for="f-dept"><span>Department</span><select id="f-dept" name="dept">${deptOptions(v.dept)}</select></label>
      <label for="f-desc"><span>Details <span class="hint">(optional)</span></span><textarea id="f-desc" name="desc" maxlength="2000">${esc(v.desc)}</textarea></label>
      <label for="f-source"><span>Source <span class="hint">(a link starting with https://, or where it came from)</span></span><input id="f-source" type="text" name="source" value="${esc(v.source)}" maxlength="400" autocomplete="off"></label>`;
  }
  if (collection === 'coe') {
    return `
      <label for="f-title"><span>What</span><input id="f-title" type="text" name="title" value="${esc(v.title)}" required maxlength="160" autocomplete="off"></label>
      <div class="two">
        <label for="f-points"><span>Points</span><input id="f-points" type="number" name="points" value="${esc(v.points)}" min="0" max="20" step="1" inputmode="numeric" required></label>
        <label for="f-due"><span>Due <span class="hint">(if there is one)</span></span><input id="f-due" type="date" name="due" value="${esc(v.due)}" min="${DATE_MIN}" max="${DATE_MAX}"></label>
      </div>
      <div class="two">
        <label for="f-dept"><span>Department</span><select id="f-dept" name="dept">${deptOptions(v.dept)}</select></label>
        <label for="f-period"><span>Period</span><select id="f-period" name="period">${optionsHtml(PERIODS.map((p) => [String(p.id), p.name]), String(v.period))}</select></label>
      </div>
      <label for="f-desc"><span>Details</span><textarea id="f-desc" name="desc" maxlength="2000">${esc(v.desc)}</textarea></label>`;
  }
  return `
    <label for="f-title"><span>What</span><input id="f-title" type="text" name="title" value="${esc(v.title)}" required maxlength="160" autocomplete="off"></label>
    <div class="two">
      <label for="f-dept"><span>Department</span><select id="f-dept" name="dept">${deptOptions(v.dept)}</select></label>
      <label for="f-due"><span>Due <span class="hint">(if you know)</span></span><input id="f-due" type="date" name="due" value="${esc(v.due)}" min="${DATE_MIN}" max="${DATE_MAX}"></label>
    </div>
    <label for="f-owner"><span>Who <span class="hint">(first names, comma between)</span></span><input id="f-owner" type="text" name="owner" value="${esc(v.owner)}" maxlength="400" list="owners" autocomplete="off"></label>
    <label for="f-desc"><span>Details <span class="hint">(what done looks like)</span></span><textarea id="f-desc" name="desc" maxlength="2000">${esc(v.desc)}</textarea></label>`;
}

function paintForm() {
  const { collection, defaults } = drawerState;
  const item = currentItem();
  const d = $('#drawer');
  d.classList.add('editing');
  if (item && !drawerState.snap) drawerState.snap = { ...item };
  // A new item starts blank (events get no "how sure" until the person picks one).
  const start = collection === 'events' ? { kind: 'event', dept: 'firm' } : { dept: 'firm' };
  const base = drawerState.snap || { ...start, ...defaults };
  const word = collection === 'events' ? 'calendar item' : collection === 'coe' ? 'Circles item' : 'to-do';
  const owners = [...new Set(S.tasks.flatMap((t) => String(t.owner || '').split(/\s*,\s*/)).map((o) => o.trim()).filter(Boolean).concat(S.me ? [S.me] : []))];
  d.innerHTML = `
    <div class="drawer-head"><h2 id="drawer-title">${drawerState.snap ? 'Edit ' + word : 'New ' + word}</h2>
      <button class="icon-btn" type="button" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <form class="drawer-body form" id="edit-form" data-form="edit" novalidate>${formHtml(collection, base)}<datalist id="owners">${owners.map((o) => `<option value="${esc(o)}">`).join('')}</datalist></form>
    <div class="drawer-foot">
      <p class="error form-error" id="form-error" role="alert"></p>
      <button class="btn" type="button" data-act="cancel-edit">Cancel</button>
      <button class="btn btn-primary" type="submit" form="edit-form" data-act="save">Save</button>
    </div>`;
  drawerState.initial = formState();
  fitDrawer();
}

// On a phone the form fills the screen. This keeps its Save/Cancel row above the on-screen keyboard.
function fitDrawer() {
  const d = $('#drawer'), vv = window.visualViewport;
  if (vv && isPhone() && drawerIsEditing()) {
    d.style.setProperty('--drawer-h', vv.height + 'px');
    d.style.setProperty('--drawer-top', vv.offsetTop + 'px');
  } else {
    d.style.removeProperty('--drawer-h');
    d.style.removeProperty('--drawer-top');
  }
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', fitDrawer);
  window.visualViewport.addEventListener('scroll', fitDrawer);
}

function startEdit() {
  const item = currentItem();
  if (!item) return;
  drawerState.editing = true; drawerState.snap = { ...item }; drawerState.saving = false;
  paintDrawer();
  $('#drawer [name=title]')?.focus();
}

function cancelEdit() {
  if (drawerIsDirty() && !confirm(THROW_AWAY)) return;
  if (!drawerState.snap || !currentItem()) { closeDrawer(); return; } // a new item, or one that was deleted meanwhile
  drawerState.editing = false; drawerState.snap = null; drawerState.initial = null;
  paintDrawer();
  $('#drawer [data-act=edit]')?.focus();
}

async function deleteFromDrawer() {
  const item = currentItem();
  if (!item) return;
  if (!confirm(`Delete '${item.title}'? You can put it back from Recently deleted for 30 days.`)) return;
  const { collection, id } = drawerState;
  closeDrawer();
  try { await removeItem(collection, id); } catch { /* the message is already shown */ }
}

// Say what's wrong right in the form (phone browsers don't always show pop-up bubbles), and put the cursor there.
function formError(el, msg) {
  const box = $('#form-error');
  if (box) box.textContent = msg;
  el.focus();
}

async function saveDrawer() {
  const state = drawerState;
  if (!state || !state.editing || state.saving) return; // no double saves
  const { collection } = state;
  const item = state.id ? findItem(collection, state.id) : null;
  if (state.id && !item) { toast('Someone deleted this while you were editing. What you typed is still here.', true); return; }
  const form = $('#edit-form');
  const f = form.elements;
  $('#form-error').textContent = '';

  const title = f.title.value.trim();
  if (!title) return formError(f.title, 'Give it a name first.');
  for (const el of form.querySelectorAll('input[type=date]')) if (!el.checkValidity()) return formError(el, 'That date has to be between 2026 and 2027.');
  const data = { title };
  for (const k of collection === 'events' ? ['date', 'end', 'kind', 'status', 'dept', 'desc', 'source'] : collection === 'coe' ? ['dept', 'due', 'desc'] : ['dept', 'due', 'owner', 'desc']) data[k] = f[k].value.trim();

  if (collection === 'events') {
    if (!data.status) return formError(f.status, 'Pick how sure this date is.');
    if (!data.date && data.status !== 'nodate') return formError(f.status, "There's no date, so this has to say 'No date yet'. Add a date or change this.");
    if (data.date && data.status === 'nodate') return formError(f.status, "You added a date, so 'No date yet' doesn't fit. Pick how sure the date is.");
    if (data.end && !data.date) return formError(f.end, 'Add a date first, or clear the end date.');
    if (data.end && data.end < data.date) return formError(f.end, 'The end date is before the date.');
    data.date = data.date || null;
    data.end = data.end && data.end > data.date ? data.end : null;
    if (!data.kind) delete data.kind;
  } else if (collection === 'coe') {
    const pts = Number(f.points.value);
    if (f.points.value.trim() === '' || !Number.isInteger(pts) || pts < 0 || pts > 20) return formError(f.points, 'Points have to be a whole number from 0 to 20.');
    data.points = pts;
    data.period = /^\d+$/.test(f.period.value) ? Number(f.period.value) : f.period.value;
    data.bonus = !!(PERIODS.find((p) => String(p.id) === f.period.value) || {}).bonus;
    data.due = data.due || null;
  } else {
    data.due = data.due || null;
  }

  state.saving = true;
  const btn = $('#drawer [data-act=save]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    let saved;
    if (item) {
      const norm = (x) => (x === null || x === undefined ? '' : String(x));
      const changed = {};
      const was = state.snap || item;
      for (const [k, v] of Object.entries(data)) if (norm(was[k]) !== norm(v)) changed[k] = v;
      saved = Object.keys(changed).length ? await updateItem(collection, item.id, changed) : item;
    } else {
      saved = await createItem(collection, { id: newId(title), ...(collection === 'tasks' ? { done: false } : {}), ...data });
    }
    toast(item ? 'Saved' : 'Added');
    if (drawerState === state) { // still the same popup (not closed meanwhile)
      drawerState = { collection, id: saved.id, editing: false, defaults: {}, saving: false };
      paintDrawer();
      fitDrawer();
      $('#drawer [data-act=edit]')?.focus();
    }
  } catch (e) {
    state.saving = false;
    if (btn && drawerState === state) { btn.disabled = false; btn.textContent = 'Save'; }
    if (e.status === 404 || e.message === 'gone') toast('Someone deleted this while you were editing. What you typed is still here.', true);
  }
}

// What the status line under "How sure is this date?" says as the choice changes.
function showStatusHelp(select) {
  const help = $('#status-help');
  if (help) help.textContent = STATUS_HELP[select.value] || 'Pick one so nobody mistakes a guess for a fact.';
}

// Keep Tab inside the open popup even if inert isn't supported.
document.addEventListener('keydown', (e) => {
  if (!drawerState || e.key !== 'Tab') return;
  const f = [...$('#drawer').querySelectorAll('button, a[href], input, select, textarea')].filter((x) => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (!$('#drawer').contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
