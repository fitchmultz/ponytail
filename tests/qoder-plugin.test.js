#!/usr/bin/env node
// Smoke test for the Qoder plugin adapter: verify manifest, rules, and skills
// wiring are present and consistent.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SKILL_DIRS = [
  'ponytail',
  'ponytail-review',
  'ponytail-audit',
  'ponytail-debt',
  'ponytail-gain',
  'ponytail-help',
];

function readJSON(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

test('qoder plugin manifest exists and has required fields', () => {
  const manifest = readJSON('.qoder-plugin/plugin.json');
  assert.equal(manifest.name, 'ponytail');
  assert.ok(manifest.version, 'manifest must declare a version');
  assert.ok(manifest.description, 'manifest must declare a description');
  assert.ok(manifest.author, 'manifest must declare an author');
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.skills, './skills/');
  assert.equal(manifest.rules, './.qoder/rules/');
  assert.equal(manifest.hooks, './hooks/qoder-hooks.json');
});

test('qoder hooks config registers prompt and subagent start hooks', () => {
  const hooksConfig = readJSON('hooks/qoder-hooks.json');
  assert.ok(hooksConfig.hooks, 'hooks config must have a hooks key');
  assert.ok(hooksConfig.hooks.UserPromptSubmit, 'must register UserPromptSubmit hook');
  assert.ok(Array.isArray(hooksConfig.hooks.UserPromptSubmit), 'UserPromptSubmit must be an array');
  const cmd = hooksConfig.hooks.UserPromptSubmit[0].hooks[0].command;
  assert.ok(cmd.includes('ponytail-mode-tracker.js'), 'must point at ponytail-mode-tracker.js');
  const subagentHook = hooksConfig.hooks.SubagentStart?.[0]?.hooks[0];
  assert.ok(subagentHook?.command.includes('ponytail-subagent.js'), 'must inject the ruleset at SubagentStart');
});

test('qoder manifest points at skills that actually ship', () => {
  const manifest = readJSON('.qoder-plugin/plugin.json');
  const skillsDir = path.join(root, manifest.skills);
  assert.ok(fs.existsSync(skillsDir), 'skills/ directory must exist');

  for (const skill of SKILL_DIRS) {
    const skillFile = path.join(skillsDir, skill, 'SKILL.md');
    assert.ok(
      fs.existsSync(skillFile),
      `missing skill: skills/${skill}/SKILL.md`,
    );
  }
});
