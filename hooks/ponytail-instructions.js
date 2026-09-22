#!/usr/bin/env node
// Required packaged policy, shared by every Node host adapter. No fallback copy.
const fs = require('fs');
const path = require('path');
const { DEFAULT_MODE, normalizePersistedMode } = require('./ponytail-config');

const core = fs.readFileSync(path.join(__dirname, 'ponytail-core.md'), 'utf8').replace(/\r\n/g, '\n').trim();
const modes = JSON.parse(fs.readFileSync(path.join(__dirname, 'ponytail-modes.json'), 'utf8'));

function getPonytailInstructions(mode) {
  const effective = normalizePersistedMode(mode) || DEFAULT_MODE;
  if (effective === 'off') return '';
  if (effective === 'review') {
    return 'PONYTAIL MODE ACTIVE — level: review. Behavior defined by /ponytail-review skill.';
  }
  if (!core || typeof modes[effective] !== 'string' || !modes[effective].trim()) {
    throw new Error(`Invalid packaged Ponytail policy for ${effective}`);
  }
  return `PONYTAIL MODE ACTIVE — level: ${effective}\n\n${core}\n\n## Current level: ${effective}\n\n${modes[effective]}\n`;
}

module.exports = { getPonytailInstructions };
