# Product catalog

A synchronous product lookup adapter with an injectable clock for deterministic caching.
`createCatalog(loadProduct, ttlMs, now)` returns a lookup function. Each instance is independent.

Run checks: `node --test test.mjs`.
