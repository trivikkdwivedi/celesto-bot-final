const axios = require("axios");
const cache = require("./cache");

const BIRDEYE_PRICE_URL = "https://public-api.birdeye.so/defi/price";

/**
 * Fetch price from Birdeye using token mint address
 */
async function fetchPrice(mint) {
  try {
    const url = `${BIRDEYE_PRICE_URL}?address=${mint}`;

    const res = await axios.get(url, {
      headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY },
      timeout: 7000,
    });

    const price = res?.data?.data?.value;

    if (!price || isNaN(price)) return null;

    return Number(price);
  } catch (err) {
    console.log("Birdeye price error:", err.response?.data || err.message);
    return null;
  }
}

/**
 * Cached wrapper (30 sec)
 */
async function getPrice(mint) {
  const key = `price:${mint}`;
  const cached = cache.get(key);

  if (cached !== undefined) return cached;

  const price = await fetchPrice(mint);
  if (price !== null) cache.set(key, price, 30);

  return price;
}

module.exports = { getPrice };