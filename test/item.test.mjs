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
const ownerC = await login(loginRoute, 'owner-test');
const post = (cookie, body) => call(item, { method: 'POST', body, cookie });

test('classmate can check off a task, and the log shows their name', async () => {
  fresh();
  const r = await post(classC, { collection: 'tasks', item: { id: 'task-one', done: true }, patch: true, who: 'Test Person' });
  assert.equal(r.statusCode, 200);
  assert.equal(readDb().tasks['task-one'].done, true);
  assert.equal(readDb().log[0].who, 'Test Person');
});

test('classmate can still send a suggestion', async () => {
  fresh();
  const r = await post(classC, { collection: 'suggestions', item: { id: 'sug-1', title: 'Idea', dept: 'firm' }, who: 'Test Person' });
  assert.equal(r.statusCode, 200);
  assert.equal(readDb().suggestions['sug-1'].title, 'Idea');
});

test('classmate cannot edit, add events or delete', async () => {
  fresh();
  assert.equal((await post(classC, { collection: 'tasks', item: { id: 'task-one', title: 'Changed' }, patch: true })).statusCode, 403);
  assert.equal((await post(classC, { collection: 'events', item: { ...E1, id: 'new-ev' } })).statusCode, 403);
  assert.equal((await call(item, { method: 'DELETE', url: '/api/item?collection=tasks&id=task-one', cookie: classC })).statusCode, 403);
});

test('owner can add, edit and delete a task', async () => {
  fresh();
  const add = await post(ownerC, { collection: 'tasks', item: { id: 'task-two', dept: 'sales', title: 'New one', done: false }, who: 'CEO' });
  assert.equal(add.statusCode, 200);
  assert.equal((await post(ownerC, { collection: 'tasks', item: { id: 'task-two', dept: 'sales', title: 'Again' } })).statusCode, 409);
  const edit = await post(ownerC, { collection: 'tasks', item: { id: 'task-one', title: 'Renamed' }, patch: true, who: 'CEO' });
  assert.equal(edit.body.item.title, 'Renamed');
  assert.equal(edit.body.item.due, '2026-11-02'); // untouched fields kept
  const del = await call(item, { method: 'DELETE', url: '/api/item?collection=tasks&id=task-one&who=CEO', cookie: ownerC });
  assert.equal(del.statusCode, 200);
  assert.equal(readDb().tasks['task-one'], undefined);
  assert.equal(readDb().trash['tasks:task-one'].item.title, 'Renamed');
});

test('owner can restore from Recently deleted', async () => {
  fresh();
  await call(item, { method: 'DELETE', url: '/api/item?collection=events&id=event-one', cookie: ownerC });
  const r = await post(ownerC, { op: 'restore', trashId: 'events:event-one', who: 'CEO' });
  assert.equal(r.statusCode, 200);
  assert.equal(readDb().events['event-one'].title, 'Test event');
  assert.equal(readDb().trash['events:event-one'], undefined);
});

test('calendar items need a "how sure" label', async () => {
  fresh();
  const r = await post(ownerC, { collection: 'events', item: { id: 'ev-x', dept: 'firm', title: 'No label', date: '2026-12-01', kind: 'deadline' } });
  assert.equal(r.statusCode, 400);
  assert.match(r.body.error, /how sure/i);
});

test('Circles items cannot be deleted', async () => {
  fresh();
  const r = await call(item, { method: 'DELETE', url: '/api/item?collection=coe&id=c1', cookie: ownerC });
  assert.equal(r.statusCode, 403);
});

test('trash is only sent to the owner', async () => {
  fresh();
  await call(item, { method: 'DELETE', url: '/api/item?collection=tasks&id=task-one', cookie: ownerC });
  assert.equal((await call(data, { cookie: classC })).body.trash, undefined);
  assert.equal((await call(data, { cookie: ownerC })).body.trash.length, 1);
});

test('trash older than 30 days is pruned on the next delete', async () => {
  seed({ tasks: { [T1.id]: T1 }, trash: { 'tasks:old': { id: 'tasks:old', collection: 'tasks', item: { id: 'old' }, title: 'old', deletedAt: '2026-01-01T00:00:00.000Z', deletedBy: 'CEO' } } });
  await call(item, { method: 'DELETE', url: '/api/item?collection=tasks&id=task-one', cookie: ownerC });
  assert.equal(readDb().trash['tasks:old'], undefined);
});
