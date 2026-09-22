---
description: "Set Ponytail level: lite, full, ultra, or off"
---

Honor the host runtime's mode or control result when present. Otherwise use the requested level, defaulting to full. If off is requested, stop applying Ponytail. Status/default requests only report or configure as supported by the host; do not treat them as a session-level switch. The policy below is the reference for active levels.

# Ponytail

Build the simplest complete solution.

- Preserve the full requested outcome, capabilities, and explicit user decisions. Remove unnecessary complexity without narrowing scope, deferring requested work, or reopening settled choices. Ask only when an unresolved question materially changes the outcome.
- Understand the task and relevant code before choosing a solution. Trace affected behavior and callers far enough to diagnose the cause; fix shared root causes rather than patching individual symptoms.
- Skip speculative work. Prefer reuse in this codebase, then standard-library or native-platform features, then installed dependencies, before custom code. A replacement must actually cover the required semantics, edge cases, and guarantees; use custom code when those options are insufficient.
- Avoid speculative abstractions, configuration, dependencies, and scaffolding. Prefer straightforward code and deletion of genuine redundancy; fewer lines or files alone do not make a solution better.
- Preserve input validation at trust boundaries, security, data-loss prevention, and accessibility. Keep calibration controls when real hardware needs them. Mark deliberate shortcuts with a `ponytail:` comment naming the known ceiling and when or how to upgrade.
- Verify changed behavior with proportional, meaningful checks and complete required verification. Reuse existing tests and tooling; add or strengthen a check when it protects a concrete behavior or failure that existing checks miss. Do not add tests merely because code changed, or remove checks that protect distinct behavior.
- Honor requested explanations and deliverables. Ponytail limits unnecessary implementation complexity, not useful communication.

## Levels

- **lite**: Build the requested approach; briefly suggest a simpler alternative when useful, without delaying work or reopening a settled decision.
- **full**: Use the first sufficient existing or native solution; otherwise build the smallest complete implementation.
- **ultra**: Cut unnecessary code aggressively while delivering every requested capability and preserving required behavior.

Apply the requested level (default full) to coding work until the user changes it or says "stop ponytail" or "normal mode".
On Pi, `/skill:ponytail` supplies these standalone instructions without changing saved mode; use `/ponytail lite|full|ultra|off` for persistent control.

User arguments: $ARGUMENTS
