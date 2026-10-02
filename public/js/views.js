// The other pages: Month timetable, team to-do lists, Circles of Excellence, and the Log.
'use strict';

// ---------- Shared ruled rows ----------

function taskRowHtml(t) {
  const n = daysUntil(t.due);
  const cls = t.done ? '' : n !== null && n < 0 ? 'overdue' : n !== null && n <= 7 ? 'soon' : '';
  const coe = t.coe && findItem('coe', t.coe);
  const lit = isLit('tasks', t);
  return `<li class="rrow${t.done ? ' is-done' : ''}${lit ? ' lit' : ''}">
    <button class="tick" role="checkbox" aria-checked="${!!t.done}" aria-label="Done: ${esc(t.title)}" data-tick="tasks:${esc(t.id)}">${icon('check')}</button>
    <button class="rrow-open" data-open="tasks:${esc(t.id)}">
      <span class="r-title">${esc(t.title)}${lit ? `<span class="pill new">${litWord('tasks', t)}</span>` : ''}</span>
      ${t.desc ? `<span class="r-desc">${esc(t.desc)}</span>` : ''}
    </button>
    <span class="r-side">
      ${t.due ? `<span class="due ${cls}">${boardDate(t.due)} · ${esc(relDays(n))}</span>` : ''}
      <span class="pill owner${t.owner ? '' : ' none'}">${esc(t.owner || 'Unassigned')}</span>
      ${coe ? `<span class="pill coe" title="Counts toward Circles of Excellence">Circles +${esc(coe.points)}</span>` : ''}
    </span>
  </li>`;
}

function eventRowHtml(e) {
  const lit = isLit('events', e);
  const st = e.status || (e.date ? 'internal' : 'nodate');
  return `<li class="rrow no-tick${lit ? ' lit' : ''}">
    <span class="kdot kd-${esc(e.kind)} r-dot" aria-hidden="true"></span>
    <button class="rrow-open" data-open="events:${esc(e.id)}">
      <span class="r-title">${esc(e.title)}${lit ? `<span class="pill new">${litWord('events', e)}</span>` : ''}</span>
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
  const cls = `chip-ev${r.c === 'tasks' ? ' task' : ''}${r.it.done ? ' done' : ''}${isLit(r.c, r.it) ? ' lit' : ''}${multi ? ' band' : ''}${multi && !starts && dow !== 0 ? ' cont-l' : ''}${multi && !ends && dow !== 6 ? ' cont-r' : ''}`;
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
    const label = `${fmt(k, { weekday: 'long', month: 'long', day: 'numeric' })}, ${list.length ? list.length + ' item' + (list.length > 1 ? 's' : '') : 'nothing scheduled'}`;
    grid += `<div class="day${d.getMonth() !== first.getMonth() ? ' out' : ''}${k === t ? ' today' : ''}${k === S.sel ? ' sel' : ''}" data-day="${k}">
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
      <p class="hint" style="font-size:14px;margin:-2px 0 10px">Dates nobody has found yet. Ask Ms. Garrison, then give each one a date so it shows on the board.</p>
      ${undatedEvents.length ? `<ul class="ruled">${undatedEvents.map(eventRowHtml).join('')}</ul>` : ''}
      ${undatedTasks.length ? `<h3 class="group-title" style="margin-top:16px">To-dos with no due date · ${undatedTasks.length}</h3><ul class="ruled">${undatedTasks.sort((a, b) => a.dept.localeCompare(b.dept)).map(taskRowHtml).join('')}</ul>` : ''}
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
  let list = all;
  if (S.taskFilter === 'mine') list = list.filter((t) => ownerMatches(t.owner, S.me));
  if (S.taskFilter === 'unassigned') list = list.filter((t) => !t.owner);
  const open = list.filter((t) => !t.done).sort(byDue);
  const groups = [
    { title: 'Overdue', cls: 'red', items: open.filter((t) => t.due && daysUntil(t.due) < 0) },
    { title: 'Next 2 weeks', items: open.filter((t) => t.due && daysUntil(t.due) >= 0 && daysUntil(t.due) <= 14) },
    { title: 'Later', items: open.filter((t) => t.due && daysUntil(t.due) > 14) },
    { title: 'No date yet', items: open.filter((t) => !t.due) },
  ];
  const doneList = list.filter((t) => t.done).sort(byDue);
  const seg = (v, label) => `<button data-act="tf" data-v="${v}" aria-pressed="${S.taskFilter === v}">${label}</button>`;
  const emptyMsg = all.length === 0 ? '<b>No to-dos here yet.</b>Add the first one above.'
    : S.taskFilter === 'mine' ? (S.me ? `<b>Nothing here is assigned to ${esc(S.me)}.</b>Open a to-do and put your name in “Who owns it”.` : '<b>Set your name first.</b>Tap the name button at the top right.')
    : S.taskFilter === 'unassigned' ? '<b>Everything here has an owner.</b>' : '<b>All done.</b>Every to-do here is checked off.';

  return `
    <div class="page-head">
      <div><h1>${esc(d.name)}</h1><p>${esc(d.blurb)}</p></div>
      <div><span class="stat-text">${done.length} of ${all.length} done</span>
        <div class="cells" role="img" aria-label="${done.length} of ${all.length} done">${all.map((t) => `<i class="${t.done ? 'on' : ''}"></i>`).join('')}</div></div>
    </div>
    <form class="addbar" data-form="quick-task">
      <label class="sr" for="quick-title">New to-do for ${esc(d.name)}</label>
      <input id="quick-title" type="text" name="title" placeholder="Add a to-do for ${esc(d.name)}…" maxlength="160" autocomplete="off">
      <label class="sr" for="quick-due">Due date (optional)</label>
      <input id="quick-due" type="date" name="due" min="${DATE_MIN}" max="${DATE_MAX}" title="Due date (optional)">
      <button class="btn btn-primary" type="submit">${icon('plus')}Add</button>
    </form>
    <div class="seg" role="group" aria-label="Filter">${seg('all', 'Everything')}${seg('mine', 'Mine')}${seg('unassigned', 'Unassigned')}</div>
    ${open.length === 0 ? `<p class="empty" style="margin-top:16px">${emptyMsg}</p>` : ''}
    ${groups.filter((g) => g.items.length).map((g) => `
      <h2 class="group-title ${g.cls || ''}">${g.title} · ${g.items.length}</h2>
      <ul class="ruled">${g.items.map(taskRowHtml).join('')}</ul>`).join('')}
    ${doneList.length ? `
      <h2 class="group-title">Done · ${doneList.length} <button class="btn btn-ghost btn-sm" data-act="toggle-done" aria-expanded="${S.showDone}">${S.showDone ? 'Hide' : 'Show'}</button></h2>
      ${S.showDone ? `<ul class="ruled">${doneList.map(taskRowHtml).join('')}</ul>` : ''}` : ''}`;
}

