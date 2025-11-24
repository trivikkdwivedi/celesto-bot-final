// services/price.js — Jupiter v6 Price API
const axios = require("axios");
const cache = require("./cache");

const JUPITER_PRICE_URL =
  process.env.JUPITER_PRICE_URL || "https://price.jup.ag/v6/price";

/**
 * Fetch price from Jupiter for a given mint.
 */
async function fetchPrice(mint) {
  try {
    const url = `${JUPITER_PRICE_URL}?ids=${encodeURIComponent(mint)}`;

    const res = await axios.get(url, { timeout: 7000 });

    if (!res.data || !res.data.data) return null;

    const entry = res.data.data[mint];
    if (!entry || !entry.price) return null;

    return Number(entry.price);
  } catch (err) {
    console.warn("Jupiter price fetch error:", err.message);
    return null;
  }
}

/**
 * Main getter with 30-second cache
 */
async function getPrice(mint) {
  if (!mint) return null;

  const key = `price:${mint}`;

  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const p = await fetchPrice(mint);
  if (p !== null) cache.set(key, p, 30);

  return p;
}

module.exports = { getPrice };