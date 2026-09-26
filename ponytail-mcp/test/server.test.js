import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { test } from "node:test";

import { buildInstructions } from "../instructions.js";

test("stdio server serves the prompt and tool to an MCP client", async (t) => {
  const child = spawn(process.execPath, [new URL("../index.js", import.meta.url).pathname], {
    env: { ...process.env, PONYTAIL_DEFAULT_MODE: "full" },
    stdio: ["pipe", "pipe", "inherit"],
  });
  t.after(() => child.kill());
  const pending = new Map();
  createInterface({ input: child.stdout }).on("line", (line) => {
    const message = JSON.parse(line);
    pending.get(message.id)?.(message);
  });
  let nextId = 0;
  const request = (method, params) => {
    const id = ++nextId;
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    return new Promise((resolve) => pending.set(id, resolve));
  };
  const result = async (method, params) => {
    const response = await request(method, params);
    assert.equal(response.error, undefined, JSON.stringify(response.error));
    return response.result;
  };

  const init = await result("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "ponytail-test", version: "0" },
  });
  assert.equal(init.serverInfo.name, "ponytail");
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

  const { prompts } = await result("prompts/list", {});
  assert.deepEqual(prompts.map((p) => [p.name, p.arguments]), [
    ["ponytail", [{ name: "mode", description: "Ponytail intensity: lite, full, or ultra. Omit for the configured default.", required: false }]],
  ]);
  assert.equal((await result("prompts/get", { name: "ponytail", arguments: { mode: "ultra" } })).messages[0].content.text, buildInstructions("ultra"));
  assert.equal((await result("prompts/get", { name: "ponytail" })).messages[0].content.text, buildInstructions("full"));

  const { tools } = await result("tools/list", {});
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, "ponytail_instructions");
  assert.equal(tools[0].inputSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.deepEqual(tools[0].inputSchema.properties.mode.enum, ["lite", "full", "ultra"]);
  assert.deepEqual(tools[0].outputSchema.required, ["mode", "instructions"]);

  const lite = await result("tools/call", { name: "ponytail_instructions", arguments: { mode: "lite" } });
  assert.deepEqual(lite.structuredContent, { mode: "lite", instructions: buildInstructions("lite") });
  assert.equal(lite.content[0].text, buildInstructions("lite"));
  const omitted = await result("tools/call", { name: "ponytail_instructions" });
  assert.deepEqual(omitted.structuredContent, { mode: "full", instructions: buildInstructions("full") });

  const invalid = await request("tools/call", { name: "ponytail_instructions", arguments: { mode: "off" } });
  assert.ok(invalid.error || invalid.result?.isError, "invalid modes are rejected at the trust boundary");

  child.stdin.end();
  await once(child, "exit");
});