// ---------- Circles of Excellence ----------

function coeScore() {
  const standard = S.coe.filter((c) => !c.bonus && c.done).reduce((s, c) => s + (Number(c.points) || 0), 0);
  const cap = (p) => Math.min(2, S.coe.filter((c) => c.bonus && c.period === p && c.done).reduce((s, c) => s + (Number(c.points) || 0), 0));
  return { standard, bonus: cap('fall-bonus') + cap('spring-bonus') };
}

function viewCoe() {
  const { standard, bonus } = coeScore();
  const pct = Math.round((standard / COE_TOTAL) * 100);
  const goldAt = Math.ceil(0.9 * COE_TOTAL);
  const next = TIERS.find((t) => pct < t.pct);
  const need = next ? Math.ceil((next.pct / 100) * COE_TOTAL) - standard : 0;
  const toGold = Math.max(0, goldAt - standard);
  const msg = !next ? 'Gold. Keep every box checked through May.'
    : next.id === 'gold' ? `${toGold} more point${toGold === 1 ? '' : 's'} to Gold`
    : `${toGold} points to Gold · ${need} to ${next.name}`;
  const tiers = TIERS.map((t) => `<span class="tier ${t.id}" style="left:${t.pct}%">${t.name}<small>${Math.ceil((t.pct / 100) * COE_TOTAL)}</small></span>`).join('');

  return `
    <div class="page-head">
      <div><h1>Circles of Excellence</h1><p>VE's point checklist for the year. Gold means finishing 90% or more. Our goal: every point, every period.</p></div>
      <a class="btn btn-sm" href="https://veinternational.org/circles-of-excellence/" target="_blank" rel="noopener noreferrer">VE's official page ${icon('out')}</a>
    </div>
    <section class="coe-hero" aria-label="Our score: ${standard} of ${COE_TOTAL} points">
      <div class="score">${flap('coe-score', String(standard).padStart(2, '0'))}<span class="score-of">of ${COE_TOTAL}<br>points</span></div>
      <div>
        <div class="coe-track"><div class="coe-fill" style="transform:scaleX(${Math.min(100, pct) / 100})"></div>${tiers}</div>
        <p class="coe-msg">${esc(msg)}</p>
        <p class="coe-note">Bonus points: ${bonus} of 4. Check an item off when it is submitted or finished, not when it is started. The bar uses the 60 regular points, because whether VE counts bonus points toward the percentage is unverified. Heads up: VE's page says the year totals 60, but its listed items add up to 61 (Period 5 is labeled 16 and its items add to 17). Ms. Garrison should confirm which is right.</p>
      </div>
    </section>
    ${S.coe.length === 0 ? '<p class="empty"><b>The checklist is empty.</b>Load the starter data from the Log tab.</p>' : ''}
    ${PERIODS.map((p) => {
      const items = S.coe.filter((c) => String(c.period) === String(p.id)).sort(byDue);
      if (!items.length) return '';
      const raw = items.filter((c) => c.done).reduce((s, c) => s + (Number(c.points) || 0), 0);
      const got = p.bonus ? Math.min(2, raw) : raw;
      const max = items.reduce((s, c) => s + (Number(c.points) || 0), 0);
      const left = daysUntil(p.ends);
      const missed = left < 0 && got < max && !p.bonus;
      return `<section class="period${missed ? ' missed' : ''}">
        <div class="period-head"><h3>${p.name} · ${p.span}</h3>
          <span><b>${got}</b> / ${p.bonus ? '2 max' : max} pts · ${left < 0 ? 'Closed' : 'Closes ' + boardDate(p.ends) + ' · ' + relDays(left)}</span></div>
        <ul class="ruled">${items.map((c) => {
          const lit = isLit('coe', c);
          return `<li class="rrow${c.done ? ' is-done' : ''}${lit ? ' lit' : ''}">
            <button class="tick" role="checkbox" aria-checked="${!!c.done}" aria-label="Done: ${esc(c.title)}" data-tick="coe:${esc(c.id)}">${icon('check')}</button>
            <button class="rrow-open" data-open="coe:${esc(c.id)}">
              <span class="r-title">${esc(c.title)}${lit ? `<span class="pill new">${litWord('coe', c)}</span>` : ''}</span>
              <span class="r-desc">${esc(dept(c.dept).name)}${c.due && !p.bonus ? ' · due ' + esc(fmt(c.due, { month: 'short', day: 'numeric' })) : ''}</span>
            </button>
            <span class="r-side"><span class="pts">${Number(c.points) ? '+' + esc(c.points) : '0 pts'}</span></span>
          </li>`;
        }).join('')}</ul>
      </section>`;
    }).join('')}`;
}

