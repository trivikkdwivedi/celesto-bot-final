const axios = require('axios');
const cache = require('./cache');

const JUPITER_PRICE_URL =
  process.env.JUPITER_PRICE_URL || "https://api.jup.ag/price/v2";

async function fetchPrice(mint) {
  const url = `${JUPITER_PRICE_URL}?ids=${encodeURIComponent(mint)}`;

  const res = await axios.get(url, { timeout: 7000 });

  if (!res.data || !res.data.data) return null;

  const entry = res.data.data[mint];
  if (!entry) return null;

  const price = entry.price;
  if (!price || isNaN(price)) return null;

  return Number(price);
}

async function getPrice(mint) {
  const key = `price:${mint}`;

  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  try {
    const p = await fetchPrice(mint);
    if (p !== null) cache.set(key, p, 30);
    return p;
  } catch (err) {
    console.warn("Price error:", err.message);
    return null;
  }
}

module.exports = { getPrice };