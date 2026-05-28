/**
 * Simple in-memory cache with TTL (time-to-live) support.
 *
 * Used to cache upstream API responses (Pexels, Pixabay, etc.)
 * so that repeated identical queries don't hammer the external APIs.
 */

class CacheEntry {
  constructor(value, ttlMs) {
    this.value = value;
    this.expiresAt = Date.now() + ttlMs;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }
}

const store = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get a cached value by key.
 * @param {string} key
 * @returns {any | undefined}
 */
function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.isExpired()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Set a cached value with optional TTL.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs
 */
function set(key, value, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, new CacheEntry(value, ttlMs));
}

/**
 * Clear the entire cache.
 */
function clear() {
  store.clear();
}

/**
 * Clean up expired entries (lightweight periodic maintenance).
 */
function sweep() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) {
      store.delete(key);
    }
  }
}

// Run sweep every 60 seconds
setInterval(sweep, 60_000);

module.exports = { get, set, clear };
