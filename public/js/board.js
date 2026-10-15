// Home: the Circles score, a Coming up list, and a month calendar like a phone's calendar app.
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

// ---------- To-do rows ----------

// "New" pill: someone else changed this since this device was last opened. Nothing shows on the very first visit.
function isNew(x) {
  if (!S.seen || !x || !x.updatedAt) return false;
  const who = (v) => String(v || '').trim().toLowerCase();
  return new Date(x.updatedAt) > new Date(S.seen) && who(x.updatedBy) !== who(S.me);
}
const newPill = (x) => (isNew(x) ? ' <span class="pill new">New</span>' : '');

function todoRow(t, showTeam = false) {
  const n = daysUntil(t.due);
  const cls = n !== null && n < 0 ? 'late' : n !== null && n <= 3 ? 'soon' : '';
  const when = t.due ? (n < 0 ? `${fmt(t.due, { month: 'short', day: 'numeric' })} · ${-n === 1 ? '1 day' : -n + ' days'} late` : `${fmt(t.due)} · ${relDays(n)}`) : 'No date yet';
  const link = t.coe ? findItem('coe', t.coe) : null; // a to-do that counts toward Circles (ticking it does not tick the Circles item)
  const tag = link ? ` <span class="coe-tag" title="Counts toward Circles of Excellence">Circles +${esc(Number(link.points) || 0)}</span>` : '';
  const steps = Array.isArray(t.steps) ? t.steps : [];
  const prog = steps.length ? ` · <span class="step-count">${steps.filter((x) => x.done).length} of ${steps.length} done</span>` : '';
  return `<li class="todo${t.done ? ' is-done' : ''}">
    <button class="tick" role="checkbox" aria-checked="${!!t.done}" aria-label="${t.done ? 'Mark not done' : 'Mark done'}: ${esc(t.title)}" data-tick="tasks:${esc(t.id)}">${icon('check')}</button>
    <button class="todo-open" data-open="tasks:${esc(t.id)}">
      <span class="todo-title">${esc(t.title)}${newPill(t)}</span>
      <span class="todo-sub"><span class="${cls}">${esc(when)}</span>${showTeam ? ` · ${esc(deptLabel(t.dept))}` : ''}${prog}${tag}</span>
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

// ---------- Coming up: late to-dos, then the next 14 days (calendar items and open to-dos together) ----------

const COMING_DAYS = 14;

// The status label of a calendar item, in its status color.
function certaintyPill(e) {
  const st = e.status || (e.date ? 'internal' : 'nodate');
  const label = Object.hasOwn(STATUSES, st) ? STATUSES[st] : st;
  return `<span class="pill s-${esc(st)}">${esc(label)}</span>`;
}

// A calendar item in the list: same shape as a to-do, with a calendar mark where the check box would be.
function comingEventRow(e) {
  const t = todayKey();
  const last = e.end && e.end > e.date ? e.end : e.date;
  const when = fmt(e.date) + (last > e.date ? ' to ' + fmt(last, { month: 'short', day: 'numeric' }) : '');
  const rel = e.date < t ? 'on now' : relDays(daysUntil(e.date));
  return `<li class="todo cal-row">
    <span class="cal-mark" aria-hidden="true">${icon('grid')}</span>
    <button class="todo-open" data-open="events:${esc(e.id)}">
      <span class="todo-title">${esc(e.title)}${newPill(e)}</span>
      <span class="todo-sub">${esc(when)} · ${esc(rel)} · ${esc(deptLabel(e.dept))} · ${certaintyPill(e)}</span>
    </button>
  </li>`;
}

function comingUp() {
  const t = todayKey();
  const end = new Date(today()); end.setDate(end.getDate() + COMING_DAYS);
  const endKey = dayKey(end);
  const byDue = (a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title);
  const open = S.tasks.filter((x) => !x.done && x.due);
  const overdue = open.filter((x) => x.due < t).sort(byDue);
  const rows = [];
  for (const x of open) if (x.due >= t && x.due <= endKey) rows.push({ key: x.due, rank: 1, item: x, html: todoRow(x, true) });
  for (const e of S.events) {
    if (!e.date) continue; // no date yet: it can't be placed on a day
    const last = e.end && e.end > e.date ? e.end : e.date;
    if (last < t || e.date > endKey) continue;
    rows.push({ key: e.date < t ? t : e.date, rank: 0, item: e, html: comingEventRow(e) }); // one already running counts as today
  }
  rows.sort((a, b) => a.key.localeCompare(b.key) || a.rank - b.rank || a.item.title.localeCompare(b.item.title));
  return { overdue, rows };
}

function comingPanel() {
  const { overdue, rows } = comingUp();
  return `<section class="todos coming" aria-labelledby="coming-title">
      <div class="todos-head"><h2 id="coming-title">Coming up</h2></div>
      <div class="todos-body">
        ${overdue.length ? `<h3 class="todo-group late">Overdue (${overdue.length})</h3><ul class="todo-list">${overdue.map((x) => todoRow(x, true)).join('')}</ul>` : ''}
        <h3 class="todo-group">Next ${COMING_DAYS} days (${rows.length})</h3>
        ${rows.length ? `<ul class="todo-list">${rows.map((r) => r.html).join('')}</ul>` : '<p class="hint">Nothing is due in the next 14 days.</p>'}
        <button class="btn btn-wide" type="button" data-act="add-todo">${icon('plus')}Add to-do</button>
        <a class="trash-link" href="#deleted">Recently deleted (${visibleTrash().length})</a>
      </div>
    </section>`;
}

// The list comes first in the page (so it leads on a phone); wide screens put the calendar beside it.
function viewHome() {
  const line = coeLine();
  return `${line ? `<div class="home-top">${line}</div>` : ''}<div class="home">${comingPanel()}${calendarHtml()}</div>`;
}

function shiftMonth(step) {
  S.month = new Date(S.month.getFullYear(), S.month.getMonth() + step, 1);
  render();
}
