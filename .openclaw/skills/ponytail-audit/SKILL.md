---
name: ponytail-audit
description: "Audit a repository for over-engineering. Rank evidence-backed simplifications that preserve required behavior. Report only."
homepage: https://github.com/fitchmultz/ponytail
license: MIT
---

Audit the repository for unnecessary complexity, beyond the current diff.
Map the codebase and investigate likely duplication, dead code, redundant
wrappers, unused configuration, and custom code covered by standard libraries,
native features, or mature OSS worth adopting. Follow relevant callers and
contracts; a small file, single implementation, or single caller is not by
itself a defect.

For each supported finding, give the path and location, evidence, concrete
replacement, and why it preserves the required semantics and edge cases.
Useful tags: `delete`, `stdlib`, `native`, `oss`, `yagni`, `shrink`.

Preserve requested capabilities, settled user decisions, security, data-loss
handling, accessibility, and meaningful required verification. Retain tests
protecting distinct behavior. Do not recommend a cut based on line or dependency
counts alone; adding a useful dependency can simplify the complete solution.

Rank findings by practical simplification benefit and confidence. State coverage
limits and unresolved uncertainty. Include savings estimates only when supported;
do not invent totals. If nothing is supported, say "No supported over-engineering
findings." This is not approval to ship or a correctness/security review; flag
observed concerns outside this scope separately for the appropriate review.

One-shot report; apply no fixes. "stop ponytail-audit" or "normal mode" ends
this audit guidance.
