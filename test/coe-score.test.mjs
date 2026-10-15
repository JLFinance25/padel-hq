// The Circles score math lives in browser code (public/js/core.js). This pulls out just that function and runs it on test data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../public/js/core.js', import.meta.url), 'utf8');
const fn = src.match(/function coeScore\(\) \{[\s\S]*?\n\}\n/);
assert.ok(fn, 'coeScore not found in core.js');
const score = (coe) => {
  const ctx = { S: { coe } };
  vm.createContext(ctx);
  vm.runInContext(fn[0] + '\nthis.result = coeScore();', ctx);
  return { ...ctx.result };
};
const item = (points, o = {}) => ({ points, period: 1, bonus: false, done: false, ...o });

test('done counts only ticked regular items', () => {
  const r = score([item(2, { done: true }), item(3, { done: true }), item(5), item(4, { period: 'fall-bonus', bonus: true, done: true })]);
  assert.equal(r.done, 5);
});

test('each bonus window counts at most 2 points', () => {
  const r = score([
    item(1, { period: 'fall-bonus', bonus: true, done: true }), item(2, { period: 'fall-bonus', bonus: true, done: true }),
    item(2, { period: 'spring-bonus', bonus: true, done: true }), item(1, { period: 'spring-bonus', bonus: true }),
  ]);
  assert.equal(r.bonus, 4);
  assert.equal(score([item(1, { period: 'fall-bonus', bonus: true, done: true })]).bonus, 1);
});

test('listed adds every regular point, ticked or not, and leaves bonuses out', () => {
  const r = score([item(2, { done: true }), item(3), item(1, { period: 5 }), item(2, { period: 'spring-bonus', bonus: true })]);
  assert.equal(r.listed, 6);
  assert.deepEqual(score([]), { done: 0, bonus: 0, listed: 0 });
});
