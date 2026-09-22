import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { getCurrentSystemMessage } from "@earendil-works/pi-ai";
import { formatSkillsForPrompt } from "@earendil-works/pi-coding-agent";

import ponytailExtension from "../index.js";

const { getPonytailInstructions } = createRequire(import.meta.url)("../../hooks/ponytail-instructions.js");
const aliases = ["review", "audit", "gain", "debt", "help"].map(name => `ponytail-${name}`);
const modeEntry = mode => ({ type: "custom", customType: "ponytail-mode", data: { mode } });
const section = mode => `<ponytail>\n${getPonytailInstructions(mode)}\n</ponytail>`;

function harness(t, entries = []) {
  const dir = mkdtempSync(join(tmpdir(), "ponytail-extension-"));
  const env = { XDG_CONFIG_HOME: dir, PONYTAIL_DEFAULT_MODE: "full", PONYTAIL_HIDE_STATUS: "0", PONYTAIL_QUIET_STARTUP: "0" };
  for (const [key, value] of Object.entries(env)) {
    const prior = process.env[key];
    process.env[key] = value;
    t.after(() => { if (prior === undefined) delete process.env[key]; else process.env[key] = prior; });
  }
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const events = new Map(), commands = new Map();
  const sent = [], notices = [], statuses = [];
  let branch = [...entries];
  const skills = aliases.map(name => ({ name: `skill:${name}`, source: "skill" }));
  const ctx = {
    hasUI: true,
    mode: "rpc",
    isIdle: () => true,
    sessionManager: {
      getBranch: () => branch,
      getEntries: () => { throw new Error("Read the active branch, not the whole journal"); },
    },
    ui: {
      notify: (text, type) => notices.push({ text, type }),
      setStatus: (key, text) => statuses.push({ key, text }),
      get theme() { throw new Error("Mode-only status must not need a terminal theme"); },
    },
  };
  ponytailExtension({
    on: (name, fn) => events.set(name, fn),
    registerCommand: (name, options) => commands.set(name, options),
    appendEntry: (customType, data) => branch.push({ type: "custom", customType, data }),
    sendUserMessage: (text, options) => sent.push({ text, options }),
    getCommands: () => skills,
  });
  return {
    events, commands, sent, notices, statuses, ctx, skills,
    get branch() { return branch; },
    set branch(value) { branch = value; },
    emit: (name, event = {}) => events.get(name)(event, ctx),
    command: args => commands.get("ponytail").handler(args, ctx),
    before() {
      const event = { systemPrompt: "CUSTOM", systemPromptOptions: { sections: { companion: "OTHER" }, skills: [] } };
      const result = events.get("before_agent_start")(event, ctx);
      assert.equal(result, undefined, "must not force a complete prompt");
      return event.systemPromptOptions;
    },
  };
}

test("persistent controls have no skill shadow or busy-state handlers", t => {
  const h = harness(t);
  assert.deepEqual([...h.commands.keys()].sort(), ["ponytail", ...aliases].sort());
  assert.ok(!h.events.has("agent_start") && !h.events.has("agent_end"));
});

test("initial section is unwrapped and only the per-run base-skill descriptor is hidden", async t => {
  const h = harness(t);
  await h.emit("session_start");
  await h.command("ultra");
  const baseSkill = { name: "ponytail", filePath: fileURLToPath(new URL("../../skills/ponytail/SKILL.md", import.meta.url)), disableModelInvocation: false };
  const workflow = { name: "ponytail-review", disableModelInvocation: false };
  const options = { sections: { companion: "OTHER" }, skills: [baseSkill, workflow], selectedTools: ["read"] };
  assert.equal(await h.emit("before_agent_start", { systemPrompt: "CUSTOM", systemPromptOptions: options }), undefined);
  assert.equal(options.sections.ponytail, getPonytailInstructions("ultra"));
  assert.equal(options.sections.companion, "OTHER");
  assert.equal(options.forceSystemPrompt, undefined);
  assert.deepEqual(options.selectedTools, ["read"]);
  assert.equal(options.skills[0].disableModelInvocation, true);
  assert.deepEqual(workflow, { name: "ponytail-review", disableModelInvocation: false });
  await h.command("off");
  await h.emit("before_agent_start", { systemPromptOptions: options });
  assert.equal(options.sections.ponytail, undefined);
  assert.equal(options.skills[0].disableModelInvocation, true);
});

