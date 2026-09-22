import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { accessSync, constants, cpSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const root = dirname(fileURLToPath(import.meta.url));
export const taskNames = ['scope-cache', 'reuse-money', 'shared-default', 'holdout-ranges'];
const tools = ['bash', 'edit', 'read', 'write'];
const hash = value => createHash('sha256').update(value).digest('hex');
const json = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const text = path => readFileSync(path, 'utf8');
const fingerprint = path => existsSync(path) ? hash(readFileSync(path)) : null;

export function options(argv) {
  const { values } = parseArgs({ args: argv, options: {
    runtime: { type: 'string', default: 'fork' }, fork: { type: 'string', default: 'pi' },
    official: { type: 'string' }, extension: { type: 'string' }, out: { type: 'string' },
    tasks: { type: 'string', default: taskNames.slice(0, 3).join(',') },
    arms: { type: 'string', default: 'baseline,ponytail' },
    repetitions: { type: 'string', default: '3' }, 'timeout-ms': { type: 'string', default: '600000' },
    provider: { type: 'string', default: 'openai-codex' }, mode: { type: 'string', default: 'ultra' },
    help: { type: 'boolean', default: false },
  } });
  if (values.help) return values;
  for (const [key, allowed] of Object.entries({ runtime: ['fork', 'official'], provider: ['openai', 'openai-codex'], mode: ['lite', 'full', 'ultra'] })) {
    if (!allowed.includes(values[key])) throw new Error(`Invalid --${key}`);
  }
  for (const [key, allowed] of [['tasks', taskNames], ['arms', ['baseline', 'ponytail']]]) {
    values[key] = values[key].split(',');
    if (new Set(values[key]).size !== values[key].length || values[key].some(v => !allowed.includes(v))) throw new Error(`Invalid --${key}`);
  }
  for (const key of ['repetitions', 'timeout-ms']) {
    values[key] = Number(values[key]);
    if (!Number.isSafeInteger(values[key]) || values[key] <= 0) throw new Error(`Invalid --${key}`);
  }
  if (values['timeout-ms'] > 2147483647) throw new Error('--timeout-ms exceeds Node’s timer limit');
  if (!values.out || !values[values.runtime]) throw new Error('--out and the selected CLI executable are required');
  if (values.arms.includes('ponytail') && !values.extension) throw new Error('--extension must name the final Ponytail entry file');
  values.out = resolve(values.out);
  if (values.extension) values.extension = realpathSync(values.extension);
  return values;
}

export function schedule(tasks, arms, repetitions) {
  const cells = [];
  for (let repetition = 1; repetition <= repetitions; repetition++) {
    for (const [index, task] of tasks.entries()) {
      const order = (repetition + index) % 2 ? arms : [...arms].reverse();
      for (const arm of order) cells.push({ task, arm, repetition });
    }
  }
  return cells;
}

function git(cwd, args, env = process.env) {
  const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgSign=false', ...args], { cwd, env, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0) throw new Error(`git ${args[0]}: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
}

function revision(path) {
  try {
    return { head: git(path, ['rev-parse', 'HEAD']).trim(), status: git(path, ['status', '--short']), diffSha256: hash(git(path, ['diff', 'HEAD', '--binary'])) };
  } catch { return null; }
}

function extensionFiles(entry) {
  const packageRoot = resolve(dirname(entry), '..');
  const files = ['package.json', 'hooks/ponytail-config.js', 'hooks/ponytail-instructions.js',
    'hooks/ponytail-core.md', 'hooks/ponytail-modes.json', 'skills/ponytail/SKILL.md'];
  return { entry: fingerprint(entry), ...Object.fromEntries(files.map(file => [file, fingerprint(join(packageRoot, file))])) };
}

function configuration() {
  const dir = process.env.PI_CODING_AGENT_DIR || join(homedir(), '.pi', 'agent');
  return Object.fromEntries(['settings.json', 'models.json', 'SYSTEM.md', 'APPEND_SYSTEM.md'].map(name => [name, fingerprint(join(dir, name))]));
}

export function fixture(task, dir) {
  const source = join(root, 'fixtures', task);
  const workspace = join(dir, 'workspace');
  cpSync(join(source, 'workspace'), workspace, { recursive: true });
  git(workspace, ['init', '--quiet', '--template=', '-b', 'fixture']);
  git(workspace, ['add', '.']);
  git(workspace, ['-c', 'user.name=Pi Evaluation', '-c', 'user.email=eval@example.invalid', 'commit', '--quiet', '-m', 'Original fixture']);
  const checks = { 'original.test.mjs': text(join(workspace, 'test.mjs')) };
  if (existsSync(join(source, 'holdout.test.mjs'))) checks['holdout.test.mjs'] = text(join(source, 'holdout.test.mjs'));
  return { workspace, checks, base: git(workspace, ['rev-parse', 'HEAD']).trim(), prompt: text(join(source, 'prompt.md')) };
}

export function grade(workspace, checks, dir) {
  mkdirSync(dir, { recursive: true });
  // Recreate from parent-held originals after Pi exits, outside its working copy.
  const paths = Object.entries(checks).map(([name, content]) => {
    const path = join(dir, name);
    writeFileSync(path, content);
    return path;
  });
  const result = spawnSync(process.execPath, ['--test', ...paths], {
    cwd: dir, env: { PATH: process.env.PATH, FIXTURE_WORKSPACE: workspace }, encoding: 'utf8', timeout: 15000,
  });
  writeFileSync(join(dir, 'validation.txt'), `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  return { passed: result.status === 0, exitCode: result.status, error: result.error?.message ?? null,
    testsUnchanged: fingerprint(join(workspace, 'test.mjs')) === hash(checks['original.test.mjs']) };
}

export function parseEvents(raw) {
  const events = [], invalidLines = [];
  for (const [index, line] of raw.split('\n').entries()) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { invalidLines.push(index + 1); }
  }
  return { events, invalidLines };
}

export function summarize(events, exit, invalidLines = []) {
  const messages = events.filter(e => e?.type === 'message_end' && e.message?.role === 'assistant').map(e => e.message);
  const last = messages.at(-1);
  const errors = messages.filter(m => !['stop', 'toolUse'].includes(m.stopReason));
  const diagnostics = messages.flatMap(m => m.diagnostics ?? []);
  const retried = diagnostics.some(d => d.type === 'provider_transport_failure'
    || (d.type === 'provider_request' && (d.details?.sseAttempts ?? 0) + (d.details?.websocketAttempts ?? 0) > 1));
  const fields = ['input', 'cacheRead', 'cacheWrite', 'output'];
  const valid = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const reported = Object.fromEntries(fields.map(key => [key, messages.reduce((sum, m) => sum + (valid(m.usage?.[key]) ? m.usage[key] : 0), 0)]));
  const unknown = !messages.length || errors.length > 0 || retried || exit.timedOut || exit.code !== 0 || invalidLines.length > 0
    || exit.interrupted || messages.some(m => fields.some(key => !valid(m.usage?.[key])))
    || events.some(e => ['compaction_start', 'auto_compaction_start'].includes(e?.type)
      || (e?.type === 'entry_appended' && e.entry?.type === 'usage'));
  const costKnown = !unknown && messages.every(m => valid(m.usage?.cost?.total));
  const reportedCostEstimate = messages.reduce((sum, m) => sum + (valid(m.usage?.cost?.total) ? m.usage.cost.total : 0), 0);
  const failures = [];
  if (exit.timedOut) failures.push('timeout');
  if (exit.interrupted) failures.push('interrupted');
  if (exit.code !== 0 || exit.error || exit.signal) failures.push('process-error');
  if (invalidLines.length) failures.push('invalid-json-events');
  if (errors.length) failures.push('assistant-error');
  if (last?.stopReason !== 'stop') failures.push('final-assistant-did-not-stop');
  return {
    finalStopReason: last?.stopReason ?? null,
    errors: errors.map(m => ({ stopReason: m.stopReason ?? null, message: m.errorMessage ?? null })),
    failures, turns: messages.length, toolCalls: events.filter(e => e?.type === 'tool_execution_start').length,
    finalText: last?.content?.filter(c => c.type === 'text').map(c => c.text).join('\n') ?? '',
    usage: { reported, totals: unknown ? null : reported, totalTokens: unknown ? null : Object.values(reported).reduce((a, b) => a + b, 0),
      reasoningTokens: !unknown && messages.every(m => valid(m.usage?.reasoning)) && messages.length ? messages.reduce((sum, m) => sum + m.usage.reasoning, 0) : null,
      estimatedCost: costKnown ? reportedCostEstimate : null, reportedCostEstimate,
      caveat: 'Reasoning is included in output, never added again. Native costs are estimates, not billed savings. Reported subtotals can omit failed requests and auxiliary calls; null totals mean unknown, not free.' },
    providerTiming: diagnostics.filter(d => d.type === 'provider_request').map(d => d.details).filter(Boolean),
  };
}

export async function execute(command, args, { cwd, dir, env, timeoutMs }) {
  const stdout = openSync(join(dir, 'events.jsonl'), 'w'), stderr = openSync(join(dir, 'stderr.txt'), 'w');
  const start = performance.now();
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', stdout, stderr] });
  let timedOut = false, interrupted = null;
  const kill = signal => { try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; } };
  let force;
  const terminate = () => { kill('SIGTERM'); force ??= setTimeout(() => kill('SIGKILL'), 2000); };
  const onInterrupt = signal => { interrupted = signal; terminate(); };
  const onInt = () => onInterrupt('SIGINT'), onTerm = () => onInterrupt('SIGTERM');
  process.on('SIGINT', onInt); process.on('SIGTERM', onTerm);
  const timer = setTimeout(() => { timedOut = true; terminate(); }, timeoutMs);
  const exit = await new Promise(done => {
    child.once('error', error => done({ code: null, error: error.message }));
    child.once('close', (code, signal) => done({ code, signal }));
  });
  clearTimeout(timer); clearTimeout(force);
  process.off('SIGINT', onInt); process.off('SIGTERM', onTerm);
  if (timedOut || interrupted) kill('SIGKILL');
  closeSync(stdout); closeSync(stderr);
  return { ...exit, timedOut, interrupted, wallMs: Math.round(performance.now() - start) };
}

function executable(value) {
  for (const candidate of value.includes('/') ? [resolve(value)] : (process.env.PATH ?? '').split(delimiter).map(dir => join(dir, value))) {
    try { accessSync(candidate, constants.X_OK); return realpathSync(candidate); } catch {}
  }
  throw new Error(`CLI executable not found: ${value}`);
}

export async function run(config) {
  if (process.platform === 'win32') throw new Error('This runner requires POSIX process groups (macOS/Linux)');
  const command = executable(config[config.runtime]);
  const version = spawnSync(command, ['--version'], { encoding: 'utf8', timeout: 15000 });
  if (version.status !== 0) throw new Error('Selected Pi CLI --version failed');
  mkdirSync(config.out); // Never overwrite an earlier experiment.
  const planned = schedule(config.tasks, config.arms, config.repetitions);
  const manifest = { createdAt: new Date().toISOString(), config, command, cliVersion: version.stdout.trim(), cliSha256: fingerprint(command),
    runnerRevision: revision(root), runnerSha256: fingerprint(fileURLToPath(import.meta.url)), observerSha256: fingerprint(join(root, 'observe.mjs')),
    extension: config.extension ? { path: config.extension, files: extensionFiles(config.extension), revision: revision(dirname(config.extension)) } : null,
    configuration: configuration(), model: 'gpt-6-astra', reasoning: 'max', tools, planned };
  json(join(config.out, 'manifest.json'), manifest);
  cpSync(join(root, 'observe.mjs'), join(config.out, 'observer.mjs'));
  const results = [];
  for (const cell of planned) {
    const dir = join(config.out, `${String(results.length + 1).padStart(3, '0')}-${cell.task}-${cell.repetition}-${cell.arm}`);
    mkdirSync(dir);
    const result = { ...cell, dir, failures: [] };
    try {
      const f = fixture(cell.task, dir);
      writeFileSync(join(dir, 'prompt.md'), f.prompt);
      json(join(dir, 'fixture.json'), { base: f.base, checks: Object.fromEntries(Object.entries(f.checks).map(([k, v]) => [k, hash(v)])) });
      const precheck = grade(f.workspace, f.checks, join(dir, 'before'));
      if (precheck.passed || precheck.error) throw new Error('Original fixture must fail behavior checks without a harness error');
      const args = ['--offline', '--no-approve', '--no-session', '--no-extensions', '--no-skills', '--no-prompt-templates', '--no-context-files', '--no-themes',
        '--mode', 'json', '-p', '--provider', config.provider, '--model', 'gpt-6-astra', '--thinking', 'max', '--tools', tools.join(',')];
      if (cell.arm === 'ponytail') args.push('-e', config.extension);
      args.push('-e', join(config.out, 'observer.mjs'), '--', f.prompt);
      const beforeConfig = configuration();
      json(join(dir, 'command.json'), { command, args, cwd: f.workspace, configuration: beforeConfig });
      const exit = await execute(command, args, { cwd: f.workspace, dir, timeoutMs: config['timeout-ms'],
        env: { ...process.env, PI_OFFLINE: '1', PI_TELEMETRY: '0', PONYTAIL_DEFAULT_MODE: config.mode, PONYTAIL_EVAL_ARTIFACT_DIR: dir } });
      const parsed = parseEvents(text(join(dir, 'events.jsonl')));
      Object.assign(result, { exit }, summarize(parsed.events, exit, parsed.invalidLines));
      if (/Failed to load extension|Extension error \(/.test(text(join(dir, 'stderr.txt')))) result.failures.push('extension-error');
      const checks = grade(f.workspace, f.checks, join(dir, 'after'));
      result.checks = checks;
      if (!checks.passed || !checks.testsUnchanged) result.failures.push('independent-checks-or-test-integrity');
      const requests = parseEvents(existsSync(join(dir, 'requests.jsonl')) ? text(join(dir, 'requests.jsonl')) : '');
      result.runtime = requests.events[0]?.runtime ?? null;
      if (!requests.events.length || requests.invalidLines.length || requests.events.some(({ runtime, request }) =>
        runtime?.provider !== config.provider || runtime?.model !== 'gpt-6-astra' || runtime?.reasoning !== 'max'
        || runtime?.contextWindow !== 600000 || JSON.stringify(runtime.tools) !== JSON.stringify(tools) || request?.reasoning?.effort !== 'max'
        || JSON.stringify(runtime) !== JSON.stringify(result.runtime))) result.failures.push('runtime-observation-mismatch');
      if (JSON.stringify(beforeConfig) !== JSON.stringify(manifest.configuration) || JSON.stringify(configuration()) !== JSON.stringify(beforeConfig)) result.failures.push('configuration-changed');
      if (config.extension && JSON.stringify(extensionFiles(config.extension)) !== JSON.stringify(manifest.extension.files)) result.failures.push('extension-changed');
      const paired = results.find(r => r.task === cell.task && r.repetition === cell.repetition);
      if (paired && JSON.stringify(paired.runtime) !== JSON.stringify(result.runtime)) result.failures.push('paired-runtime-mismatch');
      writeFileSync(join(dir, 'git-status.txt'), git(f.workspace, ['status', '--short']));
      const index = join(dir, 'diff.index'), env = { ...process.env, GIT_INDEX_FILE: index };
      git(f.workspace, ['read-tree', f.base], env);
      git(f.workspace, ['add', '-A'], env);
      writeFileSync(join(dir, 'final.diff'), git(f.workspace, ['diff', '--cached', '--binary', f.base], env));
      rmSync(index);
    } catch (error) { result.failures.push(`harness-error: ${error.message}`); }
    result.complete = result.failures.length === 0;
    results.push(result);
    json(join(dir, 'result.json'), result);
    json(join(config.out, 'results.json'), results);
    console.log(JSON.stringify({ ...cell, complete: result.complete, failures: result.failures, dir }));
    if (result.exit?.interrupted) break;
  }
  console.log(`Artifacts: ${config.out}`);
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const config = options(process.argv.slice(2));
    if (config.help) console.log('node benchmarks/pi/run.mjs --extension /absolute/ponytail/pi-extension/index.js --out /new/output/directory [--runtime fork|official --fork /path/to/pi --official /path/to/pi --tasks scope-cache,reuse-money,shared-default|holdout-ranges --arms baseline,ponytail --repetitions 3 --timeout-ms 600000 --provider openai-codex|openai --mode lite|full|ultra]');
    else process.exitCode = (await run(config)).every(r => r.complete) ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
