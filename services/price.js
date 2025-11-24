// services/price.js — Jupiter Price API (with caching)
const axios = require('axios');
const cache = require('./cache');

const JUPITER_PRICE_URL = process.env.JUPITER_PRICE_URL || "https://price.jup.ag/v4/price";

/**
 * Fetch price for a given mint address from Jupiter.
 */
async function fetchPrice(mint) {
  const url = `${JUPITER_PRICE_URL}?ids=${encodeURIComponent(mint)}`;

  const res = await axios.get(url, { timeout: 7000 });

  if (!res.data) return null;
  
  // Format varies depending on endpoint version
  const data = res.data.data || res.data;

  if (!data[mint]) return null;

  // Typical shape:
  // data[mint] = { price: 174.2, ... }
  const entry = data[mint];

  const price =
    entry.price ??
    entry.usd ??
    entry.unit_price ??
    entry.value ??
    null;

  if (price === null || Number.isNaN(Number(price))) return null;

  return Number(price);
}

/**
 * Main price function with caching
 */
async function getPrice(mint) {
  if (!mint) return null;

  const key = `price:${mint}`;

  // 60-second cache
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  try {
    const p = await fetchPrice(mint);
    if (p !== null) cache.set(key, p, 60);
    return p;
  } catch (err) {
    console.warn("Price error:", err.message);
    return null;
  }
}

module.exports = {
  getPrice,
};
