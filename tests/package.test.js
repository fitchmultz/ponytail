#!/usr/bin/env node
// The README tells users to run `node scripts/uninstall.js`, so the npm package
// must actually ship it. Guard the files entry so it can't silently drop out.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

test('npm package ships the advertised cleanup script', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(
    pkg.files.includes('scripts/uninstall.js'),
    'package.json "files" must include scripts/uninstall.js (README tells users to run it)',
  );
  // And the file it points at must exist.
  assert.ok(
    fs.existsSync(path.join(root, 'scripts', 'uninstall.js')),
    'scripts/uninstall.js is listed in files but missing on disk',
  );
});

// npm records whichever registry served a package; a local proxy or mirror
// would otherwise leak into the lockfile and break installs for everyone else.
test('lockfiles resolve only from the public npm registry', () => {
  for (const lockfile of ['package-lock.json', 'ponytail-mcp/package-lock.json']) {
    const { packages } = JSON.parse(fs.readFileSync(path.join(root, lockfile), 'utf8'));
    for (const [name, entry] of Object.entries(packages)) {
      if (entry.resolved === undefined) continue;
      assert.ok(entry.resolved.startsWith('https://registry.npmjs.org/'), `${lockfile} ${name}: ${entry.resolved}`);
    }
  }
});
