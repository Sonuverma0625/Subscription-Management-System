const cache = new Map();
const TTL_MS = 15000;

export async function getCached(key, load) {
  const current = cache.get(key);
  if (current && current.expiresAt > Date.now()) return current.value;
  const value = await load();
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  if (cache.size > 200) {
    for (const [cacheKey, entry] of cache) if (entry.expiresAt <= Date.now()) cache.delete(cacheKey);
  }
  return value;
}
