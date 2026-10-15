import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useTempData, call, cookiesFrom, login } from './helpers.mjs';
useTempData();
const { default: loginRoute } = await import('../api/login.js');

test('class passcode logs in without owner mode', async () => {
  const r = await call(loginRoute, { method: 'POST', body: { passcode: 'class-test' } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.owner, false);
  const s = await call(loginRoute, { cookie: cookiesFrom(r) });
  assert.deepEqual([s.body.loggedIn, s.body.owner], [true, false]);
});

test('owner passcode logs in with owner mode', async () => {
  const cookie = await login(loginRoute, 'owner-test');
  const s = await call(loginRoute, { cookie });
  assert.deepEqual([s.body.loggedIn, s.body.owner], [true, true]);
});

test('wrong passcode is refused', async () => {
  const r = await call(loginRoute, { method: 'POST', body: { passcode: 'nope' } });
  assert.equal(r.statusCode, 401);
});

test('leaving owner mode keeps the class login', async () => {
  const cookie = await login(loginRoute, 'owner-test');
  const out = await call(loginRoute, { method: 'DELETE', url: '/api/login?owner=1', cookie });
  const cleared = [].concat(out.headers['set-cookie']).join(' ');
  assert.match(cleared, /phq_owner=;/);
  assert.doesNotMatch(cleared, /phq_session=;/);
});

test('owner mode is off when OWNER_PASSCODE is not set', async () => {
  const saved = process.env.OWNER_PASSCODE;
  delete process.env.OWNER_PASSCODE;
  const r = await call(loginRoute, { method: 'POST', body: { passcode: 'owner-test' } });
  assert.equal(r.statusCode, 401);
  process.env.OWNER_PASSCODE = saved;
});

test('owner passcode equal to class passcode never grants owner mode', async () => {
  const saved = process.env.OWNER_PASSCODE;
  process.env.OWNER_PASSCODE = 'class-test';
  const cookie = await login(loginRoute, 'class-test');
  const s = await call(loginRoute, { cookie });
  assert.equal(s.body.owner, false);
  process.env.OWNER_PASSCODE = saved;
});

test('a blank owner passcode never grants owner mode', async () => {
  const saved = process.env.OWNER_PASSCODE;
  try {
    process.env.OWNER_PASSCODE = '   ';
    const r = await call(loginRoute, { method: 'POST', body: { passcode: '' } });
    assert.notEqual(r.statusCode === 200 && r.body.owner === true, true);
    assert.equal(r.statusCode, 401);
  } finally {
    process.env.OWNER_PASSCODE = saved;
  }
});
