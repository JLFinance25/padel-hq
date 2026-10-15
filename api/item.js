import { send, readJson, query, requireLogin, checkItem, getItem, saveItem, prevValues, moveToTrash, restoreFromTrash, cleanWho } from './_lib.js';

// Who may change what: everyone logged in (with the class passcode) can do all of it.
//   Add, edit and delete to-dos, calendar items, Circles items and links (Circles items can't be deleted).
//   Check to-dos and Circles items off, add to-dos, add and tick checklist steps, and put deleted things back.
// The safety net: every change logs the person's typed first name, and deleted things wait in "trash"
// for 30 days where anyone can put them back. Suggestions are turned off; old ones stay in the database.
// Checklists change only through add-step and tick-step, and who/when stamps are set here, never taken from the page.
// So a plain add or edit ignores these fields if they are sent. The one exception: an edit that sends only
// "steps" may delete or reorder steps, as long as every step it sends already exists exactly as saved.
const LISTS = ['tasks', 'events', 'coe', 'links'];
const NEVER_FROM_CLIENT = ['steps', 'doneBy', 'doneAt', 'addedBy', 'createdAt', 'updatedAt', 'updatedBy'];
const STEP_KEYS = ['id', 'text', 'done', 'addedBy', 'doneBy', 'doneAt'];
const STEPS_MSG = 'Use the checklist buttons to change steps.';

// The saved steps named by `sent`, in the order sent, or null if anything was added, changed or repeated.
function keptSteps(before, sent) {
  if (!Array.isArray(sent)) return null;
  const have = new Map((before.steps || []).map((s) => [s.id, s]));
  const seen = new Set();
  const out = [];
  for (const st of sent) {
    const old = st && typeof st === 'object' && !Array.isArray(st) ? have.get(st.id) : null;
    if (!old || seen.has(st.id)) return null;
    if (Object.keys(st).some((k) => !STEP_KEYS.includes(k))) return null;
    if (STEP_KEYS.some((k) => st[k] !== old[k])) return null;
    seen.add(st.id);
    out.push(old);
  }
  return out;
}

// Ticking a Circles item records who did it and when; un-ticking clears that.
function stampDone(collection, before, item, who) {
  if (collection !== 'coe' || !before || before.done === item.done) return item;
  if (item.done) return { ...item, doneBy: who, doneAt: new Date().toISOString() };
  const { doneBy, doneAt, ...rest } = item;
  return rest;
}

// Operations on a to-do. Each one reads the newest saved task first,
// so ticking one step never wipes out another person's tick.
async function taskOp(body, who, res) {
  const { op } = body;
  if (op === 'add-task') {
    const sent = body.item;
    if (!sent || typeof sent !== 'object' || typeof sent.id !== 'string') return send(res, 400, { error: 'Missing item.' });
    if (await getItem('tasks', sent.id)) return send(res, 409, { error: 'That to-do already exists.' });
    // Only these fields are kept, whatever else was sent.
    const item = {
      id: sent.id,
      title: typeof sent.title === 'string' ? sent.title.trim().slice(0, 160) : '',
      dept: sent.dept,
      due: sent.due || null,
      owner: typeof sent.owner === 'string' ? sent.owner.trim().slice(0, 80) : '',
      desc: typeof sent.desc === 'string' ? sent.desc.trim().slice(0, 2000) : '',
      done: false,
      steps: [],
      addedBy: who,
      createdAt: new Date().toISOString(),
    };
    const problem = checkItem('tasks', item);
    if (problem) return send(res, 400, { error: problem });
    return send(res, 200, { item: await saveItem('tasks', item, who, 'added') });
  }
  if (op === 'add-step' || op === 'tick-step') {
    const task = typeof body.taskId === 'string' ? await getItem('tasks', body.taskId) : null;
    if (!task) return send(res, 404, { error: 'That to-do was removed.' });
    const steps = Array.isArray(task.steps) ? task.steps : [];
    let next, action, prev;
    if (op === 'add-step') {
      const st = body.step;
      if (!st || typeof st !== 'object' || typeof st.id !== 'string') return send(res, 400, { error: 'Missing step.' });
      if (steps.length >= 30) return send(res, 400, { error: "This to-do's checklist is full (30 steps)." });
      if (steps.some((x) => x.id === st.id)) return send(res, 409, { error: 'That step already exists.' });
      const text = typeof st.text === 'string' ? st.text.trim() : '';
      next = { ...task, steps: [...steps, { id: st.id, text, done: false, addedBy: who }] };
      action = 'added a step to';
    } else {
      if (typeof body.done !== 'boolean') return send(res, 400, { error: 'Say whether the step is done.' });
      const step = steps.find((x) => x.id === body.stepId);
      if (!step) return send(res, 404, { error: 'That step was removed.' });
      // Already in the state asked for: leave it alone so the first ticker is kept.
      if (step.done === body.done) return send(res, 200, { item: task });
      next = {
        ...task,
        steps: steps.map((x) => {
          if (x.id !== body.stepId) return x;
          const { doneBy, doneAt, ...rest } = x;
          return body.done ? { ...rest, done: true, doneBy: who, doneAt: new Date().toISOString() } : { ...rest, done: false };
        }),
      };
      action = body.done ? 'ticked a step on' : 'unticked a step on';
      prev = { stepText: String(step.text).slice(0, 300), done: step.done };
    }
    const problem = checkItem('tasks', next);
    if (problem) return send(res, 400, { error: problem });
    return send(res, 200, { item: await saveItem('tasks', next, who, action, prev) });
  }
  return send(res, 400, { error: 'Unknown action.' });
}

