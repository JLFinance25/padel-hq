import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useTempData, seed, readDb, call, login } from './helpers.mjs';
useTempData();
const { default: loginRoute } = await import('../api/login.js');
const { default: item } = await import('../api/item.js');
const { default: data } = await import('../api/data.js');

const T1 = { id: 'task-one', dept: 'finance', title: 'Test task', due: '2026-11-02', owner: 'Test Person', done: false };
const E1 = { id: 'event-one', dept: 'firm', title: 'Test event', date: '2026-11-05', kind: 'deadline', status: 'projected' };
const fresh = () => seed({ tasks: { [T1.id]: T1 }, events: { [E1.id]: E1 }, coe: { c1: { id: 'c1', dept: 'firm', title: 'Circles item', points: 2, period: 1, done: false } } });
const classC = await login(loginRoute, 'class-test');
const post = (cookie, body) => call(item, { method: 'POST', body, cookie });

test('not logged in gets 401 on data and item', async () => {
  fresh();
  assert.equal((await call(data)).statusCode, 401);
  assert.equal((await post('', { collection: 'tasks', item: { id: 'task-one', done: true }, patch: true })).statusCode, 401);
  assert.equal((await call(item, { method: 'DELETE', url: '/api/item?collection=tasks&id=task-one' })).statusCode, 401);
  assert.equal((await post('', { op: 'restore', trashId: 'tasks:task-one' })).statusCode, 401);
  assert.equal(readDb().tasks['task-one'].title, 'Test task');
});

test('anyone logged in can check off a task, and the log shows their name', async () => {
  fresh();
  const r = await post(classC, { collection: 'tasks', item: { id: 'task-one', done: true }, patch: true, who: 'Test Person' });
  assert.equal(r.statusCode, 200);
  assert.equal(readDb().tasks['task-one'].done, true);
  assert.equal(readDb().log[0].who, 'Test Person');
});

test('the suggestion box is turned off, and old suggestions stay untouched', async () => {
  seed({ suggestions: { 'sug-old': { id: 'sug-old', title: 'Old idea', dept: 'firm' } } });
  const r = await post(classC, { collection: 'suggestions', item: { id: 'sug-1', title: 'Idea', dept: 'firm' }, who: 'Test Person' });
  assert.equal(r.statusCode, 400);
  assert.equal(r.body.error, 'Suggestions are turned off. Add the to-do directly.');
  assert.equal(readDb().suggestions['sug-1'], undefined);
  assert.equal(readDb().suggestions['sug-old'].title, 'Old idea');
});

test('anyone logged in can add, edit and delete a task', async () => {
  fresh();
  const add = await post(classC, { collection: 'tasks', item: { id: 'task-two', dept: 'sales', title: 'New one', done: false }, who: 'Test Person' });
  assert.equal(add.statusCode, 200);
  assert.equal((await post(classC, { collection: 'tasks', item: { id: 'task-two', dept: 'sales', title: 'Again' } })).statusCode, 409);
  const edit = await post(classC, { collection: 'tasks', item: { id: 'task-one', title: 'Renamed' }, patch: true, who: 'Test Person' });
  assert.equal(edit.body.item.title, 'Renamed');
  assert.equal(edit.body.item.due, '2026-11-02'); // untouched fields kept
  const del = await call(item, { method: 'DELETE', url: '/api/item?collection=tasks&id=task-one&who=Test%20Person', cookie: classC });
  assert.equal(del.statusCode, 200);
  assert.equal(readDb().tasks['task-one'], undefined);
  assert.equal(readDb().trash['tasks:task-one'].item.title, 'Renamed');
});

test('anyone logged in can restore from Recently deleted', async () => {
  fresh();
  await call(item, { method: 'DELETE', url: '/api/item?collection=events&id=event-one', cookie: classC });
  const r = await post(classC, { op: 'restore', trashId: 'events:event-one', who: 'Test Person' });
  assert.equal(r.statusCode, 200);
  assert.equal(readDb().events['event-one'].title, 'Test event');
  assert.equal(readDb().trash['events:event-one'], undefined);
});

test('calendar items need a "how sure" label', async () => {
  fresh();
  const r = await post(classC, { collection: 'events', item: { id: 'ev-x', dept: 'firm', title: 'No label', date: '2026-12-01', kind: 'deadline' } });
  assert.equal(r.statusCode, 400);
  assert.match(r.body.error, /how sure/i);
});

