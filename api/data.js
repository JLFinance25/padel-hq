import { send, requireLogin, loadAll, isOwner } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  try {
    if (!requireLogin(req, res)) return;
    const all = await loadAll();
    // Deleted items are for the owner only.
    if (!isOwner(req)) delete all.trash;
    return send(res, 200, all);
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