export default async function handler(req, res) {
  try {
    if (!requireLogin(req, res)) return;

    if (req.method === 'DELETE') {
      const q = query(req);
      const collection = q.get('collection');
      const id = q.get('id');
      if (collection === 'coe') return send(res, 403, { error: "Circles items mirror VE's list, so they can't be deleted. Edit it instead." });
      if (!LISTS.includes(collection) || !id) return send(res, 400, { error: 'Bad request.' });
      const entry = await moveToTrash(collection, id, cleanWho(q.get('who')));
      if (!entry) return send(res, 404, { error: 'That was already deleted.' });
      return send(res, 200, { ok: true, trash: entry });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

    const body = (await readJson(req)) || {};
    const who = cleanWho(body.who);

    if (body.op === 'restore') {
      const back = await restoreFromTrash(String(body.trashId || ''), who);
      if (back === 'exists') return send(res, 409, { error: 'Something with the same id is already back on the list.' });
      if (!back) return send(res, 404, { error: 'That was already restored or cleared.' });
      return send(res, 200, { item: back });
    }

    if (body.op) return await taskOp(body, who, res);

    const { collection, item: sent } = body;
    if (!sent || typeof sent !== 'object' || typeof sent.id !== 'string') return send(res, 400, { error: 'Missing item.' });
    // Unknown list names are refused before storage is touched.
    if (collection === 'suggestions') return send(res, 400, { error: 'Suggestions are turned off. Add the to-do directly.' });
    if (!LISTS.includes(collection)) return send(res, 400, { error: 'Unknown list.' });

    // Add or edit.
    const before = await getItem(collection, sent.id);
    if (body.patch && !before) return send(res, 404, { error: 'Someone deleted this item.' });
    if (!body.patch && before) return send(res, 409, { error: 'That item already exists.' });
    // Only the fields people may set; stamps and checklists are ignored here (see NEVER_FROM_CLIENT).
    let fields = Object.fromEntries(Object.entries(sent).filter(([k]) => !NEVER_FROM_CLIENT.includes(k)));
    if (body.patch && collection === 'tasks' && 'steps' in sent && Object.keys(sent).every((k) => k === 'id' || k === 'steps')) {
      const steps = keptSteps(before, sent.steps);
      if (!steps) return send(res, 400, { error: STEPS_MSG });
      fields = { id: sent.id, steps };
    }
    const merged = body.patch ? { ...before, ...fields } : { ...fields, addedBy: who, createdAt: new Date().toISOString() };
    const item = stampDone(collection, before, merged, who);
    if (collection === 'events' && !item.status) return send(res, 400, { error: 'Pick how sure the date is: Confirmed, Projected, From our teacher, Our target or No date yet.' });
    if (Object.hasOwn(sent, 'dept') && ['racquets', 'apparel'].includes(sent.dept) && (!before || before.dept !== sent.dept))
      return send(res, 409, { error: 'This page is out of date. Close it and open the site again.' });
    const problem = checkItem(collection, item);
    if (problem) return send(res, 400, { error: problem });
    const keys = Object.keys(fields).filter((k) => k !== 'id');
    let action = before ? 'edited' : 'added';
    if (before && keys.length === 1 && keys[0] === 'done') action = item.done ? 'checked off' : 'unchecked';
    const saved = await saveItem(collection, item, who, action, before ? prevValues(before, fields) : undefined);
    return send(res, 200, { item: saved });
  } catch (e) {
    return send(res, e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? 'That request was not valid JSON.' : e.message });
  }
}
