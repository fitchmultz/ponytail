---
description: "Review a diff for over-engineering with evidence-backed, behavior-preserving simplifications. Report only."
---

Review the current diff or requested target for unnecessary complexity. Report
findings without applying fixes.

For each finding, give the location, evidence that the complexity is unnecessary,
and a concrete simpler replacement. Trace relevant callers and contracts before
claiming code is unused or a standard-library/native feature is equivalent.
One implementation or caller is a clue, not proof that an abstraction is wasteful.

Use these tags where helpful:

- `delete:` dead code or unused flexibility; no replacement needed.
- `stdlib:` existing standard-library function covers the required behavior.
- `native:` platform feature covers the required behavior.
- `yagni:` speculative abstraction, configuration, or feature.
- `shrink:` simpler expression of the same behavior.

Every proposed cut must preserve requested scope, user decisions, behavior,
edge cases, security, data-loss handling, accessibility, and meaningful required
verification. Keep checks protecting distinct behavior. Explain any uncertainty
instead of inventing a finding or a savings estimate.

Rank by practical simplification benefit and confidence. Line/dependency savings
are optional estimates, not the goal. If there are no supported findings, say
"No supported over-engineering findings." This is not approval to ship or a
correctness/security review; report any observed concerns outside this scope
separately for the appropriate review.

One-shot. "stop ponytail-review" or "normal mode" ends this review guidance.

User arguments: $ARGUMENTS
