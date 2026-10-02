// Home: pinned update strip, the departures board, the Updates rail and the season line map.
'use strict';

const boardRows = () => (isPhone() ? 6 : 12);
const BOARD_FILTERS = [['dates', 'Dates'], ['todos', 'To-dos'], ['mine', 'Mine'], ['all', 'Everything']];

function boardItems() {
  const t = todayKey();
  const out = [];
  const teamOk = (d) => S.boardTeam === 'all' || d === S.boardTeam;
  if (S.boardFilter === 'dates' || S.boardFilter === 'all') {
    for (const e of S.events) {
      if (!e.date || (e.end || e.date) < t || !teamOk(e.dept)) continue;
      out.push({ c: 'events', it: e, date: e.date < t && e.end ? t : e.date });
    }
  }
  if (S.boardFilter !== 'dates') {
    for (const k of S.tasks) {
      if (k.done || !k.due || !teamOk(k.dept)) continue;
      if (S.boardFilter === 'mine' && !ownerMatches(k.owner, S.me)) continue;
      out.push({ c: 'tasks', it: k, date: k.due });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.c === b.c ? 0 : a.c === 'events' ? -1 : 1));
}

function rowStatus(c, it, date) {
  const n = daysUntil(date);
  const ongoing = c === 'events' && it.end && it.date < todayKey() && it.end >= todayKey();
  if (c === 'tasks' && n < 0) return ['overdue', 'Overdue'];
  if (ongoing) return ['today', 'On now'];
  if (n === 0) return ['today', 'Today'];
  if (n <= 3) return ['soon', 'Due soon'];
  if (c === 'tasks') return ['todo', 'To-do'];
  return [it.status || 'internal', BOARD_STATUS[it.status] || 'Our target'];
}

