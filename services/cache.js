// services/cache.js - simple TTL in-memory cache (expandable to Redis later)
const NodeCache = require('node-cache');

// initialize with default TTL = 5 minutes
let cache = new NodeCache({
  stdTTL: 60 * 5,
  checkperiod: 120,
});

/**
 * get(key)
 * Returns cached value or undefined
 */
function get(key) {
  return cache.get(key);
}

/**
 * set(key, value, ttlSec)
 * ttlSec (optional): override default TTL
 */
function set(key, value, ttlSec) {
  return cache.set(key, value, ttlSec);
}

/**
 * del(key)
 * delete a specific key
 */
function del(key) {
  return cache.del(key);
}

module.exports = {
  get,
  set,
  del,
};
