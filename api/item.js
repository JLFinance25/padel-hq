import { send, readJson, query, requireLogin, isOfficer, checkItem, getItem, saveItem, deleteItem, clearCollection, COLLECTIONS } from './_lib.js';

// To-dos are run by the officers: only they add, edit or delete them.
// Everyone else can still check one off or put their name on it.
const MEMBER_TASK_FIELDS = new Set(['id', 'done', 'owner']);

export default async function handler(req, res) {
  try {
    if (!requireLogin(req, res)) return;
    if (req.method === 'POST') {
      const body = (await readJson(req)) || {};
      const { collection, who } = body;
      if (!COLLECTIONS.includes(collection)) return send(res, 400, { error: 'Unknown list.' });
      if (!body.item || typeof body.item !== 'object' || typeof body.item.id !== 'string') return send(res, 400, { error: 'Missing item.' });
      const before = await getItem(collection, body.item.id);
      // patch = only the fields someone changed, merged onto the latest saved copy,
      // so an old open panel can't wipe out a classmate's newer edit.
      if (body.patch && !before) return send(res, 404, { error: 'Someone deleted this item.' });
      if (collection === 'tasks' && !isOfficer(req)) {
        if (!before) return send(res, 403, { error: 'Only officers can add to-dos.' });
        if (!body.patch || Object.keys(body.item).some((k) => !MEMBER_TASK_FIELDS.has(k))) return send(res, 403, { error: 'Only officers can edit to-dos. You can check one off or assign it to yourself.' });
      }
      const item = body.patch ? { ...before, ...body.item } : body.item;
      const problem = checkItem(collection, item);
      if (problem) return send(res, 400, { error: problem });
      let action = before ? 'edited' : collection === 'posts' ? 'posted' : 'added';
      if (before && 'done' in body.item && before.done !== item.done) action = item.done ? 'checked off' : 'unchecked';
      const saved = await saveItem(collection, item, who, action);
      return send(res, 200, { item: saved });
    }
    if (req.method === 'DELETE') {
      const q = query(req);
      const collection = q.get('collection');
      const id = q.get('id');
      if (collection === 'tasks' && !isOfficer(req)) return send(res, 403, { error: 'Only officers can delete to-dos.' });
      if (collection === 'tasks' && q.get('all') === '1') return send(res, 200, { cleared: await clearCollection('tasks', q.get('who'), 'to-dos') });
      if (!COLLECTIONS.includes(collection) || !id) return send(res, 400, { error: 'Bad request' });
      const before = await getItem(collection, id);
      if (!before) return send(res, 404, { error: 'Already deleted.' });
      await deleteItem(collection, id, q.get('who'), before.title);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return send(res, e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? 'That request was not valid JSON.' : e.message });
  }
}