test('Circles items cannot be deleted', async () => {
  fresh();
  const r = await call(item, { method: 'DELETE', url: '/api/item?collection=coe&id=c1', cookie: classC });
  assert.equal(r.statusCode, 403);
});

test('trash is sent to everyone logged in, with who deleted it', async () => {
  fresh();
  await call(item, { method: 'DELETE', url: '/api/item?collection=tasks&id=task-one&who=Test%20Person', cookie: classC });
  const t = (await call(data, { cookie: classC })).body.trash;
  assert.equal(t.length, 1);
  assert.equal(t[0].deletedBy, 'Test Person');
});

test('links can be added, edited and deleted too', async () => {
  fresh();
  const L = { id: 'link-1', dept: 'firm', title: 'Class folder', url: 'https://example.com', section: 'link' };
  assert.equal((await post(classC, { collection: 'links', item: L, who: 'Test Person' })).statusCode, 200);
  assert.equal((await post(classC, { collection: 'links', item: { id: 'link-1', title: 'Renamed' }, patch: true })).body.item.title, 'Renamed');
  assert.equal((await call(item, { method: 'DELETE', url: '/api/item?collection=links&id=link-1', cookie: classC })).statusCode, 200);
  assert.ok(readDb().trash['links:link-1']);
});

test('trash older than 30 days is pruned on the next delete', async () => {
  seed({ tasks: { [T1.id]: T1 }, trash: { 'tasks:old': { id: 'tasks:old', collection: 'tasks', item: { id: 'old' }, title: 'old', deletedAt: '2026-01-01T00:00:00.000Z', deletedBy: 'Test Person' } } });
  await call(item, { method: 'DELETE', url: '/api/item?collection=tasks&id=task-one', cookie: classC });
  assert.equal(readDb().trash['tasks:old'], undefined);
});

