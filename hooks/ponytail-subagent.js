#!/usr/bin/env node
// ponytail — Claude Code SubagentStart hook
//
// SessionStart context is parent-thread only and never reaches subagents, so
// without this every Task-spawned agent runs ponytail-unaware (issue #252).
// When ponytail mode is active, inject the same ruleset into each subagent.
//
// Scoping (opt-in, issue #506): set PONYTAIL_SUBAGENT_MATCHER to a regex and
// the ruleset is injected only into subagents whose agent_type matches. The
// regex is unanchored and case-insensitive — "explore|general" matches either,
// "^general$" is exact. Unset means inject into every subagent, as before.

const { getPonytailInstructions } = require('./ponytail-instructions');
const { isCopilot, isCursor, isQoder, readMode, withHookInput, writeHookOutput } = require('./ponytail-runtime');

// A bad regex must never crash the hook; treat it as "no matcher" and inject.
let matcherRe = null;
try {
  if (process.env.PONYTAIL_SUBAGENT_MATCHER) {
    matcherRe = new RegExp(process.env.PONYTAIL_SUBAGENT_MATCHER, 'i');
  }
} catch (e) {
  matcherRe = null;
}

function inject({ session_id: sessionId, agent_type: agentType } = {}) {
  const mode = readMode(sessionId);
  if (!mode || mode === 'off') return;
  const type = String(agentType || '').trim();
  if (matcherRe && type && !matcherRe.test(type)) return;
  try {
    writeHookOutput('SubagentStart', mode, getPonytailInstructions(mode));
  } catch (e) {
    // Silent fail — a stdout error at hook exit must not surface as a hook failure.
  }
}

// Qoder, Copilot and Cursor keep their existing host flag and need no stdin
// without a matcher. Claude/Codex need the parent session ID to avoid reading
// another conversation's mode. A short timeout keeps broken Windows pipes fast.
if (!matcherRe && (isQoder || isCopilot || isCursor)) inject();
else withHookInput(inject, matcherRe ? 1000 : 100);
