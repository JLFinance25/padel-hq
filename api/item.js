import { send, readJson, requireLogin, checkItem, getItem, saveItem } from './_lib.js';

// What the website itself may change. Classmates can only:
//   1. check a to-do off (or un-check it), and
//   2. send a suggestion, which waits in the CEO's inbox.
// Everything else (adding, editing, deleting) goes through the owner's tool, scripts/inbox.mjs.
const NOPE = 'The website can only check off to-dos and send suggestions. Suggest the change instead.';

export default async function handler(req, res) {
  try {
    if (!requireLogin(req, res)) return;
    if (req.method !== 'POST') return send(res, 405, { error: NOPE });
    const body = (await readJson(req)) || {};
    const { collection, item: sent } = body;
    if (!sent || typeof sent !== 'object' || typeof sent.id !== 'string') return send(res, 400, { error: 'Missing item.' });

    if (collection === 'tasks') {
      const keys = Object.keys(sent).filter((k) => k !== 'id');
      if (keys.length !== 1 || keys[0] !== 'done' || typeof sent.done !== 'boolean') return send(res, 403, { error: NOPE });
      const before = await getItem('tasks', sent.id);
      if (!before) return send(res, 404, { error: 'That to-do was removed.' });
      const item = { ...before, done: sent.done };
      const saved = await saveItem('tasks', item, 'Someone', sent.done ? 'checked off' : 'unchecked');
      return send(res, 200, { item: saved });
    }

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
      const saved = await saveItem('suggestions', item, 'Someone', 'suggested');
      return send(res, 200, { item: saved });
    }

    return send(res, 403, { error: NOPE });
  } catch (e) {
    return send(res, e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? 'That request was not valid JSON.' : e.message });
  }
}
