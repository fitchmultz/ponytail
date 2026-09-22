Bug report: pageSize({pageSize: 0}) returns 25 instead of 0. Fix the shared cause so all callers preserve explicitly supplied false, 0 and empty string; only null or undefined should select a fallback. Inspect the shared helper and its callers, preserve exports and existing non-nullish behavior, and complete the fix for the entire shared contract rather than just pageSize.

Run node --test test.mjs. Preserve the supplied tests. Do not add dependencies or new configuration. Work only in this repository and leave changes uncommitted.
