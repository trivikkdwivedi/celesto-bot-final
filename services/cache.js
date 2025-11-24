// services/cache.js
const NodeCache = require("node-cache");

// 30 second default TTL
const cache = new NodeCache({ stdTTL: 30, checkperiod: 60 });

module.exports = cache;