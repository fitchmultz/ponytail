# Pi runtime contract

Ponytail uses the native APIs shared by official Pi 0.87.0 and the supported Pi
fork. It does not change model selection, reasoning effort, context size, tools,
permissions, provider transport, or compaction policy.

`/ponytail [off|lite|full|ultra]` controls persistent session mode. With no argument,
it activates the configured default, or full when that default is off.
`/ponytail status` reports the selected session mode and default.
`/ponytail default <mode>` changes the default for new sessions. Invalid existing
configuration is reported without replacing its contents.

Mode is restored from the active branch on session start and tree navigation.
An unmarked branch records its inherited default once. An old session's earlier
unstored default cannot be recovered; the default at first load is recorded.
Pi controls journal durability, including its deferred first-assistant write.
Existing persisted review mode remains readable; `/ponytail review` is not a
runtime control.

The extension adds one named `ponytail` prompt section. Each request projects
only that section onto the first system message and removes historical Ponytail
section patches. Mode changes during work apply at the next provider request
without interrupting the task or making an extra request. A mode change
invalidates the prefix once; subsequent unchanged requests keep their complete
previous message prefix, including across the next ordinary turn. The projection
does not rewrite the session journal.
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
provider. They make no live model calls.
To exercise another installed host with the same contract suite:

```sh
PI_PACKAGE_DIR=/path/to/@earendil-works/pi-coding-agent \
  node --test pi-extension/test/native.test.js
```
