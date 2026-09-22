import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { execute, fixture, grade, options, parseEvents, run, schedule, summarize, taskNames } from './run.mjs';
import observe from './observe.mjs';

const scratch = t => {
  const dir = mkdtempSync(join(tmpdir(), 'ponytail-pi-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const usage = { input: 700, cacheRead: 200, cacheWrite: 100, output: 300, reasoning: 250, totalTokens: 1300, cost: { total: 0.02345 } };
const message = (stopReason = 'stop', reported = usage) => ({ type: 'message_end', message: { role: 'assistant', stopReason, usage: reported, content: [] } });
const exit = { code: 0, timedOut: false };

test('terminal agent errors fail even with exit zero and passing checks', () => {
  for (const reason of ['error', 'aborted', 'length', 'pending', 'deferred', 'toolUse']) {
    const result = summarize([message(reason)], exit);
    assert.ok(result.failures.includes('final-assistant-did-not-stop'));
  }
  assert.ok(summarize([message('error'), message()], exit).failures.includes('assistant-error'));
  assert.ok(summarize([], exit).failures.length);
  assert.ok(summarize([message()], { ...exit, timedOut: true }).failures.includes('timeout'));
  assert.ok(summarize([message()], { ...exit, code: 1 }).failures.includes('process-error'));
});

test('native input/cache/output fields are disjoint; cumulative updates are not added', () => {
  const result = summarize([{ type: 'message_update', usage }, message('toolUse'), { type: 'turn_end', message: message().message }, message()], exit);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.usage.totals, { input: 1400, cacheRead: 400, cacheWrite: 200, output: 600 });
  assert.equal(result.usage.totalTokens, 2600);
  assert.equal(result.usage.reasoningTokens, 500);
  assert.equal(result.usage.estimatedCost, 0.0469);
  assert.deepEqual(result.providerTiming, []);
});

test('missing and failed usage remains unknown rather than free', () => {
  for (const events of [[message('error')], [message('error', { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: { total: 0 } })], [message('stop', {})], [message(), { type: 'compaction_start' }], [message(), { type: 'entry_appended', entry: { type: 'usage', kind: 'cache_warm', usage } }]]) {
    const result = summarize(events, exit);
    assert.equal(result.usage.totals, null);
    assert.equal(result.usage.reasoningTokens, null);
    assert.equal(result.usage.estimatedCost, null);
  }
  assert.equal(summarize([message('stop', { ...usage, cost: {} })], exit).usage.estimatedCost, null);
  const parsed = parseEvents(`${JSON.stringify(message())}\nnot json\n`);
  assert.deepEqual(parsed.invalidLines, [2]);
  assert.ok(summarize(parsed.events, exit, parsed.invalidLines).failures.includes('invalid-json-events'));
});

test('recovered native transport attempts leave total usage and cost unknown', () => {
  for (const diagnostics of [
    [{ type: 'provider_transport_failure', details: { fallbackTransport: 'sse' } }],
    [{ type: 'provider_request', details: { sseAttempts: 2, websocketAttempts: 0 } }],
    [{ type: 'provider_request', details: { sseAttempts: 1, websocketAttempts: 1 } }],
  ]) {
    const event = message();
    event.message.diagnostics = diagnostics;
    const result = summarize([event], exit);
    assert.deepEqual(result.failures, []);
    assert.equal(result.usage.totals, null);
    assert.equal(result.usage.estimatedCost, null);
    assert.equal(result.usage.reported.output, usage.output);
  }
});

test('task/arm selectors validate and paired order alternates', () => {
  assert.deepEqual(schedule(['a'], ['baseline', 'ponytail'], 2).map(c => c.arm), ['baseline', 'ponytail', 'ponytail', 'baseline']);
  assert.throws(() => options(['--out', '/tmp/new', '--tasks', '../anything']));
  assert.throws(() => options(['--out', '/tmp/new', '--runtime', 'official', '--arms', 'baseline']));
  assert.throws(() => options(['--out', '/tmp/new', '--arms', 'baseline', '--repetitions', '0']));
  assert.throws(() => options(['--out', '/tmp/new', '--arms', 'baseline', '--timeout-ms', '2147483648']));
  assert.ok(!options(['--out', '/tmp/new', '--arms', 'baseline']).tasks.includes('holdout-ranges'));
});

const solutions = {
  'scope-cache': {
    'cache.mjs': `export function memoizeWithTtl(fn, ttlMs, now = Date.now) {
      if (typeof fn !== 'function' || typeof ttlMs !== 'number' || !Number.isFinite(ttlMs) || ttlMs <= 0) throw new TypeError('Invalid cache');
      const entries = new Map();
      return key => {
        const time = now(), entry = entries.get(key);
        if (entry && time < entry.expires) return entry.value;
        const value = fn(key);
        entries.set(key, { value, expires: time + ttlMs });
        return value;
      };
    }`,
    'catalog.mjs': `import { memoizeWithTtl } from './cache.mjs'; export const createCatalog = memoizeWithTtl;`,
  },
  'reuse-money': { 'receipt.mjs': `import { formatMoney } from './currency.mjs'; export const receiptLine = (item, options) => item.name + ': ' + formatMoney(item.priceCents, options);` },
  'shared-default': { 'defaults.mjs': `export const withDefault = (value, fallback) => value ?? fallback;` },
  'holdout-ranges': {
    'ranges.mjs': `export function compactRanges(ranges) {
      if (!Array.isArray(ranges) || ranges.some(r => !Array.isArray(r) || r.length !== 2 || !r.every(Number.isSafeInteger) || r[0] >= r[1])) throw new TypeError('Invalid ranges');
      const merged = [];
      for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
        const last = merged.at(-1);
        if (last && start <= last[1]) last[1] = Math.max(last[1], end);
        else merged.push([start, end]);
      }
      return merged;
    }`,
    'availability.mjs': `import { compactRanges } from './ranges.mjs'; export const totalDuration = ranges => compactRanges(ranges).reduce((n, [a, b]) => n + b - a, 0);`,
  },
};

test('every original Git fixture fails, each complete solution passes, test tampering cannot pass grading', t => {
  const dir = scratch(t);
  for (const task of taskNames) {
    const f = fixture(task, join(dir, task));
    assert.equal(grade(f.workspace, f.checks, join(dir, task, 'before')).passed, false, task);
    writeFileSync(join(f.workspace, 'test.mjs'), "import test from 'node:test'; test('empty substitute', () => {});\n");
    assert.equal(spawnSync(process.execPath, ['--test', 'test.mjs'], { cwd: f.workspace, env: { PATH: process.env.PATH } }).status, 0);
    const tampered = grade(f.workspace, f.checks, join(dir, task, 'tampered'));
    assert.equal(tampered.testsUnchanged, false, task);
    assert.equal(tampered.passed, false, task);
    writeFileSync(join(f.workspace, 'test.mjs'), f.checks['original.test.mjs']);
    for (const [file, content] of Object.entries(solutions[task])) writeFileSync(join(f.workspace, file), content);
    const fixed = grade(f.workspace, f.checks, join(dir, task, 'fixed'));
    assert.equal(fixed.passed, true, `${task}: ${readFileSync(join(dir, task, 'fixed', 'validation.txt'), 'utf8')}`);
    assert.equal(fixed.testsUnchanged, true);
  }
});

test('grading accepts appended coverage but rejects edits, replacement and deletion of supplied tests', t => {
  const dir = scratch(t), f = fixture('shared-default', dir);
  writeFileSync(join(f.workspace, 'defaults.mjs'), solutions['shared-default']['defaults.mjs']);
  const path = join(f.workspace, 'test.mjs'), original = f.checks['original.test.mjs'];
  writeFileSync(path, original + "\ntest('additional nullish coverage', () => assert.equal(withDefault(null, 42), 42));\n");
  const extended = grade(f.workspace, f.checks, join(dir, 'extended'));
  assert.equal(extended.passed, true);
  assert.equal(extended.testsUnchanged, true, 'all supplied test bytes remain unchanged');
  for (const [name, content] of [
    ['edit', original.replace('assert.equal(pageSize({ pageSize: 0 }), 0);', '')],
    ['replacement', "import test from 'node:test'; test('empty substitute', () => {});\n"],
    ['truncation', original.slice(0, -1)],
    ['deletion', null],
  ]) {
    if (content === null) rmSync(path);
    else writeFileSync(path, content);
    assert.equal(grade(f.workspace, f.checks, join(dir, name)).testsUnchanged, false, name);
  }
});

test('grading independently runs originals and rejects a failing appended workspace test', t => {
  const dir = scratch(t), f = fixture('shared-default', dir);
  writeFileSync(join(f.workspace, 'defaults.mjs'), solutions['shared-default']['defaults.mjs']);
  writeFileSync(join(f.workspace, 'test.mjs'), f.checks['original.test.mjs'] + "\ntest('failing added test', () => assert.fail('appended failure'));\n");
  const result = grade(f.workspace, f.checks, join(dir, 'graded'));
  assert.equal(result.passed, false, 'workspace test failure must reject an otherwise correct solution');
  assert.equal(result.exitCode, 0, 'parent-held original checks still pass independently');
  assert.equal(result.workspaceExitCode, 1);
  assert.equal(result.testsUnchanged, true);
});

test('holdout checks reject a solution that only satisfies the public smoke examples', t => {
  const dir = scratch(t), f = fixture('holdout-ranges', dir);
  writeFileSync(join(f.workspace, 'ranges.mjs'), 'export const compactRanges = () => [[1, 5]];');
  writeFileSync(join(f.workspace, 'availability.mjs'), 'export const totalDuration = () => 4;');
  assert.equal(spawnSync(process.execPath, ['--test', 'test.mjs'], { cwd: f.workspace, env: { PATH: process.env.PATH } }).status, 0);
  assert.equal(grade(f.workspace, f.checks, join(dir, 'independent')).passed, false);
});

test('observer retains final serialized instructions and settings without headers or mutation', t => {
  const dir = scratch(t), previous = process.env.PONYTAIL_EVAL_ARTIFACT_DIR;
  process.env.PONYTAIL_EVAL_ARTIFACT_DIR = dir;
  t.after(() => { if (previous === undefined) delete process.env.PONYTAIL_EVAL_ARTIFACT_DIR; else process.env.PONYTAIL_EVAL_ARTIFACT_DIR = previous; });
  let handler;
  observe({ on: (event, fn) => { assert.equal(event, 'before_provider_request'); handler = fn; }, getThinkingLevel: () => 'max', getActiveTools: () => ['read', 'bash'] });
  const payload = { model: 'gpt-6-astra', instructions: 'final serialized prompt', input: [{ role: 'developer', content: 'patch' }], reasoning: { effort: 'max' }, headers: { Authorization: 'must-not-be-recorded' } };
  const before = structuredClone(payload);
  assert.equal(handler({ payload }, { model: { provider: 'openai-codex', id: 'gpt-6-astra', contextWindow: 600000, maxTokens: 30000 } }), undefined);
  assert.deepEqual(payload, before);
  const content = readFileSync(join(dir, 'requests.jsonl'), 'utf8');
  assert.ok(!content.includes('must-not-be-recorded'));
  const record = JSON.parse(content);
  assert.equal(record.request.instructions, payload.instructions);
  assert.equal(record.runtime.contextWindow, 600000);
  assert.equal(record.runtime.compaction, null);
});

test('runner preserves paired artifacts and CLI exit-zero assistant failures (synthetic CLI only)', async t => {
  const dir = scratch(t), cli = join(dir, 'fake-pi');
  writeFileSync(cli, `#!/usr/bin/env node
    const fs = require('node:fs'), path = require('node:path');
    if (process.argv.includes('--version')) { console.log('fixture-cli'); process.exit(0); }
    fs.writeFileSync('defaults.mjs', ${JSON.stringify(solutions['shared-default']['defaults.mjs'])});
    const artifact = process.env.PONYTAIL_EVAL_ARTIFACT_DIR;
    fs.writeFileSync(path.join(artifact, 'requests.jsonl'), JSON.stringify({ runtime: { provider: 'openai-codex', model: 'gpt-6-astra', reasoning: 'max', contextWindow: artifact.includes('wrong-context') ? 128000 : 600000, tools: ['bash', 'edit', 'read', 'write'] }, request: { reasoning: { effort: 'max' } } }) + '\\n');
    console.log(JSON.stringify(${JSON.stringify(message())}));
    if (artifact.includes('error-run')) console.log(JSON.stringify(${JSON.stringify(message('error'))}));
    if (artifact.includes('extension-failure')) console.error('Extension error (fixture): load failed');
    if (artifact.includes('policy-drift')) {
      const entry = process.argv[process.argv.indexOf('-e') + 1];
      fs.appendFileSync(path.join(path.dirname(entry), '..', 'hooks', 'ponytail-core.md'), 'changed policy');
    }
  `, { mode: 0o755 });
  const config = options(['--fork', cli, '--extension', cli, '--out', join(dir, 'paired'), '--tasks', 'shared-default', '--repetitions', '2']);
  const results = await run(config);
  assert.equal(results.length, 4);
  assert.ok(results.every(r => r.complete));
  assert.match(readFileSync(join(results[0].dir, 'final.diff'), 'utf8'), /withDefault/);
  const command = JSON.parse(readFileSync(join(results[0].dir, 'command.json'), 'utf8'));
  assert.equal(command.args.filter(a => a === '-e').length, 1); // Observer, no Ponytail in baseline.
  const failures = await run({ ...config, out: join(dir, 'error-run'), arms: ['baseline'], repetitions: 1 });
  assert.equal(failures[0].checks.passed, true);
  assert.equal(failures[0].exit.code, 0);
  assert.equal(failures[0].complete, false);
  assert.ok(failures[0].failures.includes('assistant-error'));
  const extensionFailure = await run({ ...config, runtime: 'official', official: cli, out: join(dir, 'extension-failure'), arms: ['ponytail'], repetitions: 1 });
  assert.equal(extensionFailure[0].finalStopReason, 'stop');
  assert.equal(extensionFailure[0].complete, false);
  assert.ok(extensionFailure[0].failures.includes('extension-error'));
  const wrongContext = await run({ ...config, out: join(dir, 'wrong-context'), arms: ['baseline'], repetitions: 1 });
  assert.equal(wrongContext[0].complete, false);
  assert.ok(wrongContext[0].failures.includes('runtime-observation-mismatch'));
  const extension = join(dir, 'package', 'pi-extension', 'index.js');
  mkdirSync(join(dir, 'package', 'pi-extension'), { recursive: true });
  mkdirSync(join(dir, 'package', 'hooks'));
  writeFileSync(extension, 'export default function ponytail() {}');
  writeFileSync(join(dir, 'package', 'hooks', 'ponytail-core.md'), 'Original policy');
  const policyDrift = await run({ ...config, extension, out: join(dir, 'policy-drift'), arms: ['ponytail'], repetitions: 1 });
  assert.equal(policyDrift[0].checks.passed, true);
  assert.ok(policyDrift[0].failures.includes('extension-changed'));
  await assert.rejects(run(config), /EEXIST/);
});

test('interrupt stops the child and is never counted as successful completion', async t => {
  const dir = scratch(t);
  const timer = setTimeout(() => process.emit('SIGINT'), 100);
  t.after(() => clearTimeout(timer));
  const result = await execute(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { cwd: dir, dir, env: process.env, timeoutMs: 5000 });
  assert.equal(result.interrupted, 'SIGINT');
  assert.ok(summarize([message()], result).failures.includes('interrupted'));
});

test('deadline terminates the native process group and records failure', async t => {
  const dir = scratch(t);
  const result = await execute(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { cwd: dir, dir, env: process.env, timeoutMs: 100 });
  assert.equal(result.timedOut, true);
  assert.ok(result.wallMs >= 100);
  assert.ok(summarize([], result).failures.includes('timeout'));
});
