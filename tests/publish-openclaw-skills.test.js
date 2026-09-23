const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('publishing passes release notes literally without executing shell commands', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-publish-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const bin = path.join(temp, 'bin');
  fs.mkdirSync(bin);
  const log = path.join(temp, 'calls.jsonl');
  const marker = path.join(temp, 'injected');
  const fake = path.join(bin, 'clawhub');
  fs.writeFileSync(fake, `#!/usr/bin/env node
require('node:fs').appendFileSync(process.env.PONYTAIL_TEST_LOG, JSON.stringify(process.argv.slice(2)) + '\\n');
`, { mode: 0o755 });
  if (process.platform === 'win32') {
    fs.writeFileSync(`${fake}.cmd`, `@"${process.execPath}" "${fake}" %*\r\n`);
  }

  const args = ['--dry-run', '--changelog', `Release notes: $(echo injected > "${marker}")`];
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') || 'PATH';
  const result = spawnSync(process.execPath, [path.join(__dirname, '../scripts/publish-openclaw-skills.js'), ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      [pathKey]: `${bin}${path.delimiter}${process.env[pathKey] || ''}`,
      PONYTAIL_TEST_LOG: log,
    },
  });

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(fs.existsSync(marker), false, 'release-note text must not run as a command');
  const calls = fs.readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert.ok(calls.length > 0, 'the fake publisher must be invoked');
  for (const call of calls) assert.deepEqual(call.slice(-args.length), args);
});
