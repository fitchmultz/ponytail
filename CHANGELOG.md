# Changelog

## 6.0.0

### Runtime

- Requires Node.js 24.15 or newer. CI runs on Node 24 (from `.node-version`) and Python 3.14.
- Dependencies are exact pins on their latest stable releases, and both lockfiles were regenerated from scratch. A test fails if a lockfile resolves from anywhere but `https://registry.npmjs.org/`.

### Pi

- Supports official Pi 0.87.1 and the supported Pi fork. On the fork, a resumed session whose saved system prompt is opaque is restarted with a `replace` system message; Ponytail now keeps its section on that message instead of losing it for the turn.

### MCP server

- Moves to MCP TypeScript SDK v2 (`@modelcontextprotocol/server` 2.1.0) and zod 4. Tool schemas are published as JSON Schema 2020-12.
- `prompts/get` accepts requests without `arguments`, since `mode` is optional.
- A stdio test exercises the prompt and tool through a raw JSON-RPC client.

Install with `pi install git:github.com/fitchmultz/ponytail@v6.0.0`.

## 5.0.0

### Policy

- One shared Markdown policy and small mode definition drive Node and Python adapters. Standalone skills, static rules, command wrappers, and OpenClaw copies are generated from those sources.
- All intensities preserve the complete requested outcome, existing behavior, validation, security, accessibility, and proportional verification. No line, test, or explanation quotas.
- Review, audit, debt, help, and historical benchmark workflows remain available. Benchmark results are qualified by their original model and tasks, without universal safety or savings claims.

### Pi

- Requires Pi 0.87.0 or newer. One named prompt section composes with other extensions; mode changes take effect at the next model call, including active runs and queued work.
- Modes belong to the current session branch. Resume and tree navigation restore saved state; new sessions pin their initial default.
- Workflow aliases preserve arguments, expand native skills, queue follow-ups during work, and respect disabled skills.
- `/ponytail` controls persistent mode. The standalone `/skill:ponytail` remains available without changing session state.
- A mode-only status indicator replaces the activity display. Standalone stop messages do not require a model response. Malformed configuration is preserved when a default update fails.

### Validation and distribution

- Pinned native SDK contract tests and a reproducible Pi CLI task evaluation with independent checks, paired repetitions, and holdout coverage.
- GitHub/Pi Git distribution for this fork; upstream npm publishing is disabled on fork tags. Install with `pi install git:github.com/fitchmultz/ponytail@v5.0.0`.

A deliberate full-system-prompt replacement by another extension retains native precedence. Turning Ponytail off does not remove independent repository rules or instructions already present in earlier messages.