test("request projection changes only the owned section at the stable head", async t => {
  const h = harness(t);
  await h.emit("session_start");
  const messages = [
    { role: "system", content: "CUSTOM", sections: { ponytail: section("full"), companion: "OTHER" }, tools: [], timestamp: 1 },
    { role: "user", content: "TASK", timestamp: 2 },
  ];
  const original = structuredClone(messages);
  assert.equal(await h.emit("context_with_system", { messages }), undefined);
  await h.command("lite");
  const patched = await h.emit("context_with_system", { messages });
  assert.equal(patched.messages.length, messages.length);
  assert.deepEqual(patched.messages[0], { ...messages[0], sections: { ...messages[0].sections, ponytail: section("lite") } });
  assert.equal(patched.messages[1], messages[1]);
  assert.equal(getCurrentSystemMessage(patched.messages).sections.companion, "OTHER");
  assert.equal(await h.emit("context_with_system", { messages: patched.messages }), undefined);
  await h.command("off");
  const removed = await h.emit("context_with_system", { messages: patched.messages });
  assert.deepEqual(removed.messages[0].sections, { companion: "OTHER" });
  assert.equal(getCurrentSystemMessage(removed.messages).sections.ponytail, undefined);
  assert.equal(await h.emit("context_with_system", { messages: removed.messages }), undefined);
  assert.deepEqual(messages, original);
});

test("request projection strips historical owned patches while preserving other sections, tools and fields", async t => {
  const h = harness(t);
  await h.emit("session_start");
  await h.command("lite");
  const messages = [
    { role: "system", content: "CUSTOM", sections: { ponytail: section("full"), companion: "OLD" }, timestamp: 1 },
    { role: "user", content: "TASK", timestamp: 2 },
    { role: "system", content: "", sections: { ponytail: section("ultra") }, timestamp: 3 },
    { role: "system", content: "ADDITIONAL", sections: { ponytail: null, companion: "NEW" }, toolsAdded: [{ name: "other" }], toolsRemoved: [{ name: "read" }], timestamp: 4, extra: "KEPT" },
  ];
  const original = structuredClone(messages);
  const result = await h.emit("context_with_system", { messages });
  assert.equal(result.messages.length, 3);
  assert.equal(result.messages[0].sections.ponytail, section("lite"));
  assert.equal(result.messages[1], messages[1]);
  assert.deepEqual(result.messages[2], { ...messages[3], sections: { companion: "NEW" } });
  assert.equal(getCurrentSystemMessage(result.messages).sections.ponytail, section("lite"));
  assert.equal(getCurrentSystemMessage(result.messages).sections.companion, "NEW");
  assert.deepEqual(messages, original);
  assert.equal(await h.emit("context_with_system", { messages: result.messages }), undefined);
});

test("request metadata filtering removes only the exact packaged entry from native read and bash sections", async t => {
  const h = harness(t);
  await h.emit("session_start");
  const core = { name: "ponytail", description: "OWN & <description>", filePath: fileURLToPath(new URL("../../skills/ponytail/SKILL.md", import.meta.url)) };
  h.skills.push({ name: "skill:ponytail", source: "skill", description: core.description, sourceInfo: { path: core.filePath } });
  const independent = { name: "ponytail", description: "INDEPENDENT", filePath: "/independent/SKILL.md" };
  const other = { name: "other", description: "PER-RUN METADATA", filePath: "/other/SKILL.md" };
  for (const tool of ["read", "bash"]) {
    const render = skills => `<skills>\n${formatSkillsForPrompt(skills, tool).trim()}\n</skills>`;
    const skills = render([core, independent, other]) + "\nOTHER EXTENSION SUFFIX";
    const messages = [{ role: "system", content: "OPAQUE <name>ponytail</name>", sections: { ponytail: section("full"), skills, companion: "OTHER" }, timestamp: 1 }];
    const original = structuredClone(messages);
    const result = await h.emit("context_with_system", { messages });
    assert.deepEqual(result.messages, [{ ...messages[0], sections: { ...messages[0].sections, skills: render([independent, other]) + "\nOTHER EXTENSION SUFFIX" } }]);
    assert.deepEqual(messages, original);
    assert.equal(await h.emit("context_with_system", { messages: result.messages }), undefined);
    const custom = [{ ...messages[0], sections: { skills: "CUSTOM SKILLS" } }];
    assert.equal((await h.emit("context_with_system", { messages: custom })).messages[0].sections.skills, "CUSTOM SKILLS");
  }
});

test("request hook installs policy even without before_agent_start", async t => {
  const h = harness(t, [modeEntry("lite")]);
  await h.emit("session_start");
  const result = await h.emit("context_with_system", { messages: [{ role: "system", content: "CUSTOM", timestamp: 1 }] });
  assert.equal(result.messages.at(-1).sections.ponytail, section("lite"));
});

test("session start pins the inherited default once; tree restores only branch-local mode", async t => {
  const h = harness(t);
  await h.emit("session_start");
  assert.deepEqual(h.branch, [modeEntry("full")]);
  process.env.PONYTAIL_DEFAULT_MODE = "ultra";
  await h.emit("session_start");
  assert.deepEqual(h.branch, [modeEntry("full")]);
  assert.equal(h.before().sections.ponytail, getPonytailInstructions("full"));
  h.branch = [modeEntry("lite")];
  await h.emit("session_tree");
  assert.equal(h.before().sections.ponytail, getPonytailInstructions("lite"));
  assert.deepEqual(h.branch, [modeEntry("lite")]);
  h.branch = [];
  await h.emit("session_tree");
  assert.deepEqual(h.branch, [modeEntry("ultra")]);
});

