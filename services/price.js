// services/price.js
//
// Price engine with:
// - Birdeye primary
// - Jupiter fallback
// - 30s caching
// -----------------------------------------

const axios = require("axios");
const cache = require("./cache");

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || "";
const BIRDEYE_BASE = "https://public-api.birdeye.so/defi/price?address=";

const JUP_URL = "https://price.jup.ag/v4/price?ids=";

// Birdeye request
async function getBirdeyePrice(mint) {
  try {
    const url = BIRDEYE_BASE + mint;
    const res = await axios.get(url, {
      timeout: 8000,
      headers: {
        "X-API-KEY": BIRDEYE_API_KEY,
        accept: "application/json",
      },
    });

    const p = res.data?.data?.value || res.data?.data?.price;
    if (!p || Number.isNaN(Number(p))) return null;

    return Number(p);
  } catch (e) {
    console.warn("Birdeye price error:", e.message);
    return null;
  }
}

// Jupiter fallback
async function getJupiterPrice(mint) {
  try {
    const url = JUP_URL + encodeURIComponent(mint);
    const res = await axios.get(url, { timeout: 7000 });

    const entry = res.data?.data?.[mint];
    if (!entry) return null;

    const price =
      entry.price ??
      entry.usd ??
      entry.unit_price ??
      entry.value ??
      null;

    if (!price || Number.isNaN(Number(price))) return null;

    return Number(price);
  } catch (e) {
    console.warn("Jupiter price error:", e.message);
    return null;
  }
}

// main entry
async function getPrice(mint) {
  if (!mint) return null;

  const key = "price:" + mint;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  // 1) Birdeye first
  const b = await getBirdeyePrice(mint);
  if (b !== null) {
    cache.set(key, b, 30);
    return b;
  }

  // 2) fallback Jupiter
  const j = await getJupiterPrice(mint);
  if (j !== null) {
    cache.set(key, j, 30);
    return j;
  }

  return null;
}

module.exports = { getPrice };