function depRow(r, i) {
  const { c, it, date } = r;
  const n = daysUntil(date);
  const lit = isLit(c, it);
  const [st, label] = rowStatus(c, it, date);
  const inText = n < 0 ? 'Late' : n === 0 ? 'Now' : String(n);
  const d = dept(it.dept);
  const sub = c === 'tasks'
    ? [it.owner ? esc(it.owner) : 'Unassigned', esc(d.name)]
    : [esc(KINDS[it.kind] || it.kind || 'Event'), it.end && it.end !== it.date ? 'to ' + fmt(it.end, { month: 'short', day: 'numeric' }) : '',
      (st === 'soon' || st === 'today') ? esc(STATUSES[it.status] || '') + ' date' : ''];
  const aria = `${fmt(date)}, ${relDays(n)}: ${it.title}. ${d.name}. ${label}.${lit ? ' ' + litWord(c, it) + ' since you last looked.' : ''}`;
  return `<li class="dep${lit ? ' lit' : ''}">
    <button class="dep-open" data-open="${c}:${esc(it.id)}" aria-label="${esc(aria)}" title="${esc(it.title)}"></button>
    <span class="lamp" aria-hidden="true"></span>
    <span class="cell-when">${flap('w' + it.id, boardDate(date), i * 28)}<span class="in-m" aria-hidden="true">${esc(n > 0 ? n + (n === 1 ? ' day' : ' days') : inText)}</span></span>
    <span class="cell-in ${n > 14 ? 'far' : ''}">${flap('i' + it.id, inText, i * 28 + 120)}</span>
    <span class="cell-title">
      ${c === 'tasks' ? `<button class="tick" role="checkbox" aria-checked="false" aria-label="Mark done: ${esc(it.title)}" data-tick="tasks:${esc(it.id)}">${icon('check')}</button>` : ''}
      <span class="title-text"><span class="title-main">${esc(it.title)}</span>
        <span class="title-sub">${lit ? `<span class="tagflap">${litWord(c, it)}</span>` : ''}${sub.filter(Boolean).join(' · ')}</span></span>
    </span>
    <span class="cell-plat">${esc(d.code)}</span>
    <span class="cell-status st-${esc(st)}"><span class="dot" aria-hidden="true"></span>${flap('s' + it.id, label, i * 28 + 220)}</span>
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
  return `<small>${esc(day.toUpperCase())}</small>${flap('clock', time)}`;
}

function boardEmpty() {
  if (S.boardFilter === 'mine') return S.me ? `Nothing with a due date is assigned to ${esc(S.me)}. Open a to-do and put your name in “Who owns it”.` : 'Set your name at the top right to see your to-dos.';
  if (S.boardFilter === 'dates') return 'No upcoming dates with these filters.';
  return 'Nothing departing with these filters.';
}

function viewBoard() {
  const all = boardItems();
  const late = all.filter((r) => r.c === 'tasks' && r.date < todayKey());
  const rest = all.filter((r) => !(r.c === 'tasks' && r.date < todayKey()));
  const limit = boardRows();
  const shown = S.boardFull ? rest : rest.slice(0, limit);
  const undated = S.events.filter((e) => !e.date).length + S.tasks.filter((t) => !t.due && !t.done).length;
  const posts = [...S.posts].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const latest = posts[0];
  const seg = ([id, label]) => `<button data-act="bf" data-v="${id}" aria-pressed="${S.boardFilter === id}">${label}</button>`;

  const strip = latest ? `<div class="alert" role="note">
      <span class="alert-icon">${icon('alert')}</span>
      <div class="alert-body"><div class="alert-text">${esc(latest.title)}</div>
        <div class="alert-meta">Latest update · ${esc(latest.by || latest.updatedBy || 'Someone')} · ${esc(ago(latest.createdAt || latest.updatedAt))}</div></div>
      <a class="btn btn-ghost btn-sm alert-more" href="#updates" data-act="to-updates">All updates</a>
    </div>` : '';

  const rows = [
    ...(late.length ? [lateRow(late)] : []),
    ...(S.showLate ? late.map((r, i) => depRow(r, i)) : []),
    ...shown.map((r, i) => depRow(r, i + 1)),
  ];

  const board = `<section class="board" aria-labelledby="board-title">
      <div class="board-head">
        <h1 class="board-title" id="board-title"><span class="ball" aria-hidden="true"></span>Departures</h1>
        <div class="clock" id="clock" aria-label="Current date and time">${clockHtml()}</div>
      </div>
      <div class="board-controls">
        <div class="seg" role="group" aria-label="Show">${BOARD_FILTERS.map(seg).join('')}</div>
        <label class="sr" for="board-team">Team</label>
        <select class="compact" id="board-team" data-act="board-team">
          <option value="all">All teams</option>
          ${DEPTS.map((d) => `<option value="${d.id}" ${S.boardTeam === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
        </select>
      </div>
      <div class="board-cols" aria-hidden="true"><span></span><span>When</span><span>Days</span><span>${S.boardFilter === 'dates' ? 'Deadline or event' : 'Departure'}</span><span class="col-plat">Team</span><span>Status</span></div>
      ${rows.length ? `<ol class="rows">${rows.join('')}</ol>` : `<p class="board-empty">${boardEmpty()}</p>`}
      <div class="board-foot">
        <div class="legend" aria-label="Status key">
          <span class="st-confirmed"><span class="dot"></span>Confirmed</span>
          <span class="st-projected"><span class="dot"></span>Projected</span>
          <span class="st-soon"><span class="dot"></span>Due soon = 3 days or less</span>
          <span class="lg-lit"><span class="tagflap">New</span>changed since you looked</span>
        </div>
        <div class="toolbar">
          ${undated ? `<a class="btn btn-sm" href="#month" data-act="to-nodate">${undated} with no date yet</a>` : ''}
          ${rest.length > limit ? `<button class="btn btn-sm" data-act="board-full">${S.boardFull ? 'Show less' : `Full board · ${rest.length - limit} more`}</button>` : ''}
        </div>
      </div>
    </section>`;

  setTimeout(() => { flapArmed = true; }, 0);
  return `${strip}<div class="home">${board}${updatesRail(posts)}</div>${lineMap()}`;
}

// ---------- Updates rail ----------

function feedLine(l) {
  const target = logTarget(l);
  const isNew = l.t > PREV_VISIT && !sameName(l.who, S.me);
  const { action, what } = logWords(l);
  const where = target && target.it.dept ? ` <span class="feed-in">in ${esc(dept(target.it.dept).name)}</span>` : '';
  const inner = `<span class="feed-dot" aria-hidden="true"></span>
      <span><b>${esc(l.who)}</b> ${esc(action)} <span class="feed-what">${what}</span>${where}<span class="feed-when">${esc(ago(l.t))}</span></span>`;
  return `<li>${target
    ? `<button class="feed-item${isNew ? ' new' : ''}" data-open="${target.c}:${esc(target.it.id)}">${inner}</button>`
    : `<div class="feed-item${isNew ? ' new' : ''}">${inner}</div>`}</li>`;
}

function updatesRail(posts) {
  const newCount = Math.max(freshLog().length, litItems().length);
  const showPosts = S.olderPosts ? posts : posts.slice(0, 3);
  return `<aside class="updates" id="updates" aria-labelledby="updates-title">
      <div class="updates-head">
        <h2 id="updates-title">Updates ${newCount ? `<span class="newcount">${newCount} new</span>` : ''}</h2>
        ${newCount ? '<button class="btn btn-ghost btn-sm" data-act="seen-all">Mark all seen</button>' : ''}
      </div>
      <div class="updates-scroll" id="updates-scroll">
        <form class="post-form" data-form="post">
          <label class="sr" for="post-text">Post an update for the class</label>
          <textarea id="post-text" name="text" maxlength="280" placeholder="Post an update for the class…"></textarea>
          <div class="post-actions"><span class="charcount">0 / 280</span><span class="toolbar"><button type="button" class="btn btn-ghost btn-sm" data-act="post-cancel">Cancel</button><button class="btn btn-primary btn-sm" type="submit">Post</button></span></div>
        </form>
        ${showPosts.length ? `<ul class="posts">${showPosts.map((p) => `<li class="post" id="post-${esc(p.id)}" tabindex="-1">
            <span class="post-icon">${icon('alert')}</span>
            <div class="post-body"><div class="post-text">${esc(p.title)}</div><div class="post-meta">${esc(p.by || p.updatedBy || 'Someone')} · ${esc(ago(p.createdAt || p.updatedAt))}</div></div>
            <button class="icon-btn" data-act="post-del" data-id="${esc(p.id)}" aria-label="Remove this update" title="Remove">${icon('trash')}</button>
          </li>`).join('')}</ul>` : ''}
        ${posts.length > 3 ? `<button class="btn btn-ghost btn-sm" data-act="older-posts">${S.olderPosts ? 'Fewer posts' : `${posts.length - 3} older posts`}</button>` : ''}
        <div class="feed-title"><span>Just added</span><a href="#log">Full log</a></div>
        ${logLines(12).length ? `<ul class="feed">${logLines(12).map(feedLine).join('')}</ul>` : '<p class="hint">Changes show up here the moment anyone makes them.</p>'}
      </div>
    </aside>`;
}

// ---------- Season line map ----------

const SEASON = { start: '2026-09-01', end: '2027-06-15' };
function pos(s) {
  const a = parseDay(SEASON.start), b = parseDay(SEASON.end), d = parseDay(s);
  return Math.max(0, Math.min(100, ((d - a) / (b - a)) * 100));
}

function lineMap() {
  const t = todayKey();
  const keyKinds = ['deadline', 'competition', 'tradeshow', 'trip'];
  const evs = S.events
    .filter((e) => e.date && e.date >= SEASON.start && e.date <= SEASON.end && keyKinds.includes(e.kind) && !/Circles of Excellence|bonus points/i.test(e.title))
    .sort((a, b) => a.date.localeCompare(b.date));
  // Stops closer than ~2.5% of the line (about a week) merge into one, so no stop sits on top of another.
  const groups = [];
  for (const e of evs) {
    const x = pos(e.date);
    const g = groups[groups.length - 1];
    if (g && x - g.x0 < 2.5) g.list.push(e); else groups.push({ x0: x, list: [e] });
  }
  const majorRank = (e) => (e.kind === 'tradeshow' ? 0 : e.kind === 'trip' ? 1 : /submission deadline/i.test(e.title) ? 2 : 9);
  let lastA = -99, lastB = -99;
  const stations = groups.map((g) => {
    const list = [...g.list].sort((a, b) => majorRank(a) - majorRank(b));
    const lead = list[0];
    const major = majorRank(lead) < 9;
    const x = list.reduce((s, e) => s + pos(e.date), 0) / list.length;
    let tier = 'hover';
    if (major) { if (x - lastA >= 10) { tier = 'a'; lastA = x; } else if (x - lastB >= 10) { tier = 'b'; lastB = x; } }
    const label = shortTitle(lead) + (list.length > 1 ? ` +${list.length - 1}` : '');
    const done = list.every((e) => (e.end || e.date) < t);
    const target = list.length > 1 ? `data-act="map-day" data-day="${esc(lead.date)}"` : `data-open="events:${esc(lead.id)}"`;
    return `<button class="station${major ? ' major' : ''}${done ? ' done' : ''}" style="left:${x}%" ${target}
        aria-label="${esc(list.map((e) => fmt(e.date) + ': ' + e.title).join('; '))}">
        <span class="station-label ${tier === 'b' ? 'tier-b' : ''} ${tier === 'hover' ? 'hover-only' : ''}">${esc(label)}</span></button>`;
  }).join('');

  const months = [];
  for (let d = parseDay(SEASON.start); dayKey(d) <= SEASON.end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    months.push(`<span class="month-tick" style="left:${pos(dayKey(d))}%">${MONTHS[d.getMonth()]}</span>`);
  }
  const bands = PERIODS.filter((p) => !p.bonus).map((p) => {
    const a = pos(p.starts < SEASON.start ? SEASON.start : p.starts), b = pos(p.ends);
    const now = t >= p.starts && t <= p.ends;
    return `<span class="period-band${now ? ' now' : ''}" style="left:${a}%;width:${b - a}%" title="Circles of Excellence ${p.name}">${p.short}</span>`;
  }).join('');
  const here = pos(t);
  return `<section class="linemap" aria-labelledby="line-title">
      <div class="linemap-head"><h2 id="line-title">The season line</h2><p>Every stop from now to the Summit. Bands are the Circles of Excellence periods. Tap a stop for details; a stop with “+” opens that week in Month.</p></div>
      <div class="linemap-scroll" id="linemap-scroll"><div class="track">
        <span class="track-line"></span><span class="track-past" style="width:${here}%"></span>
        ${bands}${months.join('')}${stations}
        <span class="here" style="left:${here}%"><span class="ball"></span><span class="here-label">TODAY</span></span>
      </div></div>
    </section>`;
}

// Keep the clock ticking without repainting the board.
setInterval(() => { const c = $('#clock'); if (c) c.innerHTML = clockHtml(); }, 20000);