test("legacy persisted review is retained but cannot be selected as a runtime mode", async t => {
  const h = harness(t, [modeEntry("review")]);
  await h.emit("session_start");
  await h.command("review");
  assert.equal(h.before().sections.ponytail, getPonytailInstructions("review"));
  assert.deepEqual(h.branch, [modeEntry("review")]);
  assert.equal(h.notices.at(-1).type, "warning");
});

test("all workflow aliases preserve exact arguments and request native expansion and queues", async t => {
  const h = harness(t);
  const args = 'src/a.ts  --focus "data loss"\nsecond line  ';
  for (const name of aliases) {
    await h.commands.get(name).handler(args, h.ctx);
    assert.deepEqual(h.sent.at(-1), { text: `/skill:${name} ${args}`, options: { expandPromptTemplates: true } });
  }
  h.ctx.isIdle = () => false;
  await h.commands.get("ponytail-review").handler(args, h.ctx);
  assert.deepEqual(h.sent.at(-1), { text: `/skill:ponytail-review ${args}`, options: { expandPromptTemplates: true, deliverAs: "followUp" } });
});

test("missing or filtered skills are reported locally, never sent as literal slash text", async t => {
  const h = harness(t);
  h.skills.length = 0;
  h.skills.push({ name: "skill:ponytail-review", source: "extension" });
  for (const name of aliases) await h.commands.get(name).handler("target", h.ctx);
  assert.deepEqual(h.sent, []);
  assert.equal(h.notices.length, aliases.length);
  assert.ok(h.notices.every(n => n.type === "warning" && /disabled|unavailable/i.test(n.text)));
});

test("standalone stop phrases are handled locally even when already off; ordinary mentions pass through", async t => {
  const h = harness(t);
  await h.emit("session_start");
  for (const text of ["normal mode", " STOP PONYTAIL! ", "normal mode."]) {
    assert.deepEqual(await h.emit("input", { text, source: "interactive" }), { action: "handled" });
    assert.equal(h.before().sections.ponytail, undefined);
  }
  await h.command("ultra");
  for (const text of ["add a normal mode toggle", "Please document stop ponytail", "normal mode\nthen fix it"]) {
    assert.equal(await h.emit("input", { text, source: "rpc" }), undefined);
  }
  assert.equal(await h.emit("input", { text: "normal mode", source: "extension" }), undefined);
  assert.equal(h.before().sections.ponytail, getPonytailInstructions("ultra"));
  assert.deepEqual(h.sent, []);
});

test("mode-only status works without a theme and clears with undefined for off or hidden", async t => {
  const h = harness(t);
  await h.emit("session_start");
  assert.match(h.statuses.at(-1).text, /full/i);
  await h.command("off");
  assert.deepEqual(h.statuses.at(-1), { key: "ponytail", text: undefined });
  await h.command("ultra");
  process.env.PONYTAIL_HIDE_STATUS = "1";
  await h.emit("session_start");
  assert.deepEqual(h.statuses.at(-1), { key: "ponytail", text: undefined });
  assert.equal(h.before().sections.ponytail, getPonytailInstructions("ultra"));
});

test("config status controls and default commands preserve the selected mode and unrelated fields", async t => {
  const h = harness(t);
  delete process.env.PONYTAIL_HIDE_STATUS;
  delete process.env.PONYTAIL_QUIET_STARTUP;
  delete process.env.PONYTAIL_DEFAULT_MODE;
  const path = join(process.env.XDG_CONFIG_HOME, "ponytail", "config.json");
  mkdirSync(join(process.env.XDG_CONFIG_HOME, "ponytail"));
  const config = { hideStatus: true, quietStartup: true, unrelated: 42 };
  writeFileSync(path, JSON.stringify(config));
  await h.emit("session_start");
  assert.equal(h.statuses.at(-1).text, undefined);
  assert.deepEqual(h.notices, []);
  await h.command("ultra");
  await h.command("default lite");
  assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), { ...config, defaultMode: "lite" });
  assert.equal(h.before().sections.ponytail, getPonytailInstructions("ultra"));
  await h.command("status");
  assert.match(h.notices.at(-1).text, /current ultra.*default lite/);
  const broken = '{"keep": true,';
  writeFileSync(path, broken);
  await h.command("default full");
  assert.equal(readFileSync(path, "utf8"), broken);
  assert.equal(h.notices.at(-1).type, "error");
});

test("headless sessions never access UI; quiet startup suppresses only its toast", async t => {
  const h = harness(t);
  process.env.PONYTAIL_QUIET_STARTUP = "1";
  await h.emit("session_start");
  assert.equal(h.notices.length, 0);
  assert.ok(h.statuses.length > 0);
  h.ctx.hasUI = false;
  h.ctx.ui = new Proxy({}, { get() { throw new Error("Headless UI access"); } });
  await h.emit("session_start");
  await h.command("off");
  await h.command("status");
  await h.emit("input", { text: "normal mode", source: "rpc" });
});
