import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { after, test } from "node:test";

// Select an actual installed host; all session/loader/provider APIs below are public.
const packageRoot = process.env.PI_PACKAGE_DIR || dirname(dirname(fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"))));
const root = fileURLToPath(new URL("../../", import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), "ponytail-native-"));
Object.assign(process.env, { HOME: scratch, USERPROFILE: scratch, XDG_CONFIG_HOME: scratch, PI_CODING_AGENT_DIR: join(scratch, "global"), PI_OFFLINE: "1", PI_PACKAGE_DIR: packageRoot });
after(() => rmSync(scratch, { recursive: true, force: true }));
const sdk = await import(pathToFileURL(join(packageRoot, "dist/index.js")));
const aiPath = [join(packageRoot, "node_modules/@earendil-works/pi-ai/dist/index.js"), join(dirname(packageRoot), "pi-ai/dist/index.js")].find(existsSync);
const ai = await import(pathToFileURL(aiPath));
const { openaiCodexProvider } = await import(pathToFileURL(join(dirname(aiPath), "providers/openai-codex.js")));
const { anthropicProvider } = await import(pathToFileURL(join(dirname(aiPath), "providers/anthropic.js")));
globalThis.fetch = async () => { throw new Error("Network forbidden in Ponytail contract tests"); };
const text = message => typeof message.content === "string" ? message.content : message.content.filter(part => part.type === "text").map(part => part.text).join("\n");
const { getPonytailInstructions } = createRequire(import.meta.url)("../../hooks/ponytail-instructions.js");
const body = mode => `<ponytail>\n${getPonytailInstructions(mode)}\n</ponytail>`;
const done = () => ai.fauxAssistantMessage("DONE");

async function open(t, { extension = true, filtered = false, userSkill = false, defaultMode = "full", sessionFile, forced = false, customSkills = false, tools = ["read", "hold"] } = {}) {
  Object.assign(process.env, { PONYTAIL_DEFAULT_MODE: defaultMode, PONYTAIL_HIDE_STATUS: "0", PONYTAIL_QUIET_STARTUP: "1" });
  const cwd = mkdtempSync(join(scratch, "project-"));
  const agentDir = join(cwd, "agent"), sessionDir = join(cwd, "sessions");
  mkdirSync(agentDir); mkdirSync(sessionDir);
  const skillPath = join(cwd, "SKILL.md");
  if (userSkill) writeFileSync(skillPath, '---\nname: ponytail\ndescription: Independent user skill\n---\nUser guidance.\n');
  const requests = [], errors = [], notices = [], gates = [], starts = [];
  let api;
  const faux = ai.fauxProvider({ provider: "ponytail-test", tokensPerSecond: 1000000, models: [{ id: "fixture", reasoning: true, contextWindow: 600000, maxTokens: 1000 }] });
  // The faux catalog omits extended levels unless the fixture model declares them.
  faux.getModel().thinkingLevelMap = { max: "max" };
  const settings = sdk.SettingsManager.inMemory({
    packages: [{ source: root, extensions: extension ? ["pi-extension/index.js"] : [], skills: ["skills/**", ...(filtered ? ["!skills/ponytail-review/**"] : []), ...(userSkill ? ["!skills/ponytail/**"] : [])] }],
    compaction: { enabled: false, keepRecentTokens: 1 }, retry: { enabled: false }, cacheWarming: "off",
  });
  const factory = async ({ cwd, sessionManager, sessionStartEvent }) => {
    const modelRuntime = await sdk.ModelRuntime.create({ credentials: new ai.InMemoryCredentialStore(), modelsStore: new ai.InMemoryModelsStore(), modelsPath: null, allowModelNetwork: false, refreshOnCreate: false });
    modelRuntime.registerNativeProvider(faux.provider);
    await modelRuntime.refresh({ providers: [faux.provider.id], allowNetwork: false });
    const services = await sdk.createAgentSessionServices({ cwd, agentDir, modelRuntime, settingsManager: settings, resourceLoaderOptions: {
      noPromptTemplates: true, noThemes: true, noContextFiles: true,
      additionalSkillPaths: userSkill ? [skillPath] : [],
      systemPrompt: "USER CUSTOM PROMPT", agentsFilesOverride: () => ({ agentsFiles: [] }),
      extensionFactories: [pi => {
        api = pi;
        pi.on("before_agent_start", event => {
          starts.push(event.type);
          event.systemPromptOptions.sections.companion = "COMPANION";
          if (customSkills) {
            event.systemPromptOptions.skills.find(s => s.name === "ponytail-review").description = "PER-RUN REVIEW METADATA";
            event.systemPromptOptions.skills.find(s => s.name === "ponytail-debt").disableModelInvocation = true;
          }
          if (forced) return { systemPrompt: `${event.systemPrompt}\nFULL TAKEOVER` };
        });
        pi.registerTool({ name: "hold", label: "hold", description: "Test barrier", parameters: ai.Type.Object({ id: ai.Type.Number() }), async execute(_id, args) {
          const gate = gates[args.id];
          gate.entered.resolve(); await gate.release.promise;
          return { content: [{ type: "text", text: "released" }], details: {} };
        } });
        pi.registerCommand("wake", { handler() { pi.sendMessage({ customType: "wake", content: "WAKE", display: false }, { triggerTurn: true }); } });
      }],
    } });
    const result = await sdk.createAgentSessionFromServices({ services, sessionManager, sessionStartEvent, model: faux.getModel(), thinkingLevel: "max", tools });
    assert.deepEqual(result.extensionsResult.errors, []);
    return { ...result, services, diagnostics: services.diagnostics };
  };
  const manager = sessionFile ? sdk.SessionManager.open(sessionFile, sessionDir) : sdk.SessionManager.create(cwd, sessionDir);
  const runtime = await sdk.createAgentSessionRuntime(factory, { cwd, agentDir, sessionManager: manager });
  const bind = session => session.bindExtensions({ uiContext: { notify: (message, type) => notices.push({ message, type }), setStatus() {} }, onError: error => errors.push(error), commandContextActions: {
    newSession: options => runtime.newSession(options), switchSession: (path, options) => runtime.switchSession(path, options), fork: (id, options) => runtime.fork(id, options),
  } });
  runtime.setRebindSession(bind);
  await bind(runtime.session);
  t.after(async () => {
    for (const gate of gates) gate.release.resolve();
    await runtime.dispose();
    assert.deepEqual(errors, []);
    assert.equal(faux.state.callCount, requests.length, "Every provider request needs a scripted response");
  });
  const responses = steps => faux.setResponses(steps.map(response => (context, options, _state, model) => {
    requests.push({ messages: structuredClone(context.messages), options, model });
    return response;
  }));
  return {
    runtime, requests, notices, starts,
    get session() { return runtime.session; },
    get api() { return api; },
    responses,
    mode: mode => runtime.session.prompt(`/ponytail ${mode}`),
    async prompt(message = "TASK") { responses([done()]); await runtime.session.prompt(message); },
    async dispatched(message) {
      responses([done()]);
      const settled = Promise.withResolvers();
      const unsubscribe = runtime.session.subscribe(e => { if (e.type === "agent_settled") settled.resolve(); });
      try { await runtime.session.prompt(message); await settled.promise; } finally { unsubscribe(); }
    },
    gate() { const gate = { entered: Promise.withResolvers(), release: Promise.withResolvers() }; gates.push(gate); return gate; },
    tool: id => ai.fauxAssistantMessage(ai.fauxToolCall("hold", { id }), { stopReason: "toolUse" }),
  };
}

function section(request) {
  assert.ok(request.messages[0]?.toolsAdded?.length, "The native initial tool declaration must lead");
  return ai.getCurrentSystemMessage(request.messages)?.sections?.ponytail;
}

function preserved(request) {
  assert.match(ai.getCurrentSystemPrompt(request.messages), /USER CUSTOM PROMPT/);
  assert.equal(ai.getCurrentSystemMessage(request.messages).sections.companion, "<companion>\nCOMPANION\n</companion>");
  assert.deepEqual(ai.getCurrentTools(request.messages).map(t => t.name).sort(), ["hold", "read"]);
  assert.equal(request.model.id, "fixture");
  assert.equal(request.model.contextWindow, 600000);
  assert.equal(request.options.reasoning, "max");
}

test("native startup receipts preserve Anthropic's serialized anchor through dynamic tools and effort replay", { timeout: 15000 }, async t => {
  const h = await open(t, { tools: ["hold", "late"] });
  const gates = [h.gate(), h.gate(), h.gate()];
  h.responses([...gates.map((_, id) => {
    const response = h.tool(id);
    return { ...response, providerThinkingLevel: ["max", "low", "medium"][id], content: [{ type: "thinking", thinking: `fixture ${id}`, thinkingSignature: `opaque-fixture-${id}` }, ...response.content] };
  }), done()]);
  const running = h.session.prompt("DISCOVER THEN REDEFINE THEN REMOVE");
  const late = description => ({
    name: "late", label: "late", description, parameters: ai.Type.Object({ value: ai.Type.String() }),
    async execute() { return { content: [{ type: "text", text: "late result" }], details: {} }; },
  });
  await gates[0].entered.promise;
  h.api.registerTool(late("First definition"));
  h.api.setActiveTools(["hold", "late"]);
  h.api.setThinkingLevel("low");
  gates[0].release.resolve();
  await gates[1].entered.promise;
  h.api.registerTool(late("Replacement definition"));
  h.api.setThinkingLevel("medium");
  gates[1].release.resolve();
  await gates[2].entered.promise;
  h.api.setActiveTools(["hold"]);
  h.api.setThinkingLevel("max");
  await h.mode("off");
  gates[2].release.resolve();
  await running;

  const branch = h.session.sessionManager.getBranch();
  assert.ok(branch.findIndex(e => e.type === "custom_message" && e.customType === "ponytail-mode-update") <
    branch.findIndex(e => e.type === "message" && e.message.toolsAdded?.length), "The real startup receipt precedes the native declaration");
  assert.deepEqual(h.requests.map(r => ai.getCurrentTools(r.messages).map(tool => tool.name)), [["hold"], ["hold", "late"], ["hold", "late"], ["hold"]]);
  assert.deepEqual(h.requests.map(r => r.options.reasoning), ["max", "low", "medium", "max"]);
  const provider = anthropicProvider();
  const model = provider.getModels().find(m => m.id === "claude-opus-5-5");
  assert.ok(model);
  const payloads = [], betas = [];
  for (const request of h.requests) {
    // Faux transport supplies opaque signed fixtures; replay their native provenance.
    const messages = request.messages.map(message => message.role === "assistant"
      ? { ...message, api: model.api, provider: model.provider, model: model.id }
      : message);
    const result = await provider.streamSimple(model, { messages }, {
      apiKey: "dummy-offline-key", reasoning: request.options.reasoning, cacheRetention: "long",
      async fetch(input, init) {
        const wire = new Request(input, init);
        assert.equal(new URL(wire.url).pathname, "/v1/messages");
        payloads.push(await wire.json());
        betas.push(wire.headers.get("anthropic-beta"));
        const events = [
          { type: "message_start", message: { id: "mock", type: "message", role: "assistant", model: model.id, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } },
          { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 0 } },
          { type: "message_stop" },
        ];
        return new Response(events.map(event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(""), {
          headers: { "content-type": "text/event-stream" },
        });
      },
    }).result();
    assert.equal(result.stopReason, "stop", result.errorMessage);
  }
  assert.equal(payloads.length, 4, "Every request reached final native SDK serialization");
  const blocks = payload => payload.messages.flatMap(message => message.content);
  // Strip only protocol cache markers at message/block boundaries, never opaque tool data.
  const semanticMessages = payload => payload.messages.map(({ content, ...message }) => ({
    ...message, content: content.map(({ cache_control, ...block }) => block),
  }));
  const additions = payloads.map(payload => blocks(payload).filter(block => block.type === "tool_addition"));
  // Pi 1.0 references deferred schemas; 1.1+ defines them inline. Exercise the
  // native dialect actually delivered, without a version-string or source probe.
  const references = additions[1][0]?.tool.type === "tool_reference";
  for (const [index, payload] of payloads.entries()) {
    if (!references) assert.deepEqual(payload.tools, payloads[0].tools, "Initial declarations must not change with late tools");
    assert.deepEqual(payload.system, payloads[0].system, "The leading prompt must remain stable");
    if (index && (!references || index === 1)) {
      // The last effort is for the upcoming assistant; historical efforts are fixed.
      const previous = semanticMessages(payloads[index - 1]).slice(0, -1);
      assert.deepEqual(semanticMessages(payload).slice(0, previous.length), previous, "Old signed input must remain stable");
    }
  }
  assert.deepEqual(payloads[0].tools.map(tool => tool.name), ["hold", "__pi_deferred_placeholder__"]);
  if (references) {
    assert.deepEqual(payloads[1].tools.slice(0, payloads[0].tools.length), payloads[0].tools);
    assert.equal(payloads[1].tools[2].name, "late");
    assert.equal(payloads[1].tools[2].defer_loading, true);
    assert.deepEqual(additions.map(list => list.map(block => block.tool.name)), [[], ["late"], [], []]);
    assert.deepEqual(payloads.slice(2).map(payload => payload.tools.map(tool => tool.name)), [["hold", "late"], ["hold"]]);
    assert.equal(payloads[2].tools[1].description, "Replacement definition");
    assert.deepEqual(betas.map(beta => beta?.split(",").includes("mid-conversation-tool-changes-2026-07-01")), [true, true, false, false]);
    t.diagnostic("Native reference-only transport: deferred append preserves initial declarations; redefinition uses host fallback");
  } else {
    assert.ok(betas.every(beta => beta?.split(",").includes("inline-tools-2026-09-15")));
    assert.deepEqual(additions.map(list => list.map(block => block.tool.definition.description)),
      [[], ["First definition"], ["First definition", "Replacement definition"], ["First definition", "Replacement definition"]]);
    assert.deepEqual(payloads.map(payload => blocks(payload).filter(block => block.type === "tool_removal" && block.tool.name === "late").length), [0, 0, 0, 1]);
  }
  assert.deepEqual(blocks(payloads[3]).filter(block => block.type === "thinking").map(block => block.signature), ["opaque-fixture-0", "opaque-fixture-1", "opaque-fixture-2"]);
  assert.deepEqual(payloads[3].messages.filter(message => message.output_config).map(message => message.output_config.effort), ["max", "low", "medium", "max"]);
  assert.deepEqual(h.requests.map(section), [body("full"), body("full"), body("full"), undefined]);
  assert.deepEqual(h.requests[0].messages[0].toolsAdded.map(tool => tool.name), ["hold"]);
});

test("native unchanged loops retain one policy copy and every previous request message", { timeout: 15000 }, async t => {
  const h = await open(t);
  const one = h.gate(), two = h.gate();
  one.release.resolve(); two.release.resolve();
  h.responses([h.tool(0), h.tool(1), done()]);
  await h.session.prompt("STEADY");
  assert.equal(h.requests.length, 3);
  for (const [index, request] of h.requests.entries()) {
    preserved(request);
    assert.equal(section(request), body("full"));
    assert.equal(request.messages.filter(m => m.sections?.ponytail === body("full")).length, 1);
    if (index) assert.deepEqual(request.messages.slice(0, h.requests[index - 1].messages.length), h.requests[index - 1].messages);
    assert.doesNotMatch(ai.getCurrentSystemPrompt(request.messages), /<name>ponytail<\/name>/);
    assert.match(ai.getCurrentSystemPrompt(request.messages), /<name>ponytail-review<\/name>/);
  }
  const skill = h.session.resourceLoader.getSkills().skills.find(s => s.name === "ponytail");
  assert.equal(skill.disableModelInvocation, false, "shared discovery descriptor is unchanged");
  assert.equal(h.api.getCommands().filter(c => c.name === "skill:ponytail").length, 1);
});

for (const mode of ["lite", "off"]) test(`native ultra to ${mode} preserves request and Codex payload prefixes through the next ordinary turn`, { timeout: 15000 }, async t => {
  const h = await open(t, { defaultMode: "ultra" });
  const one = h.gate(), two = h.gate();
  h.responses([h.tool(0), h.tool(1), done()]);
  const running = h.session.prompt("CHANGE THEN STEADY");
  await one.entered.promise;
  await h.mode(mode);
  one.release.resolve();
  await two.entered.promise;
  two.release.resolve();
  await running;
  await h.prompt("NEXT ORDINARY TURN");
  const selected = mode === "off" ? undefined : body(mode);
  assert.deepEqual(h.requests.map(section), [body("ultra"), selected, selected, selected]);
  h.requests.forEach(preserved);
  for (let index = 1; index < h.requests.length; index++) {
    const previous = h.requests[index - 1].messages;
    assert.deepEqual(h.requests[index].messages.slice(0, previous.length), previous);
  }
  assert.deepEqual(h.requests.map(r => r.messages.filter(m => m.sections?.ponytail !== undefined).length), [1, 2, 2, 2]);
  const provider = openaiCodexProvider();
  const model = provider.getModels().find(m => m.id === "gpt-6-astra");
  assert.ok(model);
  const apiKey = `x.${Buffer.from(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: "local-test" } })).toString("base64url")}.x`;
  let previous;
  for (const request of h.requests) {
    let payload;
    const result = await provider.streamSimple(model, { messages: request.messages }, {
      apiKey, transport: "sse", reasoning: "max",
      onPayload(value) { payload = value; throw new Error("LOCAL_PAYLOAD_CAPTURE"); },
    }).result();
    assert.match(result.errorMessage, /LOCAL_PAYLOAD_CAPTURE/);
    assert.ok(payload);
    if (previous) {
      assert.equal(payload.instructions, previous.instructions);
      assert.deepEqual(payload.tools, previous.tools);
      assert.deepEqual(payload.input.slice(0, previous.input.length), previous.input);
    }
    previous = payload;
  }
});

test("native resumed standalone wakeup hides only packaged core metadata and retains per-run changes", { timeout: 15000 }, async t => {
  const standalone = await open(t, { extension: false, customSkills: true });
  await standalone.prompt("BEFORE EXTENSION");
  assert.match(ai.getCurrentSystemPrompt(standalone.requests[0].messages), /<name>ponytail<\/name>/);
  const h = await open(t, { sessionFile: standalone.session.sessionFile, customSkills: true });
  await h.dispatched("/wake");
  const prompt = ai.getCurrentSystemPrompt(h.requests[0].messages);
  assert.doesNotMatch(prompt, /<name>ponytail<\/name>/);
  assert.match(prompt, /PER-RUN REVIEW METADATA/);
  assert.match(prompt, /<name>ponytail-audit<\/name>/);
  assert.doesNotMatch(prompt, /<name>ponytail-debt<\/name>/);
  assert.equal(section(h.requests[0]), body("full"));
  preserved(h.requests[0]);
  t.diagnostic(`Resumed wakeup before_agent_start calls: ${h.starts.length}`);
});

test("native resumed independent namesake skill remains in wakeup metadata", { timeout: 15000 }, async t => {
  const standalone = await open(t, { extension: false, userSkill: true });
  await standalone.prompt("BEFORE EXTENSION");
  const h = await open(t, { sessionFile: standalone.session.sessionFile, userSkill: true });
  await h.dispatched("/wake");
  assert.match(ai.getCurrentSystemPrompt(h.requests[0].messages), /Independent user skill/);
  assert.equal(section(h.requests[0]), body("full"));
});

test("native resumed opaque saved prompt keeps the policy when the host replaces it", { timeout: 15000 }, async t => {
  const standalone = await open(t, { extension: false });
  await standalone.prompt("BEFORE OPAQUE PROMPT");
  standalone.session.sessionManager.appendMessage({ role: "system", content: "LEGACY OPAQUE PROMPT", timestamp: Date.now() });
  const h = await open(t, { sessionFile: standalone.session.sessionFile });
  await h.prompt("AFTER OPAQUE PROMPT");
  await h.prompt("NEXT TURN");
  for (const request of h.requests) {
    assert.equal(section(request), body("full"));
    preserved(request);
  }
});

test("native independently authored ponytail skill stays discoverable", { timeout: 15000 }, async t => {
  const h = await open(t, { userSkill: true });
  await h.prompt();
  assert.match(ai.getCurrentSystemPrompt(h.requests[0].messages), /Independent user skill/);
  assert.equal(section(h.requests[0]), body("full"));
});

test("native active controls apply next request and alias follows tools without losing arguments", { timeout: 15000 }, async t => {
  const h = await open(t);
  const one = h.gate(), two = h.gate();
  h.responses([h.tool(0), h.tool(1), done(), done()]);
  const running = h.session.prompt("ACTIVE");
  await one.entered.promise;
  await h.mode("off");
  await h.session.prompt("normal mode", { streamingBehavior: "steer" });
  await h.session.steer("STEERING");
  await h.session.prompt('/ponytail-review src/a.ts  --focus "data loss"');
  one.release.resolve();
  await two.entered.promise;
  await h.mode("lite");
  two.release.resolve();
  await running;
  assert.equal(h.starts.length, 1);
  assert.deepEqual(h.requests.map(section), [body("full"), undefined, body("lite"), body("lite")]);
  h.requests.forEach(preserved);
  for (let index = 1; index < h.requests.length; index++) {
    const previous = h.requests[index - 1].messages;
    assert.deepEqual(h.requests[index].messages.slice(0, previous.length), previous);
  }
  assert.ok(h.requests.every(r => !r.messages.some(m => m.role === "user" && text(m) === "normal mode")));
  const aliasInputs = h.requests.map(r => r.messages.filter(m => m.role === "user").map(text).filter(s => s.startsWith('<skill name="ponytail-review"')));
  assert.deepEqual(aliasInputs.slice(0, 3), [[], [], []]);
  assert.equal(aliasInputs[3].length, 1);
  assert.ok(aliasInputs[3][0].endsWith('src/a.ts  --focus "data loss"'));
  assert.match(aliasInputs[3][0], /<\/skill>/);
  await h.prompt("NEXT ORDINARY PROMPT");
  assert.equal(section(h.requests.at(-1)), body("lite"));
});

test("native idle custom-message wakeups receive the selected mode on both hosts", { timeout: 15000 }, async t => {
  const h = await open(t);
  await h.mode("lite");
  await h.dispatched("/wake");
  assert.equal(h.requests.length, 1);
  assert.equal(section(h.requests[0]), body("lite"));
  assert.doesNotMatch(ai.getCurrentSystemPrompt(h.requests[0].messages), /<name>ponytail<\/name>/);
});

test("native tree, fork, clone, new, compaction and file resume retain branch-local state", { timeout: 15000 }, async t => {
  const h = await open(t);
  await h.mode("lite");
  const leaf = h.session.sessionManager.getLeafId();
  await h.prompt("LITE BRANCH");
  const file = h.session.sessionFile;
  await h.mode("ultra"); await h.prompt("ULTRA BRANCH");
  await h.session.navigateTree(leaf, { summarize: false });
  await h.prompt("BACK TO LITE");
  assert.equal(section(h.requests.at(-1)), body("lite"));
  const user = h.session.sessionManager.getBranch().findLast(e => e.type === "message" && e.message.role === "user");
  await h.runtime.fork(user.id);
  await h.prompt("FORKED");
  assert.equal(section(h.requests.at(-1)), body("lite"));
  await h.runtime.fork(h.session.sessionManager.getLeafId(), { position: "at" });
  await h.prompt("CLONED");
  assert.equal(section(h.requests.at(-1)), body("lite"));
  await h.runtime.newSession(); await h.prompt("NEW");
  assert.equal(section(h.requests.at(-1)), body("full"));
  await h.runtime.switchSession(file); await h.prompt("RESUMED");
  assert.equal(section(h.requests.at(-1)), body("lite"));
  h.responses([done(), done()]);
  await h.session.compact();
  await h.prompt("AFTER COMPACTION");
  assert.equal(section(h.requests.at(-1)), body("lite"));
  const reopened = await open(t, { sessionFile: file, defaultMode: "off" });
  await reopened.prompt("AFTER RESTART");
  assert.equal(section(reopened.requests.at(-1)), body("lite"));
});

for (const retain of [false, true]) test(`native active compaction checkpoints mode with retained receipts=${retain}`, { timeout: 15000 }, async t => {
  const h = await open(t, { defaultMode: "ultra" });
  const gate = h.gate();
  let compacted = false;
  h.api.on("context", event => ({
    messages: [{ role: "custom", customType: "companion", content: "COMPANION CONTEXT", display: false, timestamp: 0 }, ...event.messages],
  }));
  h.api.on("turn_end", (event, ctx) => {
    if (compacted || event.message.stopReason !== "toolUse") return;
    compacted = true;
    assert.equal(h.session.isStreaming, true);
    return {
      entries: [{
        type: "compaction", summary: retain ? "Continue the task after its tool result." : "",
        firstKeptEntryId: retain ? ctx.sessionManager.getBranch().find(e => e.type === "custom_message").id : null,
      }],
    };
  });
  h.responses([h.tool(0), done()]);
  const running = h.session.prompt("CHANGE AND COMPACT");
  await gate.entered.promise;
  await h.mode("off");
  gate.release.resolve();
  await running;
  assert.equal(compacted, true);
  assert.deepEqual(h.requests.map(section), [body("ultra"), undefined]);
  h.requests.forEach(preserved);
  const previous = h.requests.at(-1).messages;
  assert.ok(previous.some(m => m.role === "user" && text(m).includes("COMPANION CONTEXT")));
  await h.prompt("NEXT ORDINARY TURN");
  assert.equal(section(h.requests.at(-1)), undefined);
  assert.deepEqual(h.requests.at(-1).messages.slice(0, previous.length), previous);
});

test("native sessions pin an inherited default before the first assistant journal write", { timeout: 15000 }, async t => {
  const h = await open(t);
  const modeEntries = () => h.session.sessionManager.getBranch().filter(e => e.type === "custom" && e.customType === "ponytail-mode");
  assert.deepEqual(modeEntries().map(e => e.data.mode), ["full"]);
  await h.prompt();
  const reopened = await open(t, { sessionFile: h.session.sessionFile, defaultMode: "ultra" });
  await reopened.prompt();
  assert.equal(section(reopened.requests.at(-1)), body("full"));
});

test("native package filters disable aliases locally and standalone stops do not request model work", { timeout: 15000 }, async t => {
  const h = await open(t, { filtered: true });
  assert.ok(!h.api.getCommands().some(c => c.name === "skill:ponytail-review"));
  await h.session.prompt("/ponytail-review target");
  await h.session.waitForIdle();
  assert.equal(h.requests.length, 0);
  assert.match(h.notices.at(-1).message, /disabled|unavailable/i);
  for (const message of ["normal mode", "STOP PONYTAIL!"]) await h.session.prompt(message);
  assert.equal(h.requests.length, 0);
  assert.equal(h.session.sessionManager.getBranch().findLast(e => e.customType === "ponytail-mode").data.mode, "off");
  await h.mode("ultra");
  await h.prompt("add a normal mode toggle");
  assert.equal(section(h.requests.at(-1)), body("ultra"));
});

test("native explicit base skill remains available without changing persistent mode", { timeout: 15000 }, async t => {
  const h = await open(t);
  await h.prompt("/skill:ponytail ultra");
  assert.ok(h.requests[0].messages.some(m => m.role === "user" && text(m).startsWith('<skill name="ponytail"')));
  assert.equal(section(h.requests[0]), body("full"));
  await h.dispatched("/ponytail-audit src/b.ts --focus correctness");
  assert.ok(h.requests.at(-1).messages.some(m => m.role === "user" && text(m).startsWith('<skill name="ponytail-audit"') && text(m).endsWith("src/b.ts --focus correctness")));
  const standalone = await open(t, { extension: false });
  await standalone.prompt("TASK");
  assert.match(ai.getCurrentSystemPrompt(standalone.requests[0].messages), /<name>ponytail<\/name>/);
  assert.equal(section(standalone.requests[0]), undefined);
  await standalone.prompt("/skill:ponytail ultra");
  assert.ok(standalone.requests.at(-1).messages.some(m => m.role === "user" && text(m).startsWith('<skill name="ponytail"')));
});

test("native independent complete-prompt takeover retains its documented precedence", { timeout: 15000 }, async t => {
  const h = await open(t, { forced: true });
  const gate = h.gate();
  h.responses([h.tool(0), done()]);
  const running = h.session.prompt("FORCED");
  await gate.entered.promise; await h.mode("off"); gate.release.resolve(); await running;
  assert.equal(h.requests.length, 2);
  for (const request of h.requests) {
    assert.match(ai.getCurrentSystemPrompt(request.messages), /FULL TAKEOVER/);
    assert.ok(ai.getCurrentSystemPrompt(request.messages).includes(getPonytailInstructions("full")));
    assert.deepEqual(ai.getCurrentTools(request.messages).map(t => t.name).sort(), ["hold", "read"]);
  }
});
