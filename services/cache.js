// services/cache.js — Simple in-memory cache wrapper
const NodeCache = require("node-cache");

// Standard TTL: disabled (we set TTL manually per key)
const cache = new NodeCache({ stdTTL: 0, checkperiod: 120 });

module.exports = {
  get: (key) => cache.get(key),

  set: (key, value, ttl = 60) => cache.set(key, value, ttl),

  del: (key) => cache.del(key),

  flush: () => cache.flushAll(),
};