import { send, readJson, query, requireLogin, checkItem, getItem, saveItem, deleteItem, COLLECTIONS } from './_lib.js';

export default async function handler(req, res) {
  if (!requireLogin(req, res)) return;
  try {
    if (req.method === 'POST') {
      const { collection, item, who } = await readJson(req);
      const problem = checkItem(collection, item);
      if (problem) return send(res, 400, { error: problem });
      const before = await getItem(collection, item.id);
      let action = before ? 'edited' : 'added';
      if (before && 'done' in item && before.done !== item.done) action = item.done ? 'checked off' : 'unchecked';
      const saved = await saveItem(collection, item, who, action);
      return send(res, 200, { item: saved });
    }
    if (req.method === 'DELETE') {
      const q = query(req);
      const collection = q.get('collection');
      const id = q.get('id');
      if (!COLLECTIONS.includes(collection) || !id) return send(res, 400, { error: 'Bad request' });
      const before = await getItem(collection, id);
      await deleteItem(collection, id, q.get('who'), before?.title);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