test('anyone logged in can tick a Circles item and it records who and when', async () => {
  fresh();
  const r = await post(classC, { collection: 'coe', item: { id: 'c1', done: true }, patch: true, who: 'Test Person' });
  assert.equal(r.statusCode, 200);
  const c = readDb().coe.c1;
  assert.equal(c.done, true);
  assert.equal(c.doneBy, 'Test Person');
  assert.match(c.doneAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('un-ticking a Circles item clears who and when', async () => {
  fresh();
  await post(classC, { collection: 'coe', item: { id: 'c1', done: true }, patch: true, who: 'Test Person' });
  await post(classC, { collection: 'coe', item: { id: 'c1', done: false }, patch: true, who: 'Test Person' });
  const c = readDb().coe.c1;
  assert.equal(c.done, false);
  assert.equal(c.doneBy, undefined);
});

test('anyone logged in can edit a Circles item', async () => {
  fresh();
  const r = await post(classC, { collection: 'coe', item: { id: 'c1', points: 9 }, patch: true, who: 'Test Person' });
  assert.equal(r.statusCode, 200);
  assert.equal(readDb().coe.c1.points, 9);
});

test('an unknown list name is refused with 400 before any lookup', async () => {
  fresh();
  assert.equal((await post(classC, { collection: 'bogus', item: { id: 'x', done: true }, patch: true })).statusCode, 400);
  assert.equal((await post(classC, { collection: '__proto__', item: { id: 'x', done: true }, patch: true })).statusCode, 400);
  assert.equal((await post(classC, { collection: 'bogus', item: { id: 'x', done: true }, patch: true })).statusCode, 400);
});


test('restore says 409 when something with that id is already back', async () => {
  fresh();
  await call(item, { method: 'DELETE', url: '/api/item?collection=events&id=event-one', cookie: classC });
  assert.equal((await post(classC, { collection: 'events', item: E1 })).statusCode, 200);
  assert.equal((await post(classC, { op: 'restore', trashId: 'events:event-one' })).statusCode, 409);
});

test('add-task can add a task in any office', async () => {
  fresh();
  const r = await post(classC, { op: 'add-task', item: { id: 'new-task', title: 'Draft the catalog', dept: 'sales', due: '2026-11-10', owner: 'Test Person', done: true, addedBy: 'Faker' }, who: 'Test Person' });
  assert.equal(r.statusCode, 200);
  const t = readDb().tasks['new-task'];
  assert.deepEqual([t.done, t.addedBy, t.steps.length, t.dept], [false, 'Test Person', 0, 'sales']);
});

test('anyone can add a step and tick it without wiping other ticks', async () => {
  fresh();
  await post(classC, { op: 'add-step', taskId: 'task-one', step: { id: 's1', text: 'First' }, who: 'A' });
  await post(classC, { op: 'add-step', taskId: 'task-one', step: { id: 's2', text: 'Second' }, who: 'B' });
  await post(classC, { op: 'tick-step', taskId: 'task-one', stepId: 's1', done: true, who: 'A' });
  await post(classC, { op: 'tick-step', taskId: 'task-one', stepId: 's2', done: true, who: 'B' });
  const steps = readDb().tasks['task-one'].steps;
  assert.deepEqual(steps.map((s) => s.done), [true, true]);
  assert.equal(steps[1].doneBy, 'B');
});

test('new office ids are accepted and unknown ones refused', async () => {
  fresh();
  assert.equal((await post(classC, { collection: 'tasks', item: { id: 'hr-1', dept: 'hr', title: 'Payroll records' } })).statusCode, 200);
  assert.equal((await post(classC, { collection: 'tasks', item: { id: 'x-1', dept: 'nowhere', title: 'X' } })).statusCode, 400);
});

test('a step with no text is refused', async () => {
  fresh();
  assert.equal((await post(classC, { op: 'add-step', taskId: 'task-one', step: { id: 's1', text: '  ' } })).statusCode, 400);
});

test('every office id works, and the old racquets and apparel ones still do', async () => {
  fresh();
  for (const dept of ['ceo', 'ops', 'finance', 'marketing', 'sales', 'tech', 'hr', 'firm', 'racquets', 'apparel']) {
    assert.equal((await post(classC, { collection: 'tasks', item: { id: 'o-' + dept, dept, title: 'T' } })).statusCode, 200, dept);
  }
  const bad = await post(classC, { collection: 'tasks', item: { id: 'o-bad', dept: 'nowhere', title: 'T' } });
  assert.match(bad.body.error, /Pick one of the offices/);
});

test('add-task refuses a duplicate id, a bad office and a blank title', async () => {
  fresh();
  assert.equal((await post(classC, { op: 'add-task', item: { id: 'task-one', title: 'Again', dept: 'hr' } })).statusCode, 409);
  assert.equal((await post(classC, { op: 'add-task', item: { id: 'n1', title: 'X', dept: 'nowhere' } })).statusCode, 400);
  assert.equal((await post(classC, { op: 'add-task', item: { id: 'n2', title: '   ', dept: 'hr' } })).statusCode, 400);
  assert.equal(readDb().tasks.n1, undefined);
});

test('add-step and tick-step say 404 when the task or step is gone, 409 on a repeated step id', async () => {
  fresh();
  assert.equal((await post(classC, { op: 'add-step', taskId: 'ghost', step: { id: 's1', text: 'X' } })).statusCode, 404);
  assert.equal((await post(classC, { op: 'tick-step', taskId: 'ghost', stepId: 's1', done: true })).statusCode, 404);
  await post(classC, { op: 'add-step', taskId: 'task-one', step: { id: 's1', text: 'X' } });
  assert.equal((await post(classC, { op: 'tick-step', taskId: 'task-one', stepId: 'nope', done: true })).statusCode, 404);
  assert.equal((await post(classC, { op: 'tick-step', taskId: 'task-one', stepId: 's1', done: 'yes' })).statusCode, 400);
  assert.equal((await post(classC, { op: 'add-step', taskId: 'task-one', step: { id: 's1', text: 'Dup' } })).statusCode, 409);
});

test('un-ticking a step clears who and when', async () => {
  fresh();
  await post(classC, { op: 'add-step', taskId: 'task-one', step: { id: 's1', text: 'X' }, who: 'A' });
  await post(classC, { op: 'tick-step', taskId: 'task-one', stepId: 's1', done: true, who: 'A' });
  assert.match(readDb().tasks['task-one'].steps[0].doneAt, /^\d{4}-/);
  await post(classC, { op: 'tick-step', taskId: 'task-one', stepId: 's1', done: false, who: 'A' });
  const s = readDb().tasks['task-one'].steps[0];
  assert.deepEqual([s.done, s.doneBy, s.doneAt], [false, undefined, undefined]);
});

test('a task holds at most 30 steps and each step needs a good id', async () => {
  fresh();
  const many = Array.from({ length: 31 }, (_, i) => ({ id: 's' + i, text: 'X', done: false }));
  assert.equal((await post(classC, { collection: 'tasks', item: { id: 'task-one', steps: many }, patch: true })).statusCode, 400);
  assert.equal((await post(classC, { collection: 'tasks', item: { id: 'task-one', steps: [{ id: 'bad id!', text: 'X', done: false }] }, patch: true })).statusCode, 400);
  assert.equal((await post(classC, { collection: 'tasks', item: { id: 'task-one', steps: [{ id: 'ok-1', text: 'X' }] }, patch: true })).statusCode, 400);
});

test('anyone can replace steps wholesale and move a task to another office', async () => {
  fresh();
  await post(classC, { op: 'add-step', taskId: 'task-one', step: { id: 's1', text: 'X' } });
  const r = await post(classC, { collection: 'tasks', item: { id: 'task-one', dept: 'hr', steps: [{ id: 'n1', text: 'New', done: false }] }, patch: true });
  assert.equal(r.statusCode, 200);
  const t = readDb().tasks['task-one'];
  assert.deepEqual([t.dept, t.steps.length, t.steps[0].id], ['hr', 1, 'n1']);
});

test('a full checklist (30 long steps, long names, long description) still saves and can be ticked', async () => {
  fresh();
  const name = 'N'.repeat(40);
  const steps = Array.from({ length: 30 }, (_, i) => ({ id: 's' + i, text: 'T'.repeat(200), done: i === 0, addedBy: name, ...(i === 0 ? { doneBy: name, doneAt: '2026-11-01T10:00:00.000Z' } : {}) }));
  const r = await post(classC, { collection: 'tasks', item: { id: 'task-one', desc: 'D'.repeat(2000), steps }, patch: true });
  assert.equal(r.statusCode, 200, JSON.stringify(r.body));
  const t = await post(classC, { op: 'tick-step', taskId: 'task-one', stepId: 's5', done: true, who: name });
  assert.equal(t.statusCode, 200, JSON.stringify(t.body));
  assert.equal(readDb().tasks['task-one'].steps[5].doneBy, name);
});

test('adding a 31st step says the checklist is full', async () => {
  fresh();
  const steps = Array.from({ length: 30 }, (_, i) => ({ id: 's' + i, text: 'X', done: false }));
  await post(classC, { collection: 'tasks', item: { id: 'task-one', steps }, patch: true });
  const r = await post(classC, { op: 'add-step', taskId: 'task-one', step: { id: 'extra', text: 'One more' } });
  assert.equal(r.statusCode, 400);
  assert.match(r.body.error, /checklist is full \(30 steps\)/);
});

test('a second tick on an already-ticked step keeps the first ticker', async () => {
  fresh();
  await post(classC, { op: 'add-step', taskId: 'task-one', step: { id: 's1', text: 'X' }, who: 'A' });
  await post(classC, { op: 'tick-step', taskId: 'task-one', stepId: 's1', done: true, who: 'A' });
  const first = readDb().tasks['task-one'].steps[0];
  const r = await post(classC, { op: 'tick-step', taskId: 'task-one', stepId: 's1', done: true, who: 'B' });
  assert.equal(r.statusCode, 200);
  const s = readDb().tasks['task-one'].steps[0];
  assert.equal(s.doneBy, 'A');
  assert.equal(s.doneAt, first.doneAt);
});

test('duplicate step ids and non-text names on steps are refused', async () => {
  fresh();
  const dup = [{ id: 'a', text: 'X', done: false }, { id: 'a', text: 'Y', done: false }];
  const r = await post(classC, { collection: 'tasks', item: { id: 'task-one', steps: dup }, patch: true });
  assert.equal(r.statusCode, 400);
  assert.match(r.body.error, /same id/);
  for (const bad of [{ addedBy: 5 }, { doneBy: {} }, { doneAt: 7 }]) {
    assert.equal((await post(classC, { collection: 'tasks', item: { id: 'task-one', steps: [{ id: 'a', text: 'X', done: false, ...bad }] }, patch: true })).statusCode, 400);
  }
});
