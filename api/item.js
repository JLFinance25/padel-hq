import { send, readJson, query, requireLogin, isOwner, checkItem, getItem, saveItem, moveToTrash, restoreFromTrash, cleanWho } from './_lib.js';

// Who may change what (checked here, not just hidden in the page):
//   Everyone logged in: check a to-do off or back on, and send a suggestion (it waits in the CEO's inbox).
//   Owner (owner passcode): add, edit and delete to-dos, calendar items, Circles items and links,
//   and put deleted things back. Deleted things wait in "trash" for 30 days.
const NOPE = 'Only the CEO can change that. You can check off to-dos and send suggestions.';
const OWNER_LISTS = ['tasks', 'events', 'coe', 'links'];
const CLASS_LISTS = ['tasks', 'coe', 'suggestions']; // lists a classmate may touch (suggestions goes away in a later step)

// Ticking a Circles item records who did it and when; un-ticking clears that.
function stampDone(collection, before, item, who) {
  if (collection !== 'coe' || !before || before.done === item.done) return item;
  if (item.done) return { ...item, doneBy: who, doneAt: new Date().toISOString() };
  const { doneBy, doneAt, ...rest } = item;
  return rest;
}

export default async function handler(req, res) {
  try {
    if (!requireLogin(req, res)) return;
    const owner = isOwner(req);

    if (req.method === 'DELETE') {
      const q = query(req);
      const collection = q.get('collection');
      const id = q.get('id');
      if (!owner) return send(res, 403, { error: NOPE });
      if (collection === 'coe') return send(res, 403, { error: "Circles items mirror VE's list, so they can't be deleted. Edit it instead." });
      if (!OWNER_LISTS.includes(collection) || !id) return send(res, 400, { error: 'Bad request.' });
      const entry = await moveToTrash(collection, id, q.get('who') || 'CEO');
      if (!entry) return send(res, 404, { error: 'That was already deleted.' });
      return send(res, 200, { ok: true, trash: entry });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

    const body = (await readJson(req)) || {};
    const who = cleanWho(body.who);

    if (body.op === 'restore') {
      if (!owner) return send(res, 403, { error: NOPE });
      const back = await restoreFromTrash(String(body.trashId || ''), who);
      if (back === 'exists') return send(res, 409, { error: 'Something with the same id is already back on the list.' });
      if (!back) return send(res, 404, { error: 'That was already restored or cleared.' });
      return send(res, 200, { item: back });
    }

    const { collection, item: sent } = body;
    if (!sent || typeof sent !== 'object' || typeof sent.id !== 'string') return send(res, 400, { error: 'Missing item.' });
    // Unknown list names are refused before storage is touched.
    if (!OWNER_LISTS.includes(collection) && !CLASS_LISTS.includes(collection)) return send(res, 400, { error: 'Unknown list.' });

    if (!owner) {
      if (collection === 'suggestions') {
        if (await getItem('suggestions', sent.id)) return send(res, 409, { error: 'That suggestion was already sent.' });
        // Only these fields are kept, whatever else was sent.
        const item = {
          id: sent.id,
          title: typeof sent.title === 'string' ? sent.title.trim().slice(0, 160) : '',
          dept: sent.dept,
          due: sent.due || null,
          desc: typeof sent.desc === 'string' ? sent.desc.trim().slice(0, 2000) : '',
          createdAt: new Date().toISOString(),
        };
        const problem = checkItem('suggestions', item);
        if (problem) return send(res, 400, { error: problem });
        const saved = await saveItem('suggestions', item, who, 'suggested');
        return send(res, 200, { item: saved });
      }

      // Check a to-do or a Circles item off or back on, and nothing else.
      const keys = Object.keys(sent).filter((k) => k !== 'id');
      if (!['tasks', 'coe'].includes(collection) || keys.length !== 1 || keys[0] !== 'done' || typeof sent.done !== 'boolean') return send(res, 403, { error: NOPE });
      const before = await getItem(collection, sent.id);
      if (!before) return send(res, 404, { error: 'That item was removed.' });
      const next = stampDone(collection, before, { ...before, done: sent.done }, who);
      const saved = await saveItem(collection, next, who, sent.done ? 'checked off' : 'unchecked');
      return send(res, 200, { item: saved });
    }

    // Owner: add or edit.
    if (!OWNER_LISTS.includes(collection)) return send(res, 400, { error: 'Unknown list.' });
    const before = await getItem(collection, sent.id);
    if (body.patch && !before) return send(res, 404, { error: 'Someone deleted this item.' });
    if (!body.patch && before) return send(res, 409, { error: 'That item already exists.' });
    const merged = body.patch ? { ...before, ...sent } : { ...sent, addedBy: who, createdAt: new Date().toISOString() };
    const item = stampDone(collection, before, merged, who);
    if (collection === 'events' && !item.status) return send(res, 400, { error: 'Pick how sure the date is: Confirmed, Projected, From our teacher, Our target or No date yet.' });
    const problem = checkItem(collection, item);
    if (problem) return send(res, 400, { error: problem });
    const keys = Object.keys(sent).filter((k) => k !== 'id');
    let action = before ? 'edited' : 'added';
    if (before && keys.length === 1 && keys[0] === 'done') action = item.done ? 'checked off' : 'unchecked';
    const saved = await saveItem(collection, item, who, action);
    return send(res, 200, { item: saved });
  } catch (e) {
    return send(res, e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? 'That request was not valid JSON.' : e.message });
  }
}
