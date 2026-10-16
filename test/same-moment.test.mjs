// Two people changing the same to-do at the same moment, against a database with a network delay (like the
// live one). Before the per-item lock, 10 ticks sent together saved only 1, and every sender was told it worked.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { useTempData, call, login } from './helpers.mjs';
import { startFakeRedis } from './fake-redis.mjs';

useTempData();
const db = await startFakeRedis(30);
process.env.KV_REST_API_URL = db.url;
process.env.KV_REST_API_TOKEN = 'test-only';
after(() => db.close());

const { default: loginRoute } = await import('../api/login.js');
const { default: item } = await import('../api/item.js');
const cookie = await login(loginRoute, 'class-test');
const post = (body) => call(item, { method: 'POST', body, cookie });
const saved = (id) => JSON.parse(db.hash('phq:tasks').get(id));

test('ten steps added at the same moment are all kept', async () => {
  assert.equal((await post({ op: 'add-task', item: { id: 'busy-1', title: 'Busy', dept: 'ops' }, who: 'A' })).statusCode, 200);
  const rs = await Promise.all(Array.from({ length: 10 }, (_, i) => post({ op: 'add-step', taskId: 'busy-1', step: { id: 's' + i, text: 'Step ' + i }, who: 'P' + i })));
  assert.deepEqual(rs.map((r) => r.statusCode), Array(10).fill(200));
  assert.equal(saved('busy-1').steps.length, 10);
});

test('ten steps ticked at the same moment are all kept, each with its own name', async () => {
  const ids = saved('busy-1').steps.map((s) => s.id);
  await Promise.all(ids.map((stepId, i) => post({ op: 'tick-step', taskId: 'busy-1', stepId, done: true, who: 'T' + i })));
  const steps = saved('busy-1').steps;
  assert.equal(steps.filter((s) => s.done).length, 10);
  assert.deepEqual(steps.map((s) => s.doneBy).sort(), ids.map((_, i) => 'T' + i).sort());
});

test('two edits of different boxes at the same moment are both kept', async () => {
  await Promise.all([
    post({ collection: 'tasks', item: { id: 'busy-1', title: 'Renamed' }, patch: true, who: 'A' }),
    post({ collection: 'tasks', item: { id: 'busy-1', due: '2026-11-20' }, patch: true, who: 'B' }),
  ]);
  const t = saved('busy-1');
  assert.equal(t.title, 'Renamed');
  assert.equal(t.due, '2026-11-20');
  assert.equal(t.steps.filter((s) => s.done).length, 10); // the ticks survived the edits
});

test('the lock is let go after each change', async () => {
  const r = await post({ op: 'tick-step', taskId: 'busy-1', stepId: 's0', done: false, who: 'A' });
  assert.equal(r.statusCode, 200);
  assert.equal(saved('busy-1').steps.find((s) => s.id === 's0').done, false);
});
