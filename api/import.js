import { send, readJson, requireLogin, importItems } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    if (!requireLogin(req, res)) return;
    const { data, who } = (await readJson(req)) || {};
    if (!data || typeof data !== 'object') return send(res, 400, { error: 'That file is not starter data.' });
    return send(res, 200, await importItems(data, who));
  } catch (e) {
    return send(res, e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? 'That request was not valid JSON.' : e.message });
  }
}
