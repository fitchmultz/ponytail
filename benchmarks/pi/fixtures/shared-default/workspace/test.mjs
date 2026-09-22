import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const load = name => import(pathToFileURL(resolve(process.env.FIXTURE_WORKSPACE || '.', name)));
const { withDefault } = await load('defaults.mjs');
const { pageSize, includeArchived } = await load('search.mjs');
const { title } = await load('display.mjs');

test('reported bug and every sibling caller', () => {
  assert.equal(pageSize({ pageSize: 0 }), 0);
  assert.equal(includeArchived({ includeArchived: false }), false);
  assert.equal(title({ title: '' }), '');
  assert.equal(pageSize({}), 25);
  assert.equal(includeArchived({ includeArchived: null }), true);
  assert.equal(title({ title: undefined }), 'Untitled');
});
test('shared public helper retains all non-nullish values for future callers', () => {
  const fallback = {};
  for (const value of [false, 0, -0, '', NaN, 4, 'name', {}, []]) assert.equal(withDefault(value, fallback), value);
  for (const value of [null, undefined]) assert.equal(withDefault(value, fallback), fallback);
});
