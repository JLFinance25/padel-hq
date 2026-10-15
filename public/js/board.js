// Home: a month calendar like a phone's calendar app, with the to-do list in a sidebar.
'use strict';

// ---------- Calendar ----------

// Calendar items on a given day (a multi-day item shows on every day it covers).
function eventsByDay(from, to) {
  const byDay = {};
  for (const e of S.events) {
    if (!e.date) continue;
    const end = e.end && e.end > e.date ? e.end : e.date;
    const a = e.date > from ? e.date : from;
    const b = end < to ? end : to;
    for (let d = parseDay(a); a <= b && dayKey(d) <= b; d.setDate(d.getDate() + 1)) (byDay[dayKey(d)] ||= []).push(e);
  }
  for (const k of Object.keys(byDay)) byDay[k].sort((x, y) => (x.kind === 'dayoff' ? -1 : 0) - (y.kind === 'dayoff' ? -1 : 0) || x.title.localeCompare(y.title));
  return byDay;
}

function calendarHtml() {
  const first = S.month;
  const start = new Date(first); start.setDate(1 - first.getDay());
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const cells = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
  const gridEnd = new Date(start); gridEnd.setDate(start.getDate() + cells - 1);
  const byDay = eventsByDay(dayKey(start), dayKey(gridEnd));
  const t = todayKey();
  let grid = '';
  for (let i = 0; i < cells; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = dayKey(d);
    const list = byDay[k] || [];
    const off = list.some((e) => e.kind === 'dayoff');
    const label = `${fmt(k, { weekday: 'long', month: 'long', day: 'numeric' })}${list.length ? `, ${list.length} item${list.length > 1 ? 's' : ''}` : ''}`;
    grid += `<div class="day${d.getMonth() !== first.getMonth() ? ' out' : ''}${k === t ? ' today' : ''}${off ? ' off' : ''}">
      <button class="dnum" data-act="open-day" data-day="${k}" aria-label="${esc(label)}">${d.getDate()}</button>
      ${list.slice(0, 3).map((e) => `<button class="chip kind-${esc(e.kind)}" data-open="events:${esc(e.id)}" title="${esc(e.title)}">${esc(e.title)}</button>`).join('')}
      ${list.length > 3 ? `<button class="more" data-act="open-day" data-day="${k}">${list.length - 3} more</button>` : ''}
      ${list.length ? `<span class="dots" aria-hidden="true">${list.slice(0, 3).map((e) => `<i class="kind-${esc(e.kind)}"></i>`).join('')}</span>` : ''}
    </div>`;
  }
  return `<section class="cal" aria-label="Calendar">
      <div class="cal-head">
        <h1 class="cal-title"><b>${first.toLocaleDateString('en-US', { month: 'long' })}</b> ${first.getFullYear()}</h1>
        <div class="cal-nav">
          <button class="icon-btn round" data-act="prev" aria-label="Previous month">${icon('left')}</button>
          <button class="btn btn-pill" data-act="add-event">${icon('plus')}Add</button>
          <button class="btn btn-pill" data-act="today">Today</button>
          <button class="icon-btn round" data-act="next" aria-label="Next month">${icon('right')}</button>
        </div>
      </div>
      <div class="month">
        <div class="dow" aria-hidden="true">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((x) => `<div>${x}</div>`).join('')}</div>
        <div class="weeks">${grid}</div>
      </div>
      <div class="legend">${Object.entries(KINDS).map(([k, v]) => `<span><i class="kind-${k}"></i>${v}</span>`).join('')}</div>
    </section>`;
}

// ---------- To-do sidebar ----------

function todoRow(t, showTeam = S.todoTeam === 'all') {
  const n = daysUntil(t.due);
  const cls = n !== null && n < 0 ? 'late' : n !== null && n <= 3 ? 'soon' : '';
  const when = t.due ? (n < 0 ? `${fmt(t.due, { month: 'short', day: 'numeric' })} · ${-n === 1 ? '1 day' : -n + ' days'} late` : `${fmt(t.due)} · ${relDays(n)}`) : 'No date yet';
  const link = t.coe ? findItem('coe', t.coe) : null; // a to-do that counts toward Circles (ticking it does not tick the Circles item)
  const tag = link ? ` <span class="coe-tag" title="Counts toward Circles of Excellence">Circles +${esc(Number(link.points) || 0)}</span>` : '';
  return `<li class="todo">
    <button class="tick" role="checkbox" aria-checked="${!!t.done}" aria-label="Mark done: ${esc(t.title)}" data-tick="tasks:${esc(t.id)}">${icon('check')}</button>
    <button class="todo-open" data-open="tasks:${esc(t.id)}">
      <span class="todo-title">${esc(t.title)}</span>
      <span class="todo-sub"><span class="${cls}">${esc(when)}</span>${showTeam ? ` · ${esc(dept(t.dept).name)}` : ''}${tag}</span>
    </button>
  </li>`;
}

// One line of Circles score above the list, linking to the Circles page.
function coeLine() {
  if (!S.coe.length) return '';
  const { done } = coeScore();
  const next = TIERS.find((t) => done < t.points);
  return `<a class="coe-line" href="#circles"><b>Circles: ${done} of ${COE_TOTAL}</b> <span>· ${next ? `${esc(next.name)} at ${next.points}` : 'Gold reached'}</span></a>`;
}

function todoSidebar() {
  const open = S.tasks.filter((t) => !t.done && (S.todoTeam === 'all' || t.dept === S.todoTeam))
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title));
  const groups = [
    ['Late', 'late', open.filter((t) => t.due && daysUntil(t.due) < 0)],
    ['Next 7 days', '', open.filter((t) => t.due && daysUntil(t.due) >= 0 && daysUntil(t.due) <= 7)],
    ['Later', '', open.filter((t) => t.due && daysUntil(t.due) > 7)],
    ['No date yet', '', open.filter((t) => !t.due)],
  ].filter((g) => g[2].length);
  return `<aside class="todos" aria-labelledby="todo-title">
      <div class="todos-head">
        <h2 id="todo-title">To-do list</h2>
        <label class="sr" for="todo-team">Department</label>
        <select id="todo-team" data-act="todo-team">
          <option value="all">All departments</option>
          ${DEPTS.map((d) => `<option value="${d.id}" ${S.todoTeam === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
        </select>
      </div>
      <div class="todos-body">
        ${coeLine()}
        ${groups.length ? groups.map(([title, cls, items]) => `<h3 class="todo-group ${cls}">${title} (${items.length})</h3><ul class="todo-list">${items.map((t) => todoRow(t)).join('')}</ul>`).join('')
          : '<p class="hint">Nothing to do here. Nice.</p>'}
        <button class="btn btn-wide" type="button" data-act="add-todo">${icon('plus')}Add to-do</button>
        <a class="trash-link" href="#deleted">Recently deleted (${visibleTrash().length})</a>
      </div>
    </aside>`;
}

function viewHome() {
  return `<div class="home">${calendarHtml()}${todoSidebar()}</div>`;
}

function shiftMonth(step) {
  S.month = new Date(S.month.getFullYear(), S.month.getMonth() + step, 1);
  render();
}
