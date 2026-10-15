import { send, readJson, query, passcodeMatches, ownerPasscodeMatches, sessionCookie, ownerCookie, clearCookie, isLoggedIn, isOwner, countTry, clearTries, MAX_TRIES } from './_lib.js';

// POST { passcode }: the class passcode logs you in. The owner passcode logs you in with owner mode too.
// DELETE logs out. DELETE ?owner=1 leaves owner mode but stays logged in.
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return send(res, 200, { loggedIn: isLoggedIn(req), owner: isOwner(req), ready: !!process.env.CLASS_PASSCODE });
    if (req.method === 'DELETE') {
      if (query(req).get('owner')) return send(res, 200, { ok: true }, { 'Set-Cookie': [clearCookie('phq_owner')] });
      // Also clears phq_officer, left over from when officers had their own passcode.
      return send(res, 200, { ok: true }, { 'Set-Cookie': [clearCookie(), clearCookie('phq_owner'), clearCookie('phq_officer')] });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!process.env.CLASS_PASSCODE) return send(res, 500, { error: 'The class passcode has not been set up yet.' });
    if ((await countTry(req)) > MAX_TRIES) return send(res, 429, { error: 'Too many tries from this network. Wait 10 minutes.' });
    const body = (await readJson(req)) || {};
    if (ownerPasscodeMatches(body.passcode)) {
      await clearTries(req);
      return send(res, 200, { ok: true, owner: true }, { 'Set-Cookie': [sessionCookie(req), ownerCookie(req)] });
    }
    if (!passcodeMatches(body.passcode)) {
      await new Promise((r) => setTimeout(r, 600));
      return send(res, 401, { error: 'That passcode is not right.' });
    }
    await clearTries(req);
    return send(res, 200, { ok: true, owner: false }, { 'Set-Cookie': sessionCookie(req) });
  } catch (e) {
    return send(res, e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? 'That request was not valid JSON.' : e.message });
  }
}
