#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

test('root npm test covers bundled subprojects', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.match(packageJson.scripts.test, /npm test --prefix pi-extension/);
  assert.match(packageJson.scripts.test, /npm test --prefix ponytail-mcp/);
  assert.match(packageJson.scripts.test, /node --test benchmarks\/pi\/run\.test\.mjs/);
});

test('release tag must exactly match the package version', () => {
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  for (const [tag, expectedStatus] of [[`v${version}`, 0], [`v${version}-rc.1`, 1], ['vnot-a-version', 1], ['v0.0.0', 1]]) {
    const result = spawnSync(process.execPath, ['scripts/check-versions.js'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: tag },
    });
    assert.equal(result.status, expectedStatus, `${tag}: ${result.stdout}${result.stderr}`);
  }
});
