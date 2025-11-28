// services/price.js — Birdeye price fetcher (stable & cached)
const axios = require("axios");
const cache = require("./cache");

const BIRDEYE_PRICE_URL =
  "https://public-api.birdeye.so/defi/price?address=";

/**
 * Fetch price from Birdeye
 */
async function fetchPrice(mint) {
  try {
    const url = `${BIRDEYE_PRICE_URL}${mint}`;

    const res = await axios.get(url, {
      headers: {
        "X-API-KEY": process.env.BIRDEYE_API_KEY,
      },
      timeout: 7000,
    });

    const data = res.data?.data;
    if (!data || !data.value) return null;

    const price = Number(data.value);
    if (isNaN(price)) return null;

    return price;
  } catch (err) {
    console.error("Birdeye price fetch error:", err.message);
    return null;
  }
}

/**
 * Cached price getter
 */
async function getPrice(mint) {
  if (!mint) return null;

  const key = `price:${mint}`;

  // 30 sec cache
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const price = await fetchPrice(mint);

  if (price !== null) cache.set(key, price, 30);

  return price;
}

module.exports = {
  getPrice,
  fetchPrice,
};