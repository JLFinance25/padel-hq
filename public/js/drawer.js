// The side panel: an item's details laid out like a boarding pass, and its edit form.
'use strict';

let drawerState = null;
let openerKey = null; // what to put keyboard focus back on when the panel closes
function drawerIsEditing() { return !!(drawerState && drawerState.editing); }

function openDrawer(collection, id, editing = false, defaults = {}) {
  const item = id ? findItem(collection, id) : null;
  if (id && !item) { toast('That item was removed.', true); return; }
  if (!drawerState) openerKey = focusKey(document.activeElement);
  drawerState = { collection, id: item ? item.id : null, editing: editing || !item, defaults, saving: false };
  if (item) markSeen(collection, item);
  paintDrawer();
  $('#scrim').hidden = false;
  $('#drawer').hidden = false;
  $('#app').inert = true; // the page behind is off-limits while the panel is open
  document.body.style.overflow = 'hidden';
  setTimeout(() => ($('#drawer [name=title]') || $('#drawer .icon-btn'))?.focus(), 40);
}

function closeDrawer() {
  if (!drawerState) return;
  drawerState = null;
  $('#drawer').hidden = true;
  $('#scrim').hidden = true;
  $('#app').inert = false;
  document.body.style.overflow = '';
  renderTabs(); render();
  restoreFocus(openerKey);
}

// After a background refresh: show the newest copy, or close if someone deleted it.
function syncDrawer() {
  if (!drawerState || drawerState.editing || !drawerState.id) return;
  if (!findItem(drawerState.collection, drawerState.id)) { closeDrawer(); toast('Someone deleted that item.', true); return; }
  const fk = $('#drawer').contains(document.activeElement) ? focusKey(document.activeElement) : null;
  paintDrawer();
  restoreFocus(fk);
}

const currentItem = () => drawerState && drawerState.id ? findItem(drawerState.collection, drawerState.id) : null;

