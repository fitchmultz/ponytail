import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const load = name => import(pathToFileURL(resolve(process.env.FIXTURE_WORKSPACE, name)));
const { compactRanges } = await load('ranges.mjs');
const { totalDuration } = await load('availability.mjs');

test('empty, nested, disjoint and negative ranges', () => {
  assert.deepEqual(compactRanges([]), []);
  assert.equal(totalDuration([]), 0);
  const input = [[8, 9], [-4, -1], [2, 7], [3, 4], [-1, 2], [8, 9]];
  assert.deepEqual(compactRanges(input), [[-4, 7], [8, 9]]);
  assert.equal(totalDuration(input), 12);
});
test('original arrays are neither mutated nor returned by reference', () => {
  const original = Object.freeze([Object.freeze([9, 12]), Object.freeze([1, 3])]);
  const merged = compactRanges(original);
  assert.deepEqual(merged, [[1, 3], [9, 12]]);
  assert.notEqual(merged, original);
  assert.notEqual(merged[0], original[1]);
  assert.notEqual(compactRanges([original[0]])[0], original[0]);
});
test('invalid shapes and endpoints rejected on both public surfaces', () => {
  for (const input of [null, {}, [1], [[1]], [[1, 2, 3]], [[2, 2]], [[3, 2]], [['1', 2]], [[NaN, 2]], [[0, Infinity]], [[0, 1.5]], [[0, Number.MAX_SAFE_INTEGER + 1]]]) {
    assert.throws(() => compactRanges(input));
    assert.throws(() => totalDuration(input));
  }
});
test('union length agrees with independently enumerated integer slots', () => {
  for (let offset = -3; offset <= 3; offset++) {
    const ranges = [[offset, offset + 4], [2, 6], [-5, -2], [offset + 1, offset + 2]];
    const slots = new Set(ranges.flatMap(([a, b]) => Array.from({ length: b - a }, (_, i) => a + i)));
    assert.equal(totalDuration(ranges), slots.size);
  }
});
