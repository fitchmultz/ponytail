#!/usr/bin/env node
const { readMode, withHookInput } = require('./ponytail-runtime');

withHookInput(({ session_id: sessionId }) => {
  const mode = readMode(sessionId);
  if (!mode || mode === 'off') return;
  const color = mode === 'ultra' ? 173 : 108;
  const label = mode === 'full' ? 'PONYTAIL' : `PONYTAIL:${mode.toUpperCase()}`;
  process.stdout.write(`\x1b[38;5;${color}m[${label}]\x1b[0m`);
}, 100);
