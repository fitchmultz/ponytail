import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const load = name => import(pathToFileURL(resolve(process.env.FIXTURE_WORKSPACE || '.', name)));
const { memoizeWithTtl } = await load('cache.mjs');
const { createCatalog } = await load('catalog.mjs');

test('construction validates function and TTL', () => {
  assert.throws(() => memoizeWithTtl(null, 1));
  for (const ttl of [0, -1, NaN, Infinity, '10', undefined]) assert.throws(() => memoizeWithTtl(() => 1, ttl));
});
test('identity, falsy results, absolute expiry and uncached exceptions', () => {
  let time = 0, calls = 0;
  const a = {}, b = {};
  const values = [false, 0, '', null, undefined, a, b];
  const cached = memoizeWithTtl(key => { calls++; return key; }, 10, () => time);
  for (const key of values) { assert.equal(cached(key), key); assert.equal(cached(key), key); }
  assert.equal(calls, values.length);
  time = 9; cached(a);
  time = 10; cached(a);
  assert.equal(calls, values.length + 1);
  let attempts = 0;
  const flaky = memoizeWithTtl(() => { if (++attempts === 1) throw new Error('temporary'); return 0; }, 10, () => time);
  assert.throws(() => flaky('x'), /temporary/);
  assert.equal(flaky('x'), 0); assert.equal(flaky('x'), 0); assert.equal(attempts, 2);
});
test('catalog integration caches per instance and expires', () => {
  let time = 0, calls = 0;
  const loader = id => ({ id, version: ++calls });
  const first = createCatalog(loader, 5, () => time), second = createCatalog(loader, 5, () => time);
  const product = first('p');
  assert.equal(first('p'), product);
  assert.notEqual(second('p'), product);
  time = 5;
  assert.notEqual(first('p'), product);
  assert.equal(calls, 3);
});
