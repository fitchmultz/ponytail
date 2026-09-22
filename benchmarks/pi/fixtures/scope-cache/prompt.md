Complete both parts of the catalog caching feature in this repository. Implement memoizeWithTtl(fn, ttlMs, now = Date.now) in cache.mjs and make createCatalog in catalog.mjs use it for product lookups. Each catalog must have its own cache.

The memoizer is synchronous, accepts one argument and keys by Map identity. Cache successful results including false, 0, empty string, null and undefined. Expiry is absolute from creation; hits never extend it; now >= expiry recomputes. Do not cache exceptions. Reject a non-function fn and a non-number, non-finite or non-positive TTL at construction. Keep both public exports and the catalog's injectable clock. Do not add asynchronous support, timers, size limits or dependencies.

Inspect the existing code, complete both requested parts, and run node --test test.mjs. Preserve the supplied tests. Work only in this repository and leave changes uncommitted.