// ---------- Log ----------

function viewLog() {
  const empty = !S.events.length && !S.tasks.length && !S.coe.length;
  const importPanel = `<details class="panel" ${empty ? 'open' : ''}>
      <summary>Setup: load starter data</summary>
      <p>For whoever sets the site up. Adds the researched calendar, the to-dos and the Circles of Excellence checklist from a <code>seed.json</code> file. It only adds items that aren't here yet, so it never overwrites anyone's changes.</p>
      <input type="file" accept="application/json,.json" data-act="import" aria-label="Choose seed.json">
    </details>`;
  const lines = logLines(100);
  return `
    <div class="page-head"><div><h1>Log</h1><p>Every change anyone makes, newest first. The last 100 show here.</p></div></div>
    ${empty ? importPanel : ''}
    ${lines.length ? `<ul class="ruled">${lines.map((l) => {
      const target = logTarget(l);
      const { action, what } = logWords(l);
      const text = `<span><b>${esc(l.who)}</b> ${esc(action)} ${what}</span>`;
      return `<li class="rrow no-tick">
        ${target ? `<button class="rrow-open" data-open="${target.c}:${esc(target.it.id)}">${text}</button>` : text}
        <span class="r-side"><time class="log-when" datetime="${esc(l.t)}">${esc(ago(l.t))}</time></span>
      </li>`;
    }).join('')}</ul>` : '<p class="empty"><b>No changes yet.</b>Everything anyone adds, edits or checks off will show here.</p>'}
    ${empty ? '' : importPanel}`;
}

async function importFile(file) {
  try {
    const data = JSON.parse(await file.text());
    const r = await api('/api/import', { method: 'POST', body: JSON.stringify({ data, who: S.me }) });
    toast(`Added ${r.added} items${r.skipped ? `, skipped ${r.skipped} already here` : ''}`);
    await refresh();
  } catch (e) {
    toast('Import failed: ' + e.message, true);
  }
}
