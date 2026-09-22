#!/usr/bin/env node
// Check every generated policy copy, not wording canaries.
const { check } = require('./build-openclaw-skills');
if (!check()) process.exitCode = 1;
else console.log('Generated skills, rules, commands, and OpenClaw copies match their canonical sources.');
