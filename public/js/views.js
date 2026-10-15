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

// ---------- Circles of Excellence ----------

const pointsWord = (n) => `${n} point${n === 1 ? '' : 's'}`;
const coePts = (c) => Number(c.points) || 0;

// Which numbered period is today in (before the first one counts as the first, after the last as the last).
function currentPeriodId() {
  const t = todayKey();
  const numbered = PERIODS.filter((p) => !p.bonus);
  const hit = numbered.find((p) => t >= p.starts && t <= p.ends);
  return (hit || (t < numbered[0].starts ? numbered[0] : numbered[numbered.length - 1])).id;
}

// "Checked by Alex · Oct 15" for a ticked item.
function checkedBy(c) {
  if (!c.done) return '';
  const day = c.doneAt && !isNaN(new Date(c.doneAt)) ? new Date(c.doneAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const parts = [c.doneBy ? 'Checked by ' + c.doneBy : 'Checked off', day].filter(Boolean);
  return parts.join(' · ');
}

function coeRowHtml(c, bonus) {
  const n = daysUntil(c.due);
  const late = !c.done && n !== null && n < 0;
  const dueText = c.due && !bonus ? `due ${fmt(c.due, { month: 'short', day: 'numeric' })}` : '';
  const who = checkedBy(c);
  return `<li class="coe-row${c.done ? ' is-done' : ''}">
    <button class="tick" role="checkbox" aria-checked="${!!c.done}" aria-label="Done: ${esc(c.title)}" data-tick="coe:${esc(c.id)}">${icon('check')}</button>
    <button class="coe-open" data-open="coe:${esc(c.id)}">
      <span class="r-title">${esc(c.title)}</span>
      <span class="r-desc coe-meta">${esc(dept(c.dept).name)}${dueText ? ` · <span class="${late ? 'overdue' : ''}">${esc(dueText)}${late ? ' (late)' : ''}</span>` : ''}</span>
      ${who ? `<span class="coe-who">${esc(who)}</span>` : ''}
    </button>
    <span class="pill coe-pts">+${esc(coePts(c))}</span>
  </li>`;
}

function viewCircles() {
  const { done, bonus, listed } = coeScore();
  const pct = Math.min(100, Math.round((done / COE_TOTAL) * 100));
  const next = TIERS.find((t) => done < t.points);
  const gold = TIERS[TIERS.length - 1];
  const reached = [...TIERS].reverse().find((t) => done >= t.points);
  const msg = !next ? 'Gold reached. Keep every box checked through May.'
    : (reached ? `${reached.name} reached · ` : '') + (next.id === 'gold' ? `${pointsWord(gold.points - done)} to Gold` : `${pointsWord(next.points - done)} to ${next.name} · ${gold.points - done} to Gold`);
  const marks = TIERS.map((t) => `<span class="coe-mark ${t.id}${done >= t.points ? ' hit' : ''}" style="left:${(t.points / COE_TOTAL) * 100}%"><i></i><em>${t.name}<b>${t.points}</b></em></span>`).join('');

  const nowId = currentPeriodId();
  const t = todayKey();
  const sections = PERIODS.map((p) => {
    const items = S.coe.filter((c) => String(c.period) === String(p.id)).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title));
    if (!items.length) return null;
    const open = items.filter((c) => !c.done).length;
    const past = p.ends < t;
    const isNow = !p.bonus && p.id === nowId;
    const got = items.filter((c) => c.done).reduce((n, c) => n + coePts(c), 0);
    const max = items.reduce((n, c) => n + coePts(c), 0);
    // Current period first, then past ones with open items (late), then coming ones, bonuses, and finished past ones last.
    const rank = isNow ? 0 : past && open && !p.bonus ? 1 : !past && !p.bonus ? 2 : !past ? 3 : 4;
    const flag = past && open ? `<span class="pill coe-late">${p.bonus ? 'Closed' : 'Late'} · ${open} open</span>` : isNow ? '<span class="pill coe-now">Now</span>' : '';
    const score = p.bonus ? `${Math.min(2, got)} of 2 max` : `${got} of ${max} pts`;
    return { rank, html: `<section class="coe-period" aria-label="${esc(p.name)}">
      <div class="coe-period-head"><h2>${esc(p.name)} <span class="hint">${esc(p.span)}</span></h2>${flag}<span class="coe-period-score">${score}</span></div>
      <ul class="ruled">${items.map((c) => coeRowHtml(c, p.bonus)).join('')}</ul>
    </section>` };
  }).filter(Boolean).sort((a, b) => a.rank - b.rank);

  return `
    <div class="page-head"><div><h1>Circles of Excellence</h1>
      <p>VE's checklist for the year. Each item is worth points, and Gold means ${gold.points} of ${COE_TOTAL}.</p></div></div>
    <section class="coe-hero" aria-label="Our score: ${done} of ${COE_TOTAL} points">
      <p class="coe-score"><b>${done}</b> of ${COE_TOTAL}</p>
      <div class="coe-bar">
        <div class="coe-track" role="img" aria-label="${done} of ${COE_TOTAL} points. Bronze at 36, Silver at 48, Gold at 54."><div class="coe-fill" style="width:${pct}%"></div></div>
        <div class="coe-marks" aria-hidden="true">${marks}</div>
      </div>
      <p class="coe-msg">${esc(msg)}</p>
      <p class="coe-bonus">Bonus ${bonus} of 4</p>
      ${listed !== COE_TOTAL ? `<p class="coe-note">VE says the year is worth ${COE_TOTAL} points, but the items listed add up to ${listed}. We're asking our teacher.</p>` : ''}
    </section>
    ${S.coe.length ? sections.map((x) => x.html).join('') : '<p class="empty"><b>The checklist is empty.</b>Nothing has been loaded yet.</p>'}`;
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
