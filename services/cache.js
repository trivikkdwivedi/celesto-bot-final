const NodeCache = require("node-cache");

// 60s default TTL
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

module.exports = cache;