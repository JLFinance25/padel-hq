import { send, requireLogin, loadAll } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  try {
    if (!requireLogin(req, res)) return;
    return send(res, 200, await loadAll());
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