function fieldsFor(collection) {
  const teams = DEPTS.map((d) => [d.id, d.name]);
  if (collection === 'events') return [
    { k: 'title', label: 'Title', type: 'text' },
    { k: 'date', label: 'Date (leave empty if unknown)', type: 'date', half: true }, { k: 'end', label: 'Ends (if more than one day)', type: 'date', half: true },
    { k: 'kind', label: 'What is it', type: 'select', options: Object.entries(KINDS), half: true },
    { k: 'status', label: 'How sure is the date', type: 'select', options: Object.entries(STATUSES).filter(([k]) => k !== 'nodate'), half: true },
    { k: 'dept', label: 'Team', type: 'select', options: teams, half: true }, { k: 'short', label: 'Short name for the season map', type: 'text', half: true, max: 22 },
    { k: 'desc', label: 'Description', type: 'textarea' },
    { k: 'source', label: 'Source (link or where it came from)', type: 'text' },
  ];
  if (collection === 'tasks') return [
    { k: 'title', label: 'To-do', type: 'text' },
    { k: 'desc', label: 'Description: what done looks like', type: 'textarea' },
    { k: 'due', label: 'Due', type: 'date', half: true }, { k: 'owner', label: 'Who owns it (first names, comma between)', type: 'text', half: true },
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
  const extra = f.type === 'date' ? `min="${DATE_MIN}" max="${DATE_MAX}"` : f.k === 'title' ? 'required maxlength="160"' : `maxlength="${f.max || 400}"`;
  return `<label for="${id}">${esc(f.label)}<input id="${id}" type="${f.type}" name="${f.k}" value="${esc(val)}" ${extra} ${f.k === 'owner' ? 'list="owners" autocomplete="off"' : ''}></label>`;
}

function seg4(label, value, cls = '') {
  return `<div><span class="seg-label">${esc(label)}</span><span class="seg-val ${cls}">${value}</span></div>`;
}

function paintDrawer() {
  const { collection, editing, defaults } = drawerState;
  const item = currentItem();
  const d = $('#drawer');
  d.classList.toggle('editing', editing);
  const word = collection === 'events' ? 'calendar item' : collection === 'tasks' ? 'to-do' : 'checklist item';

  if (editing) {
    if (item && !drawerState.snap) drawerState.snap = { ...item };
    const base = drawerState.snap || {
      ...(collection === 'events'
        ? { kind: 'deadline', status: 'internal', dept: S.monthTeam !== 'all' ? S.monthTeam : 'firm', date: S.view === 'month' && S.sel ? S.sel : todayKey() }
        : { dept: DEPTS.some((x) => x.id === S.view) ? S.view : 'firm' }),
      ...defaults,
    };
    const shown = { ...base };
    if (collection === 'events' && (!shown.status || shown.status === 'nodate')) shown.status = 'internal'; // undated items never pretend to be Confirmed
    const fields = fieldsFor(collection);
    let rows = '';
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].half && fields[i + 1]?.half) { rows += `<div class="two">${fieldHtml(fields[i], shown[fields[i].k])}${fieldHtml(fields[i + 1], shown[fields[i + 1].k])}</div>`; i++; }
      else rows += fieldHtml(fields[i], shown[fields[i].k]);
    }
    const owners = [...new Set(S.tasks.flatMap((t) => String(t.owner || '').split(/\s*,\s*/)).map((o) => o.trim()).filter(Boolean).concat(S.me ? [S.me] : []))];
    d.innerHTML = `
      <div class="drawer-head"><h2 id="drawer-title">${item ? 'Edit ' + word : 'New ' + word}</h2>
        <button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>
      <form class="drawer-body form" id="edit-form" novalidate>${rows}<datalist id="owners">${owners.map((o) => `<option value="${esc(o)}">`).join('')}</datalist></form>
      <div class="drawer-foot">
        ${item && collection !== 'coe' ? `<button class="btn btn-danger" type="button" data-act="delete">${icon('trash')}Delete</button>` : '<span></span>'}
        <span class="toolbar"><button class="btn" type="button" data-act="${item ? 'cancel-edit' : 'close'}">Cancel</button><button class="btn btn-primary" type="submit" form="edit-form" data-act="save">Save</button></span>
      </div>`;
    drawerState.initial = formState();
    return;
  }

  const team = dept(item.dept);
  let segs = '';
  if (collection === 'events') {
    const n = daysUntil(item.date);
    const when = item.date ? boardDate(item.date) + (item.end && item.end !== item.date ? ' – ' + boardDate(item.end) : '') : 'No date yet';
    const st = item.status || (item.date ? 'internal' : 'nodate');
    const sCls = { confirmed: 'green', projected: 'amber', nodate: 'red' }[st] || '';
    segs = seg4('When', esc(when)) + seg4('In', item.date ? esc(n < 0 ? 'Past' : n === 0 ? 'Today' : n + (n === 1 ? ' day' : ' days')) : '—')
      + seg4('What', esc(KINDS[item.kind] || item.kind || 'Event')) + seg4('Team', esc(team.name))
      + seg4('Date is', esc(STATUSES[st] || st), sCls);
  } else {
    const n = daysUntil(item.due);
    const inCls = item.done ? 'green' : n !== null && n < 0 ? 'red' : n !== null && n <= 3 ? 'amber' : '';
    segs = seg4('Due', esc(item.due ? boardDate(item.due) : 'No date')) + seg4(item.done ? 'Status' : 'In', item.done ? 'Done' : item.due ? esc(n < 0 ? -n + (n === -1 ? ' day late' : ' days late') : n === 0 ? 'Today' : n + (n === 1 ? ' day' : ' days')) : '—', inCls)
      + seg4('Team', esc(team.name))
      + (collection === 'tasks' ? seg4('Owner', esc(item.owner || 'Nobody yet'), item.owner ? '' : 'amber') : seg4('Points', esc(item.points) + (item.bonus ? ' bonus' : '')))
      + seg4('What', collection === 'tasks' ? 'To-do' : 'Circles item');
  }
  const linked = collection === 'coe' ? S.tasks.filter((t) => t.coe === item.id) : [];
  const coeLink = collection === 'tasks' && item.coe && findItem('coe', item.coe);

  d.innerHTML = `
    <div class="drawer-head">
      <h2 id="drawer-title">${esc(item.title)}</h2>
      <button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button>
    </div>
    <div class="drawer-body">
      <div class="segs">${segs}</div>
      ${collection === 'events' ? `<p class="status-help">${esc(STATUS_HELP[item.status || (item.date ? 'internal' : 'nodate')] || '')}</p>` : ''}
      <p class="desc">${esc(item.desc || 'No description yet. Tap Edit to add one.')}</p>
      ${item.notes ? `<p class="meta"><b>Our notes</b></p><p class="desc">${esc(item.notes)}</p>` : ''}
      ${coeLink ? `<p class="meta">Counts toward Circles of Excellence: <a href="#" data-open="coe:${esc(coeLink.id)}">${esc(coeLink.title)}</a> (+${esc(coeLink.points)})</p>` : ''}
      ${linked.length ? `<p class="meta">Linked to-dos: ${linked.map((t) => `<a href="#" data-open="tasks:${esc(t.id)}">${esc(t.title)}</a>${t.done ? ' (done)' : ''}`).join(', ')}</p>` : ''}
      ${item.source ? `<p class="meta">Source: ${safeLink(item.source)}</p>` : ''}
      ${item.updatedBy ? `<p class="meta">Last changed by ${esc(item.updatedBy)}, ${esc(ago(item.updatedAt))}</p>` : ''}
    </div>
    <div class="drawer-foot">
      ${collection !== 'events' ? `<button class="btn ${item.done ? '' : 'btn-primary'}" data-act="drawer-tick">${item.done ? 'Mark not done' : icon('check') + 'Mark done'}</button>` : '<span></span>'}
      <span class="toolbar">
        ${collection === 'tasks' && !item.done && !ownerMatches(item.owner, S.me) ? `<button class="btn" data-act="take">${icon('user')}Assign to me</button>` : ''}
        <button class="btn" data-act="edit">${icon('edit')}Edit</button>
      </span>
    </div>`;
}

