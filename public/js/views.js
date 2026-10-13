// The other pages: Month timetable, team to-do lists and the Add page.
'use strict';

// ---------- Shared ruled rows ----------

function taskRowHtml(t) {
  const n = daysUntil(t.due);
  const cls = t.done ? '' : n !== null && n < 0 ? 'overdue' : n !== null && n <= 3 ? 'soon' : '';
  return `<li class="rrow${t.done ? ' is-done' : ''}">
    <button class="tick" role="checkbox" aria-checked="${!!t.done}" aria-label="Done: ${esc(t.title)}" data-tick="tasks:${esc(t.id)}">${icon('check')}</button>
    <button class="rrow-open" data-open="tasks:${esc(t.id)}">
      <span class="r-title">${esc(t.title)}</span>
      ${t.desc ? `<span class="r-desc">${esc(t.desc)}</span>` : ''}
    </button>
    <span class="r-side">
      ${t.due ? `<span class="due ${cls}">${boardDate(t.due)} · ${esc(relDays(n))}</span>` : ''}
      <span class="pill owner${t.owner ? '' : ' none'}">${esc(t.owner || 'Unassigned')}</span>
    </span>
  </li>`;
}

function eventRowHtml(e) {
  const st = e.status || (e.date ? 'internal' : 'nodate');
  return `<li class="rrow no-tick">
    <span class="kdot kd-${esc(e.kind)} r-dot" aria-hidden="true"></span>
    <button class="rrow-open" data-open="events:${esc(e.id)}">
      <span class="r-title">${esc(e.title)}</span>
      <span class="r-desc">${esc(KINDS[e.kind] || e.kind || 'Event')} · ${esc(dept(e.dept).name)}</span>
    </button>
    <span class="r-side"><span class="pill s-${esc(st)}">${esc(STATUSES[st] || st)}</span></span>
  </li>`;
}

// ---------- Month timetable ----------

function monthItems() {
  const out = S.events.filter((e) => e.date && (S.monthTeam === 'all' || e.dept === S.monthTeam)).map((e) => ({ c: 'events', it: e, date: e.date, end: e.end, kind: e.kind }));
  if (S.monthTasks) for (const t of S.tasks) if (t.due && (S.monthTeam === 'all' || t.dept === S.monthTeam)) out.push({ c: 'tasks', it: t, date: t.due, kind: 'task' });
  return out;
}

function monthChip(r, k, dow) {
  const multi = r.end && r.end !== r.date;
  const starts = k === r.date;
  const ends = k === r.end;
  // A multi-day event is one band: the title shows where it starts and at the start of each week; other days continue the band.
  const showText = !multi || starts || dow === 0;
  // How many days the band runs from here to the end of this week, so its title can use that whole width.
  let span = 1;
  if (multi && showText) { const left = Math.round((parseDay(r.end) - parseDay(k)) / 86400000); span = Math.min(left, 6 - dow) + 1; }
  const cls = `chip-ev${r.c === 'tasks' ? ' task' : ''}${r.it.done ? ' done' : ''}${multi ? ' band' : ''}${multi && !starts && dow !== 0 ? ' cont-l' : ''}${multi && !ends && dow !== 6 ? ' cont-r' : ''}`;
  return `<button class="${cls}" data-open="${r.c}:${esc(r.it.id)}" title="${esc(r.it.title)}" ${showText ? '' : 'aria-hidden="true" tabindex="-1"'} ${span > 1 ? `style="--span:${span}"` : ''}>${showText ? `<span class="kdot kd-${esc(r.kind)}"></span><span class="chip-text">${esc(r.it.title)}</span>` : '&nbsp;'}</button>`;
}

