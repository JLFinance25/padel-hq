// The side panel: an item's details laid out like a boarding pass, and its edit form.
'use strict';

let drawerState = null;
let lastFocus = null;
function drawerIsEditing() { return !!(drawerState && drawerState.editing); }

function openDrawer(collection, id, editing = false, defaults = {}) {
  const item = id ? findItem(collection, id) : null;
  if (id && !item) { toast('That item was removed.', true); return; }
  if (!drawerState) lastFocus = document.activeElement;
  drawerState = { collection, item, editing: editing || !item, defaults };
  if (item) markSeen(collection, item);
  paintDrawer();
  $('#scrim').hidden = false;
  $('#drawer').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => ($('#drawer [name=title]') || $('#drawer .icon-btn')).focus(), 40);
}

function closeDrawer() {
  if (!drawerState) return;
  drawerState = null;
  $('#drawer').hidden = true;
  $('#scrim').hidden = true;
  document.body.style.overflow = '';
  renderTabs(); render();
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}

function fieldsFor(collection) {
  const teams = DEPTS.map((d) => [d.id, d.name]);
  if (collection === 'events') return [
    { k: 'title', label: 'Title', type: 'text' },
    { k: 'date', label: 'Date', type: 'date', half: true }, { k: 'end', label: 'Ends (if more than one day)', type: 'date', half: true },
    { k: 'kind', label: 'What is it', type: 'select', options: Object.entries(KINDS), half: true },
    { k: 'status', label: 'How sure is the date', type: 'select', options: Object.entries(STATUSES), half: true },
    { k: 'dept', label: 'Team', type: 'select', options: teams },
    { k: 'desc', label: 'Description', type: 'textarea' },
    { k: 'source', label: 'Source (link or where it came from)', type: 'text' },
  ];
  if (collection === 'tasks') return [
    { k: 'title', label: 'To-do', type: 'text' },
    { k: 'desc', label: 'Description: what done looks like', type: 'textarea' },
    { k: 'due', label: 'Due', type: 'date', half: true }, { k: 'owner', label: 'Who owns it', type: 'text', half: true },
    { k: 'dept', label: 'Team', type: 'select', options: teams },
  ];
  return [
    { k: 'title', label: 'Checklist item', type: 'text' },
    { k: 'due', label: 'Due', type: 'date', half: true }, { k: 'dept', label: 'Team', type: 'select', options: teams, half: true },
    { k: 'desc', label: 'What it takes to earn the point', type: 'textarea' },
    { k: 'notes', label: 'Our notes (proof, links, who submitted)', type: 'textarea' },
  ];
}