async function saveDrawer() {
  const state = drawerState;
  if (!state || state.saving) return; // no double saves
  const { collection } = state;
  const item = currentItem();
  if (state.id && !item) { closeDrawer(); toast('Someone deleted this item while you were editing it.', true); return; }
  const form = $('#edit-form');
  const title = form.elements.title;
  if (!title.value.trim()) { title.setCustomValidity('Give it a title.'); title.reportValidity(); title.setCustomValidity(''); return; }
  for (const el of form.querySelectorAll('input[type=date]')) if (!el.checkValidity()) { el.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());
  for (const k of Object.keys(data)) data[k] = String(data[k]).trim();
  if (collection === 'events') {
    data.date = data.date || null;
    data.end = data.end && data.date && data.end > data.date ? data.end : null;
    if (!data.date) data.status = 'nodate';
    else if (data.status === 'nodate') data.status = 'internal';
  }
  if ('due' in data) data.due = data.due || null;

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
      saved = await createItem(collection, { id: newId(data.title), done: false, createdAt: new Date().toISOString(), ...(collection === 'tasks' ? { coe: null, source: '' } : {}), ...data });
    }
    toast(item ? 'Saved' : 'Added');
    if (drawerState === state) { // still the same panel (not closed meanwhile)
      drawerState = { collection, id: saved.id, editing: false, defaults: {}, saving: false };
      paintDrawer();
      $('#drawer [data-act=edit]')?.focus();
    }
  } catch {
    state.saving = false;
    if (btn && drawerState === state) { btn.disabled = false; btn.textContent = 'Save'; }
  }
}

// Belt and braces: keep Tab inside the open panel even if inert isn't supported.
document.addEventListener('keydown', (e) => {
  if (!drawerState || e.key !== 'Tab') return;
  const f = [...$('#drawer').querySelectorAll('button, a[href], input, select, textarea')].filter((x) => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (!$('#drawer').contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// What the edit form currently says, to tell whether someone has typed anything.
function formState() {
  const f = $('#edit-form');
  return f ? JSON.stringify([...new FormData(f).entries()]) : '';
}
const drawerIsDirty = () => drawerIsEditing() && !!drawerState.initial && formState() !== drawerState.initial;
// Close the panel, but ask first if there are unsaved changes.
function closeDrawerSafely() {
  if (drawerIsDirty() && !confirm('Discard your unsaved changes?')) return;
  closeDrawer();
}
