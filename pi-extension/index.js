import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { formatSkillsForPrompt } from "@earendil-works/pi-coding-agent";

const require = createRequire(import.meta.url);
const {
  DEFAULT_MODE,
  RUNTIME_MODES,
  getDefaultMode,
  getQuietStartup,
  getHideStatus,
  normalizeMode,
  normalizePersistedMode,
  isDeactivationCommand,
  writeDefaultMode,
} = require("../hooks/ponytail-config.js");
const { getPonytailInstructions } = require("../hooks/ponytail-instructions.js");
export const readDefaultMode = getDefaultMode;
export const readQuietStartup = getQuietStartup;

const RUNTIME_MODE_LIST = RUNTIME_MODES.join("|");
const PONYTAIL_COMMAND_DESCRIPTION = `Set mode: ${RUNTIME_MODE_LIST}. Commands: status, default <mode>`;
const coreSkillPath = realpathSync(fileURLToPath(new URL("../skills/ponytail/SKILL.md", import.meta.url)));

export function resolveSessionMode(entries, fallbackMode = DEFAULT_MODE) {
  const fallback = fallbackMode === null ? null : normalizePersistedMode(fallbackMode) || DEFAULT_MODE;
  if (!Array.isArray(entries)) return fallback;

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.type !== "custom" || entry?.customType !== "ponytail-mode") continue;

    const mode = normalizePersistedMode(entry?.data?.mode);
    if (mode) return mode;
  }

  return fallback;
}

export function parsePonytailCommand(text, defaultMode = DEFAULT_MODE) {
  const fallback = normalizePersistedMode(defaultMode) || DEFAULT_MODE;
  const normalizedText = String(text || "").trim().toLowerCase();

  if (!normalizedText) {
    return { type: "set-mode", mode: fallback === "off" ? "full" : fallback };
  }

  const [primary, secondary] = normalizedText.split(/\s+/);

  if (primary === "status") return { type: "status" };

  if (primary === "default") {
    // ponytail: a default must be a runtime level; review is session-only (#377).
    const mode = normalizeMode(secondary);
    return mode ? { type: "set-default", mode } : { type: "invalid", reason: "invalid-default-mode" };
  }

  const mode = normalizeMode(primary);
  return mode ? { type: "set-mode", mode } : { type: "invalid", reason: "invalid-mode", mode: primary };
}

export { writeDefaultMode };

