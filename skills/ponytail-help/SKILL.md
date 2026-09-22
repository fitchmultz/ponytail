---
name: ponytail-help
description: >
  Show Ponytail's modes, workflows, and host-specific controls when asked for
  help or a command reference. One-shot display; changes no mode or files.
license: MIT
---

# Ponytail Help

Display the relevant reference below without changing modes, files, or settings.

## Levels

- `/ponytail lite`: deliver the requested approach; suggest simpler alternatives when useful.
- `/ponytail full`: prefer sufficient existing or native solutions, then the smallest complete implementation.
- `/ponytail ultra`: cut unnecessary code aggressively while preserving every requested capability.
- `/ponytail off`: disable the runtime policy. "stop ponytail" or "normal mode" also deactivates it in hosts with natural-language controls.

Use an explicit level to activate consistently across hosts. Bare `/ponytail`
activates the configured default on Pi (full when the default is off), reports
the current mode in Hermes and lifecycle-hook hosts, and selects the configured
default in OpenCode. Session persistence follows the host; Pi saves mode per
session branch and restores it on resume.

On Pi, `/ponytail status` shows current/default modes and
`/ponytail default lite|full|ultra|off` changes the default for new sessions.
Lifecycle-hook hosts also support `/ponytail default <mode>`.

## Standalone skill and workflows

The standalone Ponytail skill supplies coding guidance with an optional
lite/full/ultra argument. On Pi, `/skill:ponytail` does **not** change persistent
mode; `/ponytail` is the persistent control. The skill remains usable without
the extension. Always-on repository rules are independent of runtime mode;
turning the extension off does not remove those rules.

- `/ponytail-review [target]`: evidence-backed over-engineering review of a diff or target.
- `/ponytail-audit [target]`: repository-wide over-engineering audit.
- `/ponytail-debt`: ledger of deliberate `ponytail:` shortcuts.
- `/ponytail-gain`: historical benchmark scoreboard and its limits.
- `/ponytail-help`: this reference.

Pi aliases invoke the corresponding enabled `/skill:ponytail-*` skills.
Other hosts expose installed skills or command files using their own syntax;
Codex uses `@ponytail` and `@ponytail-review`, for example. Do not promise an
alias for a disabled or unavailable skill.

## Defaults and updates

Runtime adapters default to full. Set `PONYTAIL_DEFAULT_MODE` to
`off`, `lite`, `full`, or `ultra`, or put `{"defaultMode":"lite"}` in
`$XDG_CONFIG_HOME/ponytail/config.json` (when set), otherwise
`~/.config/ponytail/config.json`, or `%APPDATA%\ponytail\config.json` on Windows.
Resolution: environment variable, then config file, then full. Standalone
skills and static rules do not read runtime configuration.

Update through the host's package/plugin manager. On Pi:

```bash
pi install git:github.com/fitchmultz/ponytail
pi update git:github.com/fitchmultz/ponytail
```

Pinned refs stay pinned; install `git:github.com/fitchmultz/ponytail@<ref>` to
select a different revision. Reload or restart as required by the host.

Fork: https://github.com/fitchmultz/ponytail
Upstream docs/examples: https://github.com/DietrichGebert/ponytail
