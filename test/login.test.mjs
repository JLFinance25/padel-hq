import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useTempData, call, cookiesFrom, login } from './helpers.mjs';
useTempData();
const { default: loginRoute } = await import('../api/login.js');

test('class passcode logs in, and the status says so', async () => {
  const r = await call(loginRoute, { method: 'POST', body: { passcode: 'class-test' } });
  assert.equal(r.statusCode, 200);
  const s = await call(loginRoute, { cookie: cookiesFrom(r) });
  assert.deepEqual(s.body, { loggedIn: true, ready: true });
});

test('not logged in says so, with no owner field', async () => {
  const s = await call(loginRoute);
  assert.deepEqual(s.body, { loggedIn: false, ready: true });
});

test('wrong passcode is refused', async () => {
  const r = await call(loginRoute, { method: 'POST', body: { passcode: 'nope' } });
  assert.equal(r.statusCode, 401);
});

test('an old owner passcode setting no longer does anything', async () => {
  process.env.OWNER_PASSCODE = 'owner-test';
  try {
    const r = await call(loginRoute, { method: 'POST', body: { passcode: 'owner-test' } });
    assert.equal(r.statusCode, 401);
  } finally {
    delete process.env.OWNER_PASSCODE;
  }
});

test('logging out clears the session and any leftover owner or officer cookies', async () => {
  const cookie = await login(loginRoute, 'class-test');
  const out = await call(loginRoute, { method: 'DELETE', cookie });
  const cleared = [].concat(out.headers['set-cookie']).join(' ');
  assert.match(cleared, /phq_session=;/);
  assert.match(cleared, /phq_owner=;/);
  assert.match(cleared, /phq_officer=;/);
});

test('a login with the owner flag in the URL still logs out fully', async () => {
  const cookie = await login(loginRoute, 'class-test');
  const out = await call(loginRoute, { method: 'DELETE', url: '/api/login?owner=1', cookie });
  assert.match([].concat(out.headers['set-cookie']).join(' '), /phq_session=;/);
});