export default function ponytailExtension(pi) {
  let currentMode = DEFAULT_MODE;
  let configuredDefaultMode = getDefaultMode();
  let hideStatus = getHideStatus();

  function notify(ctx, message, type = "info") {
    if (ctx.hasUI) ctx.ui.notify(message, type);
  }

  function syncStatus(ctx) {
    if (ctx.hasUI) {
      ctx.ui.setStatus("ponytail", hideStatus || currentMode === "off" ? undefined : `🐴 ponytail: ${currentMode.toUpperCase()}`);
    }
  }

  function setMode(mode, ctx) {
    if (mode !== currentMode) {
      currentMode = mode;
      pi.appendEntry("ponytail-mode", { mode });
    }
    syncStatus(ctx);
    notify(ctx, `Ponytail mode set to ${mode}.`);
  }

  function hydrate(_event, ctx) {
    configuredDefaultMode = getDefaultMode();
    hideStatus = getHideStatus();
    const savedMode = resolveSessionMode(ctx.sessionManager.getBranch(), null);
    currentMode = savedMode ?? configuredDefaultMode;
    if (savedMode === null) pi.appendEntry("ponytail-mode", { mode: currentMode });
    syncStatus(ctx);
  }

  pi.registerCommand("ponytail", {
    description: PONYTAIL_COMMAND_DESCRIPTION,
    handler: async (args, ctx) => {
      const parsed = parsePonytailCommand(args, configuredDefaultMode);

      if (parsed.type === "status") {
        notify(ctx, `Ponytail: current ${currentMode} • default ${configuredDefaultMode}`);
        return;
      }

      if (parsed.type === "set-default") {
        try {
          const written = writeDefaultMode(parsed.mode);
          if (written) {
            configuredDefaultMode = getDefaultMode();
            const message = configuredDefaultMode === written
              ? `Default Ponytail mode set to ${written}.`
              : `Saved default ${written}, but env override keeps default at ${configuredDefaultMode}.`;
            notify(ctx, message);
          }
        } catch (e) {
          notify(ctx, `Failed to save default mode: ${e.message}`, "error");
        }
        return;
      }

      if (parsed.type === "set-mode") {
        setMode(parsed.mode, ctx);
        return;
      }

      notify(ctx, "Unknown or unsupported /ponytail mode.", "warning");
    },
  });

  for (const name of ["ponytail-review", "ponytail-audit", "ponytail-gain", "ponytail-debt", "ponytail-help"]) {
    pi.registerCommand(name, {
      description: `Run /skill:${name}`,
      handler: (args, ctx) => {
        if (!pi.getCommands().some(command => command.source === "skill" && command.name === `skill:${name}`)) {
          notify(ctx, `/${name} is disabled: /skill:${name} is not loaded. Check your Pi skill filters.`, "warning");
          return;
        }
        const busy = !ctx.isIdle();
        pi.sendUserMessage(`/skill:${name}${args ? ` ${args}` : ""}`, {
          expandPromptTemplates: true,
          ...(busy ? { deliverAs: "followUp" } : {}),
        });
        if (busy) notify(ctx, `/${name} queued as follow-up.`);
      },
    });
  }

  pi.on("input", (event, ctx) => {
    if (event.source === "extension" || !isDeactivationCommand(event.text)) return;
    setMode("off", ctx);
    return { action: "handled" };
  });

  pi.on("session_start", (event, ctx) => {
    hydrate(event, ctx);
    if (!getQuietStartup()) notify(ctx, `Ponytail loaded: ${currentMode}`);
  });
  pi.on("session_tree", hydrate);

  pi.on("before_agent_start", event => {
    const options = event.systemPromptOptions;
    if (currentMode === "off") delete options.sections.ponytail;
    else options.sections.ponytail = getPonytailInstructions(currentMode);
    // Pi clones these descriptors per run; explicit skills and discovery stay intact.
    const skill = options.skills.find(skill => skill.name === "ponytail" && realpathSync(skill.filePath) === coreSkillPath);
    if (skill) skill.disableModelInvocation = true;
  });

  pi.on("context_with_system", event => {
    const desired = currentMode === "off" ? undefined : `<ponytail>\n${getPonytailInstructions(currentMode)}\n</ponytail>`;
    const core = pi.getCommands().find(command => command.source === "skill" && command.name === "skill:ponytail" && realpathSync(command.sourceInfo.path) === coreSkillPath);
    const corePrompt = core && formatSkillsForPrompt([{ name: "ponytail", description: core.description, filePath: core.sourceInfo.path }]).trim();
    // Match only our exact native-rendered entry, never rebuild another extension's skills.
    const coreEntry = corePrompt?.slice(corePrompt.indexOf("  <skill>"), corePrompt.lastIndexOf("</available_skills>"));
    let changed = false;
    const messages = event.messages.flatMap((message, index) => {
      if (message.role !== "system") return [message];
      const ponytail = index === 0 ? desired : undefined;
      const skills = message.sections?.skills;
      const filteredSkills = coreEntry && typeof skills === "string" ? skills.replace(coreEntry, "") : skills;
      if (message.sections?.ponytail === ponytail && skills === filteredSkills) return [message];
      changed = true;
      const sections = { ...message.sections };
      if (ponytail) sections.ponytail = ponytail;
      else delete sections.ponytail;
      if (skills !== filteredSkills) sections.skills = filteredSkills;
      // Drop only exhausted Ponytail-only patches; retain every unrelated field and delta.
      if (index > 0 && message.content === "" && Object.keys(sections).length === 0 &&
          Object.keys(message).every(key => ["role", "content", "sections", "timestamp"].includes(key))) return [];
      return [{ ...message, sections }];
    });
    if (desired && messages[0]?.role !== "system") {
      messages.unshift({ role: "system", content: "", sections: { ponytail: desired }, timestamp: 0 });
      changed = true;
    }
    // Only the owned section is projected at the stable head. Native forced prompts still win.
    if (changed) return { messages };
  });
}
