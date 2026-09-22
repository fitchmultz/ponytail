export function createCatalog(loadProduct, ttlMs, now = Date.now) {
  return id => loadProduct(id);
}
