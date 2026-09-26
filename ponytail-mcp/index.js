#!/usr/bin/env node
// Ponytail MCP server: serves the lazy-senior-dev ruleset over stdio as a
// prompt (user-invoked) and a tool (for hosts that pull context via tools).
// It does NOT replace the always-on adapters; it's the clean option for hosts
// whose only injection point is the prompt menu (see #70).
import fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

import { MODES, buildInstructions, resolveMode } from "./instructions.js";

const { version } = JSON.parse(
  await fs.promises.readFile(new URL("../package.json", import.meta.url), "utf8")
);
const server = new McpServer({ name: "ponytail", version });

const modeArgs = z.object({
  mode: z
    .enum(MODES)
    .optional()
    .describe("Ponytail intensity: lite, full, or ultra. Omit for the configured default."),
});

server.registerPrompt(
  "ponytail",
  {
    title: "Ponytail mode",
    description: "Lazy senior dev instructions: YAGNI, stdlib first, the smallest correct change.",
    // Clients may omit `arguments` entirely when every argument is optional.
    argsSchema: modeArgs.default({}),
  },
  ({ mode }) => ({
    messages: [{ role: "user", content: { type: "text", text: buildInstructions(mode) } }],
  }),
);

server.registerTool(
  "ponytail_instructions",
  {
    title: "Ponytail instructions",
    description: "Return the Ponytail ruleset for the given intensity (lite, full, or ultra).",
    inputSchema: modeArgs,
    outputSchema: z.object({ mode: z.string(), instructions: z.string() }),
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  ({ mode }) => {
    const resolvedMode = resolveMode(mode);
    const instructions = buildInstructions(resolvedMode);
    const structuredContent = { mode: resolvedMode, instructions };
    return { content: [{ type: "text", text: instructions }], structuredContent };
  },
);

await server.connect(new StdioServerTransport());
