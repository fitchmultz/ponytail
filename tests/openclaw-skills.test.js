#!/usr/bin/env node
// The OpenClaw skill package (.openclaw/skills/) is generated from skills/ by
// scripts/build-openclaw-skills.js. These tests fail if the committed copies are
// stale (ruleset drift) or if a description breaks OpenClaw's one-line <160 rule.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { NAMES, DESCRIPTIONS, generatedFiles } = require('../scripts/build-openclaw-skills');

test('every shipped standalone skill, rule, and command matches its canonical source', () => {
  for (const [relative, expected] of generatedFiles()) {
    const actual = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(actual, expected, `${relative}: run node scripts/build-openclaw-skills.js`);
  }
});

for (const name of NAMES) {
  test(`${name}: description is one line under 160 chars`, () => {
    const d = DESCRIPTIONS[name];
    assert.ok(d.length <= 160 && !d.includes('\n'), 'description too long or multiline');
  });
}
