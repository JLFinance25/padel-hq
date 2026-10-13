// Home: one departures board with every to-do and every deadline or event, sorted by date.
'use strict';

const boardRows = () => (isPhone() ? 6 : 12);

function boardItems() {
  const t = todayKey();
  const out = [];
  for (const e of S.events) {
    if (!e.date || (e.end || e.date) < t || e.kind === 'dayoff') continue;
    out.push({ c: 'events', it: e, date: e.date < t && e.end ? t : e.date });
  }
  for (const k of S.tasks) if (!k.done && k.due) out.push({ c: 'tasks', it: k, date: k.due });
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.c === b.c ? 0 : a.c === 'events' ? -1 : 1));
}

function rowStatus(c, it, date) {
  const n = daysUntil(date);
  const ongoing = c === 'events' && it.end && it.date < todayKey() && it.end >= todayKey();
  if (c !== 'events' && n < 0) return ['overdue', 'Overdue'];
  if (ongoing) return ['today', 'On now'];
  if (n === 0) return ['today', 'Today'];
  if (n <= 3) return ['soon', 'Due soon'];
  return ['', '']; // how sure a date is shows in the detail panel, not on the board
}

function depRow(r, i) {
  const { c, it, date } = r;
  const n = daysUntil(date);
  const [st, label] = rowStatus(c, it, date);
  const inText = n < 0 ? 'Late' : n === 0 ? 'Now' : String(n);
  const d = dept(it.dept);
  const sub = c === 'tasks' ? [it.owner ? esc(it.owner) : 'Unassigned', esc(d.name)]
    : [esc(KINDS[it.kind] || it.kind || 'Event'), it.end && it.end !== it.date ? 'to ' + fmt(it.end, { month: 'short', day: 'numeric' }) : ''];
  const aria = `${fmt(date)}, ${relDays(n)}: ${it.title}. ${d.name}.${label ? ' ' + label + '.' : ''}`;
  return `<li class="dep">
    <button class="dep-open" data-open="${c}:${esc(it.id)}" aria-label="${esc(aria)}" title="${esc(it.title)}"></button>
    <span class="lamp" aria-hidden="true"></span>
    <span class="cell-when">${flap('w' + it.id, boardDate(date), i * 28)}<span class="in-m" aria-hidden="true">${esc(n > 0 ? n + (n === 1 ? ' day' : ' days') : inText)}</span></span>
    <span class="cell-in ${n > 14 ? 'far' : ''}">${flap('i' + it.id, inText, i * 28 + 120)}</span>
    <span class="cell-title">
      ${c !== 'events' ? `<button class="tick" role="checkbox" aria-checked="false" aria-label="Mark done: ${esc(it.title)}" data-tick="${c}:${esc(it.id)}">${icon('check')}</button>` : ''}
      <span class="title-text"><span class="title-main">${esc(it.title)}</span>
        <span class="title-sub">${sub.filter(Boolean).join(' · ')}</span></span>
    </span>
    <span class="cell-plat">${esc(d.code)}</span>
    <span class="cell-status${st ? ' st-' + st : ''}">${label ? `<span class="dot" aria-hidden="true"></span>${flap('s' + it.id, label, i * 28 + 220)}` : ''}</span>
  </li>`;
}

// All late to-dos fold into one row so they don't push the real deadlines off the board.
function lateRow(late) {
  return `<li class="dep late-row">
    <button class="dep-open" data-act="toggle-late" aria-expanded="${S.showLate}" aria-label="${late.length} late to-dos. ${S.showLate ? 'Hide them' : 'Show them'}."></button>
    <span class="lamp" aria-hidden="true"></span>
    <span class="cell-when"><span class="late-count">${late.length}</span></span>
    <span class="cell-in">Late</span>
    <span class="cell-title"><span class="title-text"><span class="title-main">Late to-dos</span><span class="title-sub">${S.showLate ? 'Showing them below' : 'Past their due date and not checked off. Tap to see them.'}</span></span></span>
    <span class="cell-plat"></span>
    <span class="cell-status st-overdue"><span class="dot" aria-hidden="true"></span>${S.showLate ? 'Hide' : 'Show'}</span>
  </li>`;
}

function clockHtml() {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' }).replace(',', '');
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/, '');
  const [h, m] = time.split(':');
  // Hours and minutes flip on their own; the colon between them ticks like a station clock.
  return `<small>${esc(day.toUpperCase())}</small><span class="clock-time">${flap('clock-h', h)}<span class="colon" aria-hidden="true">:</span>${flap('clock-m', m)}</span>`;
}

function viewBoard() {
  const all = boardItems();
  const late = all.filter((r) => r.c !== 'events' && r.date < todayKey());
  const rest = all.filter((r) => !(r.c !== 'events' && r.date < todayKey()));
  const limit = boardRows();
  const shown = S.boardFull ? rest : rest.slice(0, limit);
  const undated = S.events.filter((e) => !e.date).length + S.tasks.filter((t) => !t.due && !t.done).length;
  const rows = [
    ...(late.length ? [lateRow(late)] : []),
    ...(S.showLate ? late.map((r, i) => depRow(r, i)) : []),
    ...shown.map((r, i) => depRow(r, i + 1)),
  ];
  setTimeout(() => { flapArmed = true; }, 0);
  return `<section class="board" aria-labelledby="board-title">
      <div class="board-head">
        <h1 class="board-title" id="board-title"><span class="ball" aria-hidden="true"></span>Departures</h1>
        <div class="clock" id="clock" aria-label="Current date and time">${clockHtml()}</div>
      </div>
      <div class="board-cols" aria-hidden="true"><span></span><span>When</span><span>Days</span><span>To-do or deadline</span><span class="col-plat">Team</span><span></span></div>
      ${rows.length ? `<ol class="rows">${rows.join('')}</ol>` : `<p class="board-empty">Nothing coming up. Add a to-do from the “Add to-do” tab.</p>`}
      ${undated || rest.length > limit ? `<div class="board-foot"><span></span><div class="toolbar">
        ${undated ? `<a class="btn btn-sm" href="#month" data-act="to-nodate">${undated} with no date yet</a>` : ''}
        ${rest.length > limit ? `<button class="btn btn-sm" data-act="board-full">${S.boardFull ? 'Show less' : `Full board · ${rest.length - limit} more`}</button>` : ''}
      </div></div>` : ''}
    </section>`;
}

// Keep the clock ticking without repainting the board.
setInterval(() => { const c = $('#clock'); if (c) c.innerHTML = clockHtml(); }, 20000);
