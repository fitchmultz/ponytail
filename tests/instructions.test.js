const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { getPonytailInstructions } = require('../hooks/ponytail-instructions');
const modes = require('../hooks/ponytail-modes.json');

const hooks = path.join(__dirname, '..', 'hooks');
const core = fs.readFileSync(path.join(hooks, 'ponytail-core.md'), 'utf8').replace(/\r\n/g, '\n').trim();

test('every active mode carries the complete core and only its own intensity', () => {
  assert.deepEqual(Object.keys(modes), ['lite', 'full', 'ultra']);
  for (const [mode, delta] of Object.entries(modes)) {
    assert.equal(getPonytailInstructions(mode),
      `PONYTAIL MODE ACTIVE — level: ${mode}\n\n${core}\n\n## Current level: ${mode}\n\n${delta}\n`);
    for (const [other, text] of Object.entries(modes)) {
      if (other !== mode) assert.ok(!getPonytailInstructions(mode).includes(text));
    }
  }
});

test('selection preserves normalization, default, off, and the legacy review pointer', () => {
  assert.equal(getPonytailInstructions(' ULTRA '), getPonytailInstructions('ultra'));
  for (const value of [undefined, null, '', 'unknown']) {
    assert.equal(getPonytailInstructions(value), getPonytailInstructions('full'));
  }
  assert.equal(getPonytailInstructions('off'), '');
  assert.equal(getPonytailInstructions('review'),
    'PONYTAIL MODE ACTIVE — level: review. Behavior defined by /ponytail-review skill.');
});

test('packaged Node policy needs no skill parser and missing required assets fail at load', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-policy-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const entry = path.join(root, 'ponytail-instructions.js');
  for (const name of ['ponytail-instructions.js', 'ponytail-config.js', 'ponytail-core.md', 'ponytail-modes.json']) {
    fs.copyFileSync(path.join(hooks, name), path.join(root, name));
  }
  // A CRLF checkout has the same instruction body as a packaged LF checkout.
  fs.writeFileSync(path.join(root, 'ponytail-core.md'), core.replace(/\n/g, '\r\n'));
  assert.equal(require(entry).getPonytailInstructions('full'), getPonytailInstructions('full'));
  for (const asset of ['ponytail-core.md', 'ponytail-modes.json']) {
    delete require.cache[require.resolve(entry)];
    fs.unlinkSync(path.join(root, asset));
    assert.throws(() => require(entry), (error) => error.code === 'ENOENT' && error.path.endsWith(asset));
    fs.copyFileSync(path.join(hooks, asset), path.join(root, asset));
  }
  delete require.cache[require.resolve(entry)];
  fs.writeFileSync(path.join(root, 'ponytail-modes.json'), '{broken');
  assert.throws(() => require(entry), SyntaxError);
});
