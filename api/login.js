import { send, readJson, passcodeMatches, sessionCookie, clearCookie, isLoggedIn, tooManyTries } from './_lib.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return send(res, 200, { loggedIn: isLoggedIn(req), ready: !!process.env.CLASS_PASSCODE });
    if (req.method === 'DELETE') return send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!process.env.CLASS_PASSCODE) return send(res, 500, { error: 'The class passcode has not been set up yet.' });
    if (await tooManyTries(req, false)) return send(res, 429, { error: 'Too many wrong tries. Wait 10 minutes.' });
    const { passcode } = await readJson(req);
    if (!passcodeMatches(passcode)) {
      await tooManyTries(req, true);
      await new Promise((r) => setTimeout(r, 600));
      return send(res, 401, { error: 'That passcode is not right.' });
    }
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req) });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