function viewMonth() {
  const first = S.month;
  const start = new Date(first); start.setDate(1 - first.getDay());
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const cells = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
  const gridEnd = new Date(start); gridEnd.setDate(start.getDate() + cells - 1);
  const g0 = dayKey(start), g1 = dayKey(gridEnd);

  // Only walk the days that are on screen, so a long event can never slow the grid down.
  const byDay = {};
  for (const r of monthItems()) {
    const rEnd = r.end && r.end > r.date ? r.end : r.date;
    const a = r.date > g0 ? r.date : g0;
    const b = rEnd < g1 ? rEnd : g1;
    if (a > b) continue;
    for (let d = parseDay(a); dayKey(d) <= b; d.setDate(d.getDate() + 1)) (byDay[dayKey(d)] ||= []).push(r);
  }
  const rank = (r) => (r.c === 'tasks' ? 2 : r.end && r.end !== r.date ? 0 : 1);
  const inMonth = (k) => k.slice(0, 7) === dayKey(first).slice(0, 7);
  if (!S.sel || !inMonth(S.sel)) {
    const t = todayKey();
    S.sel = inMonth(t) ? t : (Object.keys(byDay).filter(inMonth).sort()[0] || dayKey(first));
  }
  const t = todayKey();
  let grid = '';
  for (let i = 0; i < cells; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = dayKey(d);
    const list = (byDay[k] || []).sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date));
    const off = list.some((r) => r.kind === 'dayoff');
    const label = `${fmt(k, { weekday: 'long', month: 'long', day: 'numeric' })}${off ? ', no school' : ''}, ${list.length ? list.length + ' item' + (list.length > 1 ? 's' : '') : 'nothing scheduled'}`;
    grid += `<div class="day${d.getMonth() !== first.getMonth() ? ' out' : ''}${k === t ? ' today' : ''}${k === S.sel ? ' sel' : ''}${off ? ' off' : ''}" data-day="${k}">
      <button class="dnum" data-act="pick-day" data-day="${k}" aria-label="${esc(label)}" aria-pressed="${k === S.sel}" tabindex="${k === S.sel ? 0 : -1}">${d.getDate()}</button>
      ${list.slice(0, 3).map((r) => monthChip(r, k, d.getDay())).join('')}
      ${list.length > 3 ? `<span class="more">+${list.length - 3} more</span>` : ''}
      ${list.length ? `<span class="dayphone" aria-hidden="true">${list.slice(0, 4).map((r) => `<i class="kd-${esc(r.kind)}"></i>`).join('')}</span>` : ''}
    </div>`;
  }
  const selList = (byDay[S.sel] || []).sort((a, b) => rank(a) - rank(b));
  const selDate = parseDay(S.sel);
  const teamOk = (x) => S.monthTeam === 'all' || x.dept === S.monthTeam;
  const undatedEvents = S.events.filter((e) => !e.date && teamOk(e));
  const undatedTasks = S.tasks.filter((x) => !x.due && !x.done && teamOk(x));
  const slide = S.slide; S.slide = '';

  return `
    <div class="page-head">
      <div class="month-nav">
        <button class="icon-btn" data-act="prev" aria-label="Previous month">${icon('left')}</button>
        <h1 class="month-name" aria-live="polite">${first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h1>
        <button class="icon-btn" data-act="next" aria-label="Next month">${icon('right')}</button>
        <button class="btn btn-ghost btn-sm" data-act="today">Today</button>
      </div>
      <div class="toolbar">
        <label class="sr" for="month-team">Team</label>
        <select class="compact" id="month-team" data-act="month-team">
          <option value="all">All teams</option>
          ${DEPTS.map((d) => `<option value="${d.id}" ${S.monthTeam === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
        </select>
        <label class="check"><input type="checkbox" data-act="month-tasks" ${S.monthTasks ? 'checked' : ''}> Show to-dos</label>
        <button class="btn btn-primary" data-act="new-event">${icon('plus')}Add to calendar</button>
      </div>
    </div>
    <div class="month-layout">
      <div>
        <div class="month">
          <div class="dow" aria-hidden="true">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<div>${d}</div>`).join('')}</div>
          <div class="weeks${slide ? ' slide-' + slide : ''}" role="group" aria-label="Days. Use arrow keys to move between days.">${grid}</div>
        </div>
        <div class="legend-light" aria-label="Color key">${Object.entries(KINDS).map(([k, v]) => `<span><span class="kdot kd-${k}"></span>${v}</span>`).join('')}${S.monthTasks ? '<span><span class="kdot kd-task"></span>To-do</span>' : ''}<span class="key-hint">Arrow keys move between days</span></div>
      </div>
      <section class="daysheet" aria-label="Selected day">
        <div class="daysheet-head"><b>${selDate.getDate()}</b><span>${fmt(S.sel, { weekday: 'long' })}<br>${fmt(S.sel, { month: 'long', year: 'numeric' })}</span></div>
        ${selList.length ? `<ul class="ruled">${selList.map((r) => (r.c === 'tasks' ? taskRowHtml(r.it) : eventRowHtml(r.it))).join('')}</ul>`
          : `<div class="daysheet-body"><p class="hint" style="font-size:14px">Nothing on this day.</p><button class="btn btn-sm" data-act="new-event">${icon('plus')}Add something on ${esc(fmt(S.sel, { month: 'short', day: 'numeric' }))}</button></div>`}
      </section>
    </div>
    ${undatedEvents.length || undatedTasks.length ? `<section id="nodate" class="nodate" tabindex="-1">
      <h2 class="group-title" style="margin-top:30px">No date yet · ${undatedEvents.length + undatedTasks.length}</h2>
      <p class="hint" style="font-size:14px;margin:-2px 0 10px">Dates nobody has found yet. Ask our teacher, then give each one a date so it shows on the board.</p>
      ${undatedEvents.length ? `<ul class="ruled">${undatedEvents.map(eventRowHtml).join('')}</ul>` : ''}
      ${undatedTasks.length ? `<h3 class="group-title" style="margin-top:16px">To-dos with no due date · ${undatedTasks.length}</h3><ul class="ruled">${undatedTasks.sort((a, b) => String(a.dept || '').localeCompare(String(b.dept || ''))).map(taskRowHtml).join('')}</ul>` : ''}
    </section>` : ''}`;
}

