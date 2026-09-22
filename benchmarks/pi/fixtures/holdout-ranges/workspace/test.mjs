import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const load = name => import(pathToFileURL(resolve(process.env.FIXTURE_WORKSPACE || '.', name)));
const { compactRanges } = await load('ranges.mjs');
const { totalDuration } = await load('availability.mjs');
test('merge touching intervals and count union duration', () => {
  assert.deepEqual(compactRanges([[3, 5], [1, 3]]), [[1, 5]]);
  assert.equal(totalDuration([[1, 4], [2, 5]]), 4);
});
