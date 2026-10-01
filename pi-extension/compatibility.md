# Pi runtime contract

Ponytail uses the public APIs shared by official Pi 1.0.0 and the maintained 1.0
fork. Pi 1.0.0 is the minimum; the exact eight-package 1.0.0 cohort and host
TypeBox 1.3.27 provide development qualification. It does not change model selection, reasoning effort, context size, tools,
permissions, provider transport, or compaction policy.

`/ponytail [off|lite|full|ultra]` controls persistent session mode. With no argument,
it activates the configured default, or full when that default is off.
`/ponytail status` reports the selected session mode and default.
`/ponytail default <mode>` changes the default for new sessions. Invalid existing
configuration is reported without replacing its contents.

Mode is restored from the active branch on session start and tree navigation.
An unmarked branch records its inherited default once. An old session's earlier
unstored default cannot be recovered; the default at first load is recorded.
Pi controls journal durability, including when the session file is first created.
Existing persisted review mode remains readable; `/ponytail review` is not a
runtime control.

The extension owns one named `ponytail` prompt section. Mode changes append hidden
session messages without waking the model. Each request projects those messages
as native section updates, including a removal when switching off. Earlier
request messages stay unchanged through mode changes, tool-loop continuations,
and the next ordinary turn. Redundant updates are omitted from model context.
Mode changes during work apply at the next provider request without interrupting
the task or making an extra request. Earlier journal entries are never rewritten.

Compaction establishes a fixed mode checkpoint from that branch's state at the
boundary. Retained older mode messages cannot override it; subsequent changes
still apply in order. Summary-free rollover uses the same public compaction
boundary with no retained entries; no retired fork context-window API is needed.
Native Pi owns full prompt replacement. Former fork-only `nativeHead` and `replace`
fields are not used as runtime contracts. Cache reuse remains provider-dependent:
compaction, summary-free rollover, and complete prompt replacements can change the
shared prefix. Hydration reads the branch once; requests reconcile only appended
entries, and a new compaction freezes its boundary mode and superseded receipts
once. No independent state journal or lossy history cap is added.
Standalone `stop ponytail` and `normal mode` are handled locally; ordinary
mentions of those phrases pass through.

## Prompt ownership and skills

Other named sections and custom prompt prefixes are preserved. An independent
extension returning a whole `systemPrompt` or setting `forceSystemPrompt` owns the
complete prompt and takes precedence over section patches. Such extensions must
cooperate through native named sections for Ponytail's active controls to apply.
The status indicator reports selected mode, not a claim that a full-prompt owner
has included it. Ponytail does not rewrite provider payloads to defeat that owner.

The packaged base skill remains available as `/skill:ponytail`, including when
the extension is disabled. With the extension loaded, the cloned per-run
base-skill descriptor is hidden from automatic model invocation. Official Pi can
skip that hook for custom-message wakeups, so the request hook also removes the
packaged skill's exact native-formatted discovery entry from named skills
sections. Ownership uses the canonical file path, not just the skill name.
Independent same-name skills and other extensions' metadata edits are preserved;
opaque custom prompts are not parsed or regenerated. Explicit skill use does
not change persistent mode; use `/ponytail` for that. No duplicate
`skill:ponytail` extension command is registered.

Workflow aliases forward arguments to native skill expansion and use Pi's
follow-up queue during work. A filtered or absent target reports that the alias
is disabled locally; it neither sends literal slash text nor bypasses filters.
`quietStartup` suppresses the startup notification, and `hideStatus` suppresses
the mode-only status indicator. Off clears the indicator.

## Verification

After installing the root development dependencies, run
`env -u PI_PACKAGE_DIR npm test --prefix pi-extension` to select the official
root SDK rather than an inherited host override. The native tests use Pi's
resource loader, session runtime, package filters, and deterministic faux
provider. Codex prefix checks capture the real adapter's request payload and stop
before networking. They make no live model calls.
To exercise another installed host, such as the fork, with the same contract
suite, point `PI_PACKAGE_DIR` at its installed package:

```sh
PI_PACKAGE_DIR="$(realpath "$(npm root -g)/@earendil-works/pi-coding-agent")" \
  node --test pi-extension/test/native.test.js
```

CI qualifies every PR on the official release in `devDependencies` and on the
maintained fork's current `main`: the contract suite (`npm run check:compat`),
a fresh Git install, and the real Pi CLI loading the package. The fork checkout's
exact commit is used for both packaging and qualification evidence; no stale
fork revision is pinned in the workflow. The retained-entry and retain-none
compaction cases both verify mode changes at the next public request boundary.

The shared `fitchmultz/.github` fleet's daily canary repeats qualification against
the latest official release and the maintained fork.
