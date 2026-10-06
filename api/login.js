import { send, readJson, query, passcodeMatches, officerPasscodeMatches, sessionCookie, officerCookie, clearCookie, clearOfficerCookie, isLoggedIn, isOfficer, countTry, clearTries, MAX_TRIES } from './_lib.js';

// POST { passcode }: the class passcode logs you in; the officer passcode logs you in as an officer.
// POST { passcode, officer: true }: already in, switching on officer mode (only the officer passcode works).
// DELETE logs out; DELETE ?officer=1 only leaves officer mode.
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return send(res, 200, { loggedIn: isLoggedIn(req), officer: isOfficer(req), ready: !!process.env.CLASS_PASSCODE });
    if (req.method === 'DELETE') {
      if (query(req).get('officer')) return send(res, 200, { ok: true }, { 'Set-Cookie': clearOfficerCookie() });
      return send(res, 200, { ok: true }, { 'Set-Cookie': [clearCookie(), clearOfficerCookie()] });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!process.env.CLASS_PASSCODE) return send(res, 500, { error: 'The class passcode has not been set up yet.' });
    const body = (await readJson(req)) || {};
    if (body.officer && !process.env.OFFICER_PASSCODE) return send(res, 500, { error: 'The officer passcode has not been set up yet (OFFICER_PASSCODE).' });
    if ((await countTry(req)) > MAX_TRIES) return send(res, 429, { error: 'Too many tries from this network. Wait 10 minutes.' });
    if (officerPasscodeMatches(body.passcode)) {
      await clearTries(req);
      return send(res, 200, { ok: true, officer: true }, { 'Set-Cookie': [sessionCookie(req), officerCookie(req)] });
    }
    if (!body.officer && passcodeMatches(body.passcode)) {
      await clearTries(req);
      return send(res, 200, { ok: true, officer: false }, { 'Set-Cookie': [sessionCookie(req), clearOfficerCookie()] });
    }
    await new Promise((r) => setTimeout(r, 600));
    return send(res, 401, { error: body.officer ? 'That is not the officer passcode.' : 'That passcode is not right.' });
  } catch (e) {
    return send(res, e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? 'That request was not valid JSON.' : e.message });
  }
}
