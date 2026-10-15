// The other pages: Suggest a to-do, and one resource page per department.
'use strict';

// ---------- Suggest a to-do ----------

function viewSuggest() {
  const dr = S.draft || {}; // a suggestion whose send failed, typed back in
  S.draft = null;
  const waiting = [...S.suggestions].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return `
    <div class="page-head">
      <div><h1>Suggest a to-do</h1>
      <p>Write down anything the firm needs to do. It goes to the CEO first, and shows up on the calendar and to-do list once it's approved.</p></div>
    </div>
    <section class="panel">
      <form class="form" data-form="suggest" novalidate>
        <label for="s-title">What needs to be done?
          <input id="s-title" type="text" name="title" value="${esc(dr.title)}" required maxlength="160" autocomplete="off"></label>
        <label for="s-dept">Which department is it for?
          <select id="s-dept" name="dept" required>
            <option value="" ${dr.dept ? '' : 'selected'} disabled>Choose a department</option>
            ${DEPTS.map((d) => `<option value="${d.id}" ${dr.dept === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
          </select></label>
        <label for="s-due">When is it due? <span class="hint">(if you know)</span>
          <input id="s-due" type="date" name="due" value="${esc(dr.due)}" min="${DATE_MIN}" max="${DATE_MAX}"></label>
        <label for="s-desc">Any details? <span class="hint">(optional)</span>
          <textarea id="s-desc" name="desc" maxlength="2000">${esc(dr.desc)}</textarea></label>
        <div><button class="btn btn-primary" type="submit">Send suggestion</button></div>
      </form>
    </section>
    <h2 class="group-title">Waiting for approval (${waiting.length})</h2>
    ${waiting.length ? `<ul class="ruled">${waiting.map((s) => `<li class="rrow no-tick">
        <span><span class="r-title">${esc(s.title)}</span>
        <span class="r-desc">${esc(dept(s.dept).name)}${s.due ? ' · due ' + esc(fmt(s.due)) : ''} · sent ${esc(ago(s.createdAt))}</span></span>
      </li>`).join('')}</ul>` : '<p class="hint">Nothing waiting right now.</p>'}`;
}

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

// ---------- Recently deleted (owner only) ----------

const TRASH_DAYS = 30;
const TRASH_KIND = { tasks: 'To-do', events: 'Calendar item', links: 'Link', coe: 'Circles item' };

function viewDeleted() {
  const day = 86400000;
  const list = [...S.trash].sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
  const rows = list.map((t) => {
    const age = Math.max(0, Math.floor((Date.now() - new Date(t.deletedAt)) / day));
    const left = Math.max(0, TRASH_DAYS - age);
    const when = age < 1 ? ago(t.deletedAt) : age === 1 ? '1 day ago' : age + ' days ago';
    const leftText = left === 0 ? 'Clears today' : left === 1 ? '1 day left' : left + ' days left';
    return `<li class="trash-row">
      <span class="trash-info"><span class="r-title">${esc(t.title)}</span>
        <span class="r-desc">${esc(TRASH_KIND[t.collection] || 'Item')} · deleted by ${esc(t.deletedBy || 'Someone')} · ${esc(when)} · ${esc(leftText)}</span></span>
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
