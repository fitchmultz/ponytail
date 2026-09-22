#!/usr/bin/env node
// Generate shipped instructions at development time; installation needs no build.
// Core policy: hooks/ponytail-core.md + ponytail-modes.json.
// Workflow policy: the five skills/ponytail-*/SKILL.md files.
// Run this script after editing either source; --check detects stale copies.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HOMEPAGE = 'https://github.com/fitchmultz/ponytail';
const modes = require('../hooks/ponytail-modes.json');
const DESCRIPTIONS = {
  'ponytail': 'Simplify coding work when asked for Ponytail or less complexity. Standalone guidance preserves requested capabilities; lite, full, or ultra.',
  'ponytail-review': 'Review a diff for over-engineering with evidence-backed, behavior-preserving simplifications. Report only.',
  'ponytail-audit': 'Audit a repository for over-engineering. Rank evidence-backed simplifications that preserve required behavior. Report only.',
  'ponytail-debt': 'Harvest ponytail: shortcut comments into a debt ledger with ceilings and upgrade paths. One-shot report.',
  'ponytail-gain': 'Show the historical agentic benchmark scoreboard and its limits. Not current-model or per-repo savings. One-shot display.',
  'ponytail-help': 'Quick reference for Ponytail modes, skills, and host-specific controls. One-shot display.',
};
const NAMES = Object.keys(DESCRIPTIONS);
const RULE_HEADERS = {
  'AGENTS.md': '',
  '.cursor/rules/ponytail.mdc': '---\ndescription: Ponytail, simplest complete solutions.\nglobs:\nalwaysApply: true\n---\n\n',
  '.windsurf/rules/ponytail.md': '',
  '.clinerules/ponytail.md': '',
  '.agents/rules/ponytail.md': '',
  '.qoder/rules/ponytail.md': '',
  '.github/copilot-instructions.md': '',
  '.kiro/steering/ponytail.md': '---\ntitle: Ponytail, simplest complete solutions\ninclusion: always\n---\n\n',
};

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');
}

function standaloneBody() {
  return read('hooks/ponytail-core.md').trim() + '\n\n## Levels\n\n' +
    Object.entries(modes).map(([mode, text]) => `- **${mode}**: ${text}`).join('\n') +
    '\n\nApply the requested level (default full) to coding work until the user changes it or says "stop ponytail" or "normal mode".\n' +
    'On Pi, `/skill:ponytail` supplies these standalone instructions without changing saved mode; use `/ponytail lite|full|ultra|off` for persistent control.\n';
}

function sourceBody(name) {
  if (name === 'ponytail') return standaloneBody();
  const src = read(`skills/${name}/SKILL.md`);
  const fm = src.match(/^---\n[\s\S]*?\n---\n?/);
  if (!fm) throw new Error(`skills/${name}/SKILL.md has no frontmatter`);
  return src.slice(fm[0].length).trim() + '\n';
}

function render(name) {
  const desc = DESCRIPTIONS[name];
  if (desc.length > 160 || desc.includes('\n') || desc.includes('"')) {
    throw new Error(`description for ${name} must be one line, no quotes, under 160 chars`);
  }
  return `---\nname: ${name}\ndescription: "${desc}"\nhomepage: ${HOMEPAGE}\nlicense: MIT\n---\n\n` + sourceBody(name);
}

function outPath(name) {
  return path.join(ROOT, '.openclaw', 'skills', name, 'SKILL.md');
}

function commandBody(name, args) {
  const control = name === 'ponytail'
    ? 'Honor the host runtime\'s mode or control result when present. Otherwise use the requested level, defaulting to full. If off is requested, stop applying Ponytail. Status/default requests only report or configure as supported by the host; do not treat them as a session-level switch. The policy below is the reference for active levels.\n\n'
    : '';
  return `${control}${sourceBody(name)}\nUser arguments: ${args}\n`;
}

function generatedFiles() {
  const files = new Map();
  files.set('skills/ponytail/SKILL.md',
    `---\nname: ponytail\ndescription: "${DESCRIPTIONS.ponytail}"\nargument-hint: "[lite|full|ultra]"\nlicense: MIT\n---\n\n${standaloneBody()}`);
  const compact = read('hooks/ponytail-core.md').trim() + `\n\n## Level: full\n\n${modes.full}\n`;
  for (const [relative, header] of Object.entries(RULE_HEADERS)) {
    files.set(relative, header + compact + (relative === 'AGENTS.md'
      ? '\n(Yes, this file also applies to agents working on the ponytail repo itself. Especially to them.)\n'
      : ''));
  }
  for (const name of NAMES) {
    files.set(path.relative(ROOT, outPath(name)), render(name));
    const description = name === 'ponytail' ? 'Set Ponytail level: lite, full, ultra, or off' : DESCRIPTIONS[name];
    files.set(`commands/${name}.toml`,
      `description = ${JSON.stringify(description)}\nprompt = ${JSON.stringify(commandBody(name, '{{args}}'))}\n`);
    files.set(`.opencode/command/${name}.md`,
      `---\ndescription: ${JSON.stringify(description)}\n---\n\n${commandBody(name, '$ARGUMENTS')}`);
  }
  return files;
}

function check() {
  const stale = [...generatedFiles()].filter(([relative, expected]) =>
    !fs.existsSync(path.join(ROOT, relative)) || read(relative) !== expected);
  for (const [relative] of stale) console.error(`${relative} is stale; run node scripts/build-openclaw-skills.js`);
  return stale.length === 0;
}

module.exports = { DESCRIPTIONS, NAMES, render, outPath, sourceBody, generatedFiles, check };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    process.exitCode = check() ? 0 : 1;
  } else {
    for (const [relative, content] of generatedFiles()) {
      const p = path.join(ROOT, relative);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content);
      console.log('wrote', relative.replace(/\\/g, '/'));
    }
  }
}
