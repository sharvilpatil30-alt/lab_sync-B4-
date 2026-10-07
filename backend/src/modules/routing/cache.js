const routeCache = new Map();

export function createCacheKey(start, end, algorithm) {
  return `${algorithm}:${start}:${end}`;
}

export function getCachedRoute(start, end, algorithm) {
  const key = createCacheKey(start, end, algorithm);
  return routeCache.get(key);
}

export function setCachedRoute(start, end, algorithm, result) {
  const key = createCacheKey(start, end, algorithm);
  routeCache.set(key, result);
}

export function clearRouteCache() {
  routeCache.clear();
}

export function getCacheSize() {
  return routeCache.size;
}