function shiftMonth(step, keepDay) {
  S.month = new Date(S.month.getFullYear(), S.month.getMonth() + step, 1);
  S.sel = keepDay || null;
  S.slide = step > 0 ? 'next' : 'prev';
  render();
}

// Pick a day; a greyed day from the next or previous month switches to that month.
function pickDay(k, focus) {
  const d = parseDay(k);
  const diff = (d.getFullYear() - S.month.getFullYear()) * 12 + d.getMonth() - S.month.getMonth();
  if (diff) shiftMonth(diff, k); else { S.sel = k; render(); }
  if (focus) $(`.dnum[data-day="${k}"]`)?.focus();
}

// ---------- Team to-do lists ----------

function byDue(a, b) { return (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title); }

function viewTeam(id) {
  const d = dept(id);
  const all = S.tasks.filter((t) => t.dept === id);
  const done = all.filter((t) => t.done);
  const open = all.filter((t) => !t.done).sort(byDue);
  const groups = [
    { title: 'Overdue', cls: 'red', items: open.filter((t) => t.due && daysUntil(t.due) < 0) },
    { title: 'Next 2 weeks', items: open.filter((t) => t.due && daysUntil(t.due) >= 0 && daysUntil(t.due) <= 14) },
    { title: 'Later', items: open.filter((t) => t.due && daysUntil(t.due) > 14) },
    { title: 'No date yet', items: open.filter((t) => !t.due) },
  ];
  const doneList = [...done].sort(byDue);
  const emptyMsg = all.length === 0 ? '<b>No to-dos here yet.</b>Tap “Add to-do” to add the first one.' : '<b>All done.</b>Every to-do here is checked off.';

  return `
    <div class="page-head">
      <div><h1>${esc(d.name)}</h1><p>${esc(d.blurb)}</p></div>
      <div class="team-stat">
        <span class="stat-label">Done</span>
        <span class="stat-num">${flap('team-' + id, `${done.length}/${all.length}`)}</span>
        <div class="cells" role="img" aria-label="${done.length} of ${all.length} done">${all.map((t) => `<i class="${t.done ? 'on' : ''}"></i>`).join('')}</div></div>
    </div>
    <div class="team-tools"><span></span><button class="btn btn-primary" data-act="new-task">${icon('plus')}Add to-do</button></div>
    ${open.length === 0 ? `<p class="empty" style="margin-top:16px">${emptyMsg}</p>` : ''}
    ${groups.filter((g) => g.items.length).map((g) => `
      <h2 class="group-title ${g.cls || ''}">${g.title} · ${g.items.length}</h2>
      <ul class="ruled">${g.items.map(taskRowHtml).join('')}</ul>`).join('')}
    ${doneList.length ? `
      <h2 class="group-title">Done · ${doneList.length} <button class="btn btn-ghost btn-sm" data-act="toggle-done" aria-expanded="${S.showDone}">${S.showDone ? 'Hide' : 'Show'}</button></h2>
      ${S.showDone ? `<ul class="ruled">${doneList.map(taskRowHtml).join('')}</ul>` : ''}` : ''}`;
}

