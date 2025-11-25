// services/price.js — Birdeye Price API
const axios = require("axios");
const cache = require("./cache");

const BASE_URL = process.env.BIRDEYE_BASE_URL || "https://public-api.birdeye.so";
const API_KEY = process.env.BIRDEYE_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing BIRDEYE_API_KEY");
}

async function fetchPrice(mint) {
  try {
    const url = `${BASE_URL}/defi/price?address=${mint}`;

    const res = await axios.get(url, {
      headers: {
        "X-API-KEY": API_KEY,
        accept: "application/json",
      },
      timeout: 7000,
    });

    if (!res.data || !res.data.data) return null;

    const price = res.data.data.value;

    return price && !isNaN(price) ? Number(price) : null;

  } catch (e) {
    console.error("Birdeye price fetch error:", e.message);
    return null;
  }
}

async function getPrice(mint) {
  const key = `price:${mint}`;

  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const price = await fetchPrice(mint);

  if (price !== null) {
    cache.set(key, price, 20); // 20 seconds cache
  }

  return price;
}

module.exports = { getPrice };