// The popup: one item's details, or everything on one day.
'use strict';

let drawerState = null; // { collection, id } for an item, or { day } for a day
let openerKey = null;   // what to put keyboard focus back on when the popup closes
const drawerIsEditing = () => false; // nothing is edited on the site any more

function showPopup() {
  $('#scrim').hidden = false;
  $('#drawer').hidden = false;
  $('#app').inert = true;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#drawer [data-act=close]')?.focus(), 30);
}

function openDrawer(collection, id) {
  const item = findItem(collection, id);
  if (!item) { toast('That item was removed.', true); return; }
  if (!drawerState) openerKey = focusKey(document.activeElement);
  drawerState = { collection, id };
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
  $('#drawer').hidden = true;
  $('#scrim').hidden = true;
  $('#app').inert = false;
  document.body.style.overflow = '';
  render();
  restoreFocus(openerKey);
}
const closeDrawerSafely = closeDrawer;

// After a background refresh: show the newest copy, or close if it's gone.
function syncDrawer() {
  if (!drawerState) return;
  if (drawerState.id && !findItem(drawerState.collection, drawerState.id)) { closeDrawer(); return; }
  paintDrawer();
}

const currentItem = () => (drawerState && drawerState.id ? findItem(drawerState.collection, drawerState.id) : null);

const fact = (label, value, cls = '') => `<div><span class="fact-label">${esc(label)}</span><span class="fact-val ${cls}">${value}</span></div>`;

function paintDrawer() {
  const d = $('#drawer');
  const close = `<button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button>`;

  if (drawerState.day) {
    const k = drawerState.day;
    const list = eventsByDay(k, k)[k] || [];
    const due = S.tasks.filter((t) => t.due === k && !t.done);
    d.innerHTML = `
      <div class="drawer-head"><h2 id="drawer-title">${esc(fmt(k, { weekday: 'long', month: 'long', day: 'numeric' }))}</h2>${close}</div>
      <div class="drawer-body">
        ${list.length ? `<ul class="day-list">${list.map((e) => `<li><button class="chip kind-${esc(e.kind)}" data-open="events:${esc(e.id)}">${esc(e.title)}</button></li>`).join('')}</ul>` : '<p class="hint">Nothing on the calendar this day.</p>'}
        ${due.length ? `<h3 class="todo-group">To-dos due this day (${due.length})</h3><ul class="todo-list">${due.map((t) => todoRow(t)).join('')}</ul>` : ''}
      </div>`;
    return;
  }

  const { collection } = drawerState;
  const item = currentItem();
  const team = dept(item.dept);
  let facts = '';
  if (collection === 'events') {
    const when = item.date ? fmt(item.date, { weekday: 'long', month: 'long', day: 'numeric' }) + (item.end && item.end !== item.date ? ' to ' + fmt(item.end, { weekday: 'long', month: 'long', day: 'numeric' }) : '') : 'No date yet';
    const st = item.status || (item.date ? 'internal' : 'nodate');
    const sCls = { confirmed: 'green', projected: 'amber', nodate: 'red' }[st] || '';
    facts = fact('When', esc(when)) + fact('What', esc(KINDS[item.kind] || item.kind || 'Event')) + fact('Department', esc(team.name))
      + fact('Is the date sure?', esc(STATUSES[st] || st), sCls);
    facts += `<p class="status-help">${esc(STATUS_HELP[st] || '')}</p>`;
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
      ${collection === 'tasks' ? `<button class="btn ${item.done ? '' : 'btn-primary'}" data-act="drawer-tick">${item.done ? 'Mark not done' : icon('check') + 'Mark done'}</button>` : ''}
      <button class="btn" data-act="close">Close</button>
    </div>`;
}

// Keep Tab inside the open popup even if inert isn't supported.
document.addEventListener('keydown', (e) => {
  if (!drawerState || e.key !== 'Tab') return;
  const f = [...$('#drawer').querySelectorAll('button, a[href]')].filter((x) => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (!$('#drawer').contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
