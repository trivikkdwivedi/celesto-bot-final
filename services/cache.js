// services/cache.js — tiny in-memory TTL cache
const map = new Map();

function set(key, value, ttlSeconds = 60) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  map.set(key, { value, expiresAt });
}

function get(key) {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return undefined;
  }
  return entry.value;
}

function del(key) { map.delete(key); }
function clear() { map.clear(); }

module.exports = { set, get, del, clear };