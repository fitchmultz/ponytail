const fs = require('fs');
const path = require('path');
const os = require('os');
const { createHash } = require('crypto');
const { getClaudeDir, getConfigDir } = require('./ponytail-config');

const STATE_FILE = '.ponytail-active';

// ponytail: VS Code Copilot never sets COPILOT_PLUGIN_DATA — it only injects
// CLAUDE_PLUGIN_ROOT, pointed at an install path under .vscode/agent-plugins/
// (#528). Without this fallback isCopilot was false, so ponytail assumed
// native Claude Code and emitted the statusline nudge, which VS Code Copilot
// doesn't read.
function isVsCodeCopilotRoot(pluginRoot) {
  if (!pluginRoot) return false;
  return pluginRoot.split(/[\\/]+/).includes('agent-plugins') &&
    pluginRoot.toLowerCase().includes('.vscode');
}

const isCopilot = Boolean(process.env.COPILOT_PLUGIN_DATA) ||
  isVsCodeCopilotRoot(process.env.CLAUDE_PLUGIN_ROOT);
const isCodex = !isCopilot && Boolean(process.env.PLUGIN_DATA);
const isQoder = !isCopilot && !isCodex && Boolean(process.env.QODER_SESSION_ID);
// Cursor (#817): CURSOR_VERSION is set only in the environment Cursor builds
// for hook processes (Cursor 3.20.17 assigns it in exactly one place, the hook
// env builder), so it never leaks into a Claude Code session running inside
// Cursor's terminal. Cursor also sets it when it runs a Claude-format plugin's
// hooks next to CLAUDE_PLUGIN_ROOT, and it needs Cursor-shaped JSON either
// way, so this check comes after the hosts with their own data dirs.
const isCursor = !isCopilot && !isCodex && !isQoder && Boolean(process.env.CURSOR_VERSION);

let stateDir = getClaudeDir();
if (isCodex) stateDir = process.env.PLUGIN_DATA;
// COPILOT_PLUGIN_DATA is unset under VS Code Copilot, so fall back to
// getClaudeDir() rather than building a path from undefined.
if (isCopilot) stateDir = process.env.COPILOT_PLUGIN_DATA || getClaudeDir();
if (isQoder) {
  const session = createHash('sha256').update(process.env.QODER_SESSION_ID).digest('hex');
  stateDir = path.join(os.homedir(), '.qoder', '.ponytail-sessions', session);
}
if (isCursor) stateDir = path.join(os.homedir(), '.cursor');

const statePath = path.join(stateDir, STATE_FILE);

function modePath(sessionId) {
  // ponytail: hosts without Claude/Codex session IDs keep the legacy flag;
  // migrate their own lifecycle when session isolation is needed there.
  if (isCopilot || isCursor || isQoder || typeof sessionId !== 'string' || !sessionId) return statePath;
  const session = createHash('sha256').update(sessionId).digest('hex');
  return path.join(stateDir, '.ponytail-sessions', session, STATE_FILE);
}

function setMode(mode, sessionId) {
  const file = modePath(sessionId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, mode);
}

function clearMode(sessionId) {
  // Qoder initializes missing state on every prompt, so preserve an explicit off.
  if (isQoder) return setMode('off', sessionId);
  try { fs.unlinkSync(modePath(sessionId)); } catch (e) {}
}

// Live mode written by activate/mode-tracker. Absent flag = ponytail off.
function readMode(sessionId) {
  try {
    return fs.readFileSync(modePath(sessionId), 'utf8').trim() || null;
  } catch (e) {
    return null;
  }
}

function withHookInput(callback, timeoutMs = 1000) {
  let input = '';
  let done = false;
  function finish(parsed) {
    if (done) return;
    done = true;
    if (parsed === undefined) {
      try { parsed = JSON.parse(input.replace(/^\uFEFF/, '')); } catch (e) { parsed = {}; }
    }
    callback(parsed && typeof parsed === 'object' ? parsed : {});
  }
  process.stdin.on('data', chunk => {
    input += chunk;
    let parsed;
    try { parsed = JSON.parse(input.replace(/^\uFEFF/, '')); } catch (e) { return; }
    finish(parsed);
    process.stdin.destroy();
  });
  process.stdin.on('end', () => finish());
  process.stdin.on('error', () => { finish(); process.stdin.destroy(); });
  setTimeout(() => { finish(); process.stdin.destroy(); }, timeoutMs).unref();
}

// Cursor's always-on project rule (.cursor/rules/ponytail.mdc) already puts the
// ruleset in front of every prompt and no hook can switch a rule off, so while
// it is in the workspace the hooks step back instead of injecting a second,
// possibly contradicting, copy (#817). Cursor hands every hook the workspace
// root as CURSOR_PROJECT_DIR; project hooks also run from that directory.
// ponytail: first workspace root only, a rule in a secondary folder of a
// multi-root workspace goes undetected.
function cursorRulePath() {
  const root = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const rule = path.join(root, '.cursor', 'rules', 'ponytail.mdc');
  return fs.existsSync(rule) ? rule : null;
}

function cursorRuleNotice(rule) {
  return 'PONYTAIL: the always-on Cursor rule ' + rule + ' is active in this workspace and ' +
    'already carries the ponytail ruleset, so the ponytail hooks injected nothing further. ' +
    'Mode switching (/ponytail lite|full|ultra|off, "stop ponytail") is unavailable while ' +
    'that rule exists. When the user tries to switch or turn off ponytail, tell them to ' +
    'delete that rule so hooks.json can manage the level.';
}

function writeHookOutput(event, mode, context = '') {
  if (isCopilot) {
    // Copilot reads additionalContext on SessionStart; ignores output elsewhere.
    process.stdout.write(JSON.stringify(
      event === 'SessionStart' && context ? { additionalContext: context } : {}));
    return;
  }
  if (isCodex) {
    const output = { systemMessage: `PONYTAIL:${mode.toUpperCase()}` };
    if (context) {
      output.hookSpecificOutput = {
        hookEventName: event,
        additionalContext: context,
      };
    }
    process.stdout.write(JSON.stringify(output));
    return;
  }
  if (isQoder) {
    // Qoder: hookSpecificOutput JSON, same shape as Codex minus systemMessage.
    // UserPromptSubmit additionalContext is injected into the Agent's conversation.
    const output = {};
    if (context) {
      output.hookSpecificOutput = {
        hookEventName: event,
        additionalContext: context,
      };
    }
    process.stdout.write(JSON.stringify(output));
    return;
  }
  if (isCursor) {
    // Cursor parses stdout as JSON and treats empty stdout as "nothing to
    // say"; raw text would be logged as a parse error. sessionStart takes
    // additional_context into the conversation's system context;
    // beforeSubmitPrompt needs continue:true and, in Cursor 3.20.17, injects
    // additional_context into that turn (docs/cursor-hooks.md).
    if (!context) return;
    const output = { additional_context: context };
    if (event === 'UserPromptSubmit') output.continue = true;
    process.stdout.write(JSON.stringify(output));
    return;
  }
  // Native Claude: SessionStart accepts raw stdout, but SubagentStart needs the
  // hookSpecificOutput JSON form or the context is dropped.
  if (event === 'SubagentStart') {
    process.stdout.write(JSON.stringify(
      { hookSpecificOutput: { hookEventName: event, additionalContext: context } }));
    return;
  }
  process.stdout.write(context);
}

module.exports = {
  clearMode,
  cursorRuleNotice,
  cursorRulePath,
  isCodex,
  isCopilot,
  isCursor,
  isQoder,
  readMode,
  setMode,
  withHookInput,
  writeHookOutput,
};
