// The other pages: one resource page per department, and Recently deleted.
'use strict';

// ---------- Department pages: quick links, learning material, and the team's to-dos ----------

function linkCards(list, empty) {
  if (!list.length) return `<p class="hint">${empty}</p>`;
  return `<div class="links">${list.map((l) => {
    let host = '';
    try { host = new URL(l.url).hostname.replace(/^www\./, ''); } catch { /* shown without a site name */ }
    return `<a class="link-card" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">
      <span class="link-title">${esc(l.title)}${icon('out')}</span>
      ${l.desc ? `<span class="link-note">${esc(l.desc)}</span>` : ''}
      <span class="link-host">${esc(host)}</span>
    </a>`;
  }).join('')}</div>`;
}

function viewDept(id) {
  const d = dept(id);
  const links = S.links.filter((l) => l.dept === id).sort((a, b) => a.title.localeCompare(b.title));
  const todos = S.tasks.filter((t) => t.dept === id && !t.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  return `
    <div class="page-head"><div><h1>${esc(d.name)}</h1><p>${esc(d.blurb)}</p></div></div>
    <h2 class="group-title">Quick links</h2>
    ${linkCards(links.filter((l) => l.section !== 'learn'), 'No links yet. Ask the CEO to add your team’s spreadsheets and accounts.')}
    <h2 class="group-title">Learn</h2>
    ${linkCards(links.filter((l) => l.section === 'learn'), 'No learning material yet.')}
    <h2 class="group-title">${esc(d.name)} to-dos (${todos.length})</h2>
    ${todos.length ? `<ul class="todo-list boxed">${todos.map((t) => todoRow(t, false)).join('')}</ul>` : '<p class="hint">No open to-dos.</p>'}`;
}

// ---------- Recently deleted (everyone logged in) ----------

const TRASH_DAYS = 30;
const TRASH_KIND = { tasks: 'To-do', events: 'Calendar item', links: 'Link', coe: 'Circles item' };

// The server only clears old entries on the next delete, so hide anything past 30 days here.
const TRASH_DAY = 86400000;
const trashAge = (t) => Math.floor((Date.now() - new Date(t.deletedAt)) / TRASH_DAY); // NaN if the date is bad
function visibleTrash() {
  return S.trash.filter((t) => !(Date.now() - new Date(t.deletedAt) > TRASH_DAYS * TRASH_DAY)) // a bad date (NaN) stays visible
    .sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
}

function viewDeleted() {
  const list = visibleTrash();
  const rows = list.map((t) => {
    const raw = trashAge(t);
    const known = Number.isFinite(raw);
    const age = Math.max(0, raw);
    const left = Math.max(0, TRASH_DAYS - age);
    const when = age < 1 ? ago(t.deletedAt) : age === 1 ? '1 day ago' : age + ' days ago';
    const leftText = left === 0 ? 'Clears today' : left === 1 ? '1 day left' : left + ' days left';
    const timing = known ? ` · ${esc(when)} · ${esc(leftText)}` : '';
    return `<li class="trash-row">
      <span class="trash-info"><span class="r-title">${esc(t.title)}</span>
        <span class="r-desc">${esc(TRASH_KIND[t.collection] || 'Item')} · deleted by ${esc(t.deletedBy || 'Someone')}${timing}</span></span>
      <button class="btn btn-sm" type="button" data-act="restore" data-id="${esc(t.id)}">Put back</button>
    </li>`;
  });
  return `
    <div class="page-head">
      <div><h1>Recently deleted${list.length ? ` (${list.length})` : ''}</h1>
      <p>Deleted things wait here for ${TRASH_DAYS} days. Put back brings one back just as it was.</p></div>
      <a class="btn" href="#calendar">${icon('left')}Back to the calendar</a>
    </div>
    ${rows.length ? `<ul class="ruled">${rows.join('')}</ul>` : '<p class="empty">Nothing deleted in the last 30 days.</p>'}`;
}