// ---------- Add: add a to-do for any team, and see every team's open to-dos in one place ----------

function viewAdd() {
  const dr = S.addDraft || {}; // a to-do whose save failed, typed back in
  S.addDraft = null;
  const lastTeam = DEPTS.some((d) => d.id === (dr.dept || S.addTeam)) ? dr.dept || S.addTeam : 'firm';
  const open = S.tasks.filter((t) => !t.done);
  const unowned = open.filter((t) => !t.owner).length;
  const late = open.filter((t) => t.due && daysUntil(t.due) < 0).length;
  return `
    <div class="page-head">
      <div><h1>Add a to-do</h1><p>Add a to-do for any team. Every team's open to-dos are listed below, so you can check it isn't there already.</p></div>
      <div class="team-stat"><span class="stat-label">Open</span><span class="stat-num">${flap('add-open', String(open.length))}</span>
        <span class="hint" style="font-size:13px">${unowned} unassigned · ${late} overdue</span></div>
    </div>
    <section class="panel add-panel" aria-label="New to-do">
      <form class="form" data-form="add-task" novalidate>
        <label for="add-title">To-do<input id="add-title" type="text" name="title" value="${esc(dr.title)}" required maxlength="160" autocomplete="off"></label>
        <div class="three">
          <label for="add-dept">Team<select id="add-dept" name="dept">${DEPTS.map((d) => `<option value="${d.id}" ${d.id === lastTeam ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>
          <label for="add-due">Due<input id="add-due" type="date" name="due" value="${esc(dr.due)}" min="${DATE_MIN}" max="${DATE_MAX}"></label>
          <label for="add-owner">Who owns it<input id="add-owner" type="text" name="owner" value="${esc(dr.owner)}" maxlength="400" list="add-owners" autocomplete="off" placeholder="First names, comma between"></label>
        </div>
        <datalist id="add-owners">${[...new Set(S.tasks.flatMap((t) => String(t.owner || '').split(/\s*,\s*/)).map((o) => o.trim()).filter(Boolean).concat(S.me ? [S.me] : []))].map((o) => `<option value="${esc(o)}">`).join('')}</datalist>
        <label for="add-desc">Description: what done looks like<textarea id="add-desc" name="desc" maxlength="2000">${esc(dr.desc)}</textarea></label>
        <div class="toolbar"><button class="btn btn-primary" type="submit">${icon('plus')}Add to-do</button></div>
      </form>
    </section>
    ${DEPTS.map((d) => {
      const list = S.tasks.filter((t) => t.dept === d.id && !t.done).sort(byDue);
      const done = S.tasks.filter((t) => t.dept === d.id && t.done).length;
      return `<h2 class="group-title"><a href="#${d.id}">${esc(d.name)}</a> · ${list.length} open${done ? `, ${done} done` : ''}</h2>
        ${list.length ? `<ul class="ruled">${list.map(taskRowHtml).join('')}</ul>` : '<p class="hint" style="font-size:14px;margin:0">No open to-dos.</p>'}`;
    }).join('')}`;
}