function fieldHtml(f, v) {
  const val = v ?? '';
  const id = 'f-' + f.k;
  if (f.type === 'textarea') return `<label for="${id}">${esc(f.label)}<textarea id="${id}" name="${f.k}" maxlength="2000">${esc(val)}</textarea></label>`;
  if (f.type === 'select') return `<label for="${id}">${esc(f.label)}<select id="${id}" name="${f.k}">${f.options.map(([o, l]) => `<option value="${esc(o)}" ${o === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  return `<label for="${id}">${esc(f.label)}<input id="${id}" type="${f.type}" name="${f.k}" value="${esc(val)}" ${f.k === 'title' ? 'required maxlength="160"' : 'maxlength="400"'} ${f.k === 'owner' ? 'list="owners"' : ''}></label>`;
}

function seg4(label, value, cls = '') {
  return `<div><span class="seg-label">${esc(label)}</span><span class="seg-val ${cls}">${value}</span></div>`;
}

function paintDrawer() {
  const { collection, item, editing, defaults } = drawerState;
  const d = $('#drawer');
  d.classList.toggle('editing', editing);
  const word = collection === 'events' ? 'calendar item' : collection === 'tasks' ? 'to-do' : 'checklist item';

  if (editing) {
    const base = item || {
      ...(collection === 'events'
        ? { kind: 'deadline', status: 'internal', dept: S.monthTeam !== 'all' ? S.monthTeam : 'firm', date: S.view === 'month' && S.sel ? S.sel : todayKey() }
        : { dept: DEPTS.some((x) => x.id === S.view) ? S.view : 'firm' }),
      ...defaults,
    };
    const fields = fieldsFor(collection);
    let rows = '';
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].half && fields[i + 1]?.half) { rows += `<div class="two">${fieldHtml(fields[i], base[fields[i].k])}${fieldHtml(fields[i + 1], base[fields[i + 1].k])}</div>`; i++; }
      else rows += fieldHtml(fields[i], base[fields[i].k]);
    }
    const owners = [...new Set(S.tasks.map((t) => (t.owner || '').trim()).filter(Boolean).concat(S.me ? [S.me] : []))];
    d.innerHTML = `
      <div class="drawer-head"><span class="drawer-kind">${item ? 'Editing' : 'New'}</span><h2 id="drawer-title">${item ? 'Edit ' + word : 'New ' + word}</h2>
        <button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>
      <form class="drawer-body form" id="edit-form">${rows}<datalist id="owners">${owners.map((o) => `<option value="${esc(o)}">`).join('')}</datalist></form>
      <div class="drawer-foot">
        ${item && collection !== 'coe' ? `<button class="btn btn-danger" data-act="delete">${icon('trash')}Delete</button>` : '<span></span>'}
        <span class="toolbar"><button class="btn" data-act="${item ? 'cancel-edit' : 'close'}">Cancel</button><button class="btn btn-primary" data-act="save">Save</button></span>
      </div>`;
    return;
  }

  const team = dept(item.dept);
  let segs = '', kindLine = '';
  if (collection === 'events') {
    const n = daysUntil(item.date);
    const when = item.date ? boardDate(item.date) + (item.end && item.end !== item.date ? ' – ' + boardDate(item.end) : '') : 'TBD';
    const sCls = { confirmed: 'green', projected: 'amber', nodate: 'red' }[item.status] || '';
    segs = seg4('When', esc(when)) + seg4('In', item.date ? esc(n < 0 ? 'Past' : n === 0 ? 'Today' : n + (n === 1 ? ' day' : ' days')) : '—')
      + seg4('Team', esc(team.code)) + seg4('Date is', esc(STATUSES[item.status] || item.status), sCls);
    kindLine = KINDS[item.kind] || item.kind;
  } else {
    const n = daysUntil(item.due);
    const inCls = item.done ? 'green' : n !== null && n < 0 ? 'red' : n !== null && n <= 7 ? 'amber' : '';
    segs = seg4('Due', esc(item.due ? boardDate(item.due) : 'No date')) + seg4(item.done ? 'Status' : 'In', item.done ? 'Done' : item.due ? esc(n < 0 ? -n + 'd late' : n === 0 ? 'Today' : n + (n === 1 ? ' day' : ' days')) : '—', inCls)
      + seg4('Team', esc(team.code)) + (collection === 'tasks' ? seg4('Owner', esc(item.owner || 'Nobody yet'), item.owner ? '' : 'amber') : seg4('Points', esc(item.points) + (item.bonus ? ' bonus' : '')));
    kindLine = collection === 'tasks' ? 'To-do' : 'Circles of Excellence';
  }
  const linked = collection === 'coe' ? S.tasks.filter((t) => t.coe === item.id) : [];
  const coeLink = collection === 'tasks' && item.coe && findItem('coe', item.coe);

  d.innerHTML = `
    <div class="drawer-head">
      <span class="drawer-kind">${esc(kindLine)} · ${esc(team.name)}</span>
      <h2 id="drawer-title">${esc(item.title)}</h2>
      <button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button>
    </div>
    <div class="drawer-body">
      <div class="segs">${segs}</div>
      ${collection === 'events' ? `<p class="status-help">${esc(STATUS_HELP[item.status] || '')}</p>` : ''}
      <p class="desc">${esc(item.desc || 'No description yet. Tap Edit to add one.')}</p>
      ${item.notes ? `<p class="meta"><b>Our notes</b></p><p class="desc">${esc(item.notes)}</p>` : ''}
      ${coeLink ? `<p class="meta">Counts toward Circles of Excellence: <a href="#" data-open="coe:${esc(coeLink.id)}">${esc(coeLink.title)}</a> (+${esc(coeLink.points)})</p>` : ''}
      ${linked.length ? `<p class="meta">Linked to-dos: ${linked.map((t) => `<a href="#" data-open="tasks:${esc(t.id)}">${esc(t.title)}</a>${t.done ? ' (done)' : ''}`).join(', ')}</p>` : ''}
      ${item.source ? `<p class="meta">Source: ${safeLink(item.source)}</p>` : ''}
      ${item.updatedBy ? `<p class="meta">Last changed by ${esc(item.updatedBy)}, ${esc(ago(item.updatedAt))}</p>` : ''}
    </div>
    <div class="drawer-foot">
      ${collection !== 'events' ? `<button class="btn ${item.done ? '' : 'btn-primary'}" data-act="drawer-tick">${item.done ? 'Mark not done' : icon('check') + 'Mark done'}</button>` : '<span></span>'}
      <button class="btn" data-act="edit">${icon('edit')}Edit</button>
    </div>`;
}

async function saveDrawer() {
  const { collection, item } = drawerState;
  const form = $('#edit-form');
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  for (const k of Object.keys(data)) data[k] = String(data[k]).trim();
  if (collection === 'events') {
    data.date = data.date || null;
    data.end = data.end && data.date && data.end > data.date ? data.end : null;
    if (!data.date) data.status = 'nodate';
    else if (data.status === 'nodate') data.status = 'internal';
  }
  if ('due' in data) data.due = data.due || null;
  const next = item ? { ...item, ...data }
    : { id: newId(data.title), done: false, createdAt: new Date().toISOString(), ...(collection === 'tasks' ? { coe: null, source: '' } : {}), ...data };
  try {
    const saved = await saveItem(collection, next);
    toast(item ? 'Saved' : 'Added');
    drawerState = { collection, item: saved, editing: false, defaults: {} };
    paintDrawer();
  } catch { /* toast already shown */ }
}

// Keep keyboard focus inside the open panel.
document.addEventListener('keydown', (e) => {
  if (!drawerState || e.key !== 'Tab') return;
  const f = [...$('#drawer').querySelectorAll('button, [href], input, select, textarea')].filter((x) => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
