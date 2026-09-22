---
name: ponytail-review
description: "Review a diff for over-engineering. Finds what to delete: reinvented stdlib, needless deps, speculative abstractions. One line per finding."
homepage: https://github.com/fitchmultz/ponytail
license: MIT
---

Review diffs for unnecessary complexity. One line per finding: location, what
to cut, what replaces it. Every suggested cut must preserve the requested
behavior and necessary verification.

## Format

`L<line>: <tag> <what>. <replacement>.`, or `<file>:L<line>: ...` for
multi-file diffs.

Tags:

- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

## Scoring

End with the only metric that matters: `net: -<N> lines possible.`

If there is nothing to cut, say `Lean already. Ship.` and stop.

## Boundaries

Scope: over-engineering and complexity only. Correctness bugs, security holes,
and performance are explicitly out of scope. Route them to a normal review
pass, not this one. Preserve tests that protect distinct behavior; flag
redundant checks only when the same claim remains meaningfully verified.
Does not apply the fixes, only lists them.
"stop ponytail-review" or "normal mode": revert to verbose review style.
