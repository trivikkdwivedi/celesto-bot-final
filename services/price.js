// services/price.js
const axios = require("axios");
const cache = require("./cache");
const tokenService = require("./token");

const JUPITER_PRICE_URL =
  process.env.JUPITER_PRICE_URL || "https://price.jup.ag/v4/price";
const COINGECKO_SIMPLE_URL =
  process.env.COINGECKO_SIMPLE_URL ||
  "https://api.coingecko.com/api/v3/simple/price";

async function fetchPriceFromJupiter(mint) {
  if (!mint) return null;
  const url = `${JUPITER_PRICE_URL}?ids=${encodeURIComponent(mint)}`;
  const res = await axios.get(url, { timeout: 7000 });
  if (!res || !res.data) return null;

  const payload = res.data.data || res.data;
  if (!payload) return null;

  if (payload[mint]) {
    const entry = payload[mint];
    const price =
      entry.price ?? entry.usd ?? entry.unit_price ?? entry.value ?? null;
    if (price === null || Number.isNaN(Number(price))) return null;
    return Number(price);
  }

  if (Array.isArray(payload)) {
    const found = payload.find((p) => p.id === mint || p.address === mint);
    if (found) {
      const price = found.price ?? found.usd ?? found.value ?? null;
      if (price === null || Number.isNaN(Number(price))) return null;
      return Number(price);
    }
  }

  return null;
}

async function fetchPriceFromCoinGeckoById(coingeckoId) {
  if (!coingeckoId) return null;
  try {
    const url = `${COINGECKO_SIMPLE_URL}?ids=${encodeURIComponent(
      coingeckoId
    )}&vs_currencies=usd`;
    const r = await axios.get(url, { timeout: 6000 });
    if (!r || !r.data) return null;
    const obj = r.data[coingeckoId];
    if (!obj || obj.usd === undefined) return null;
    const p = Number(obj.usd);
    if (Number.isNaN(p)) return null;
    return p;
  } catch (err) {
    console.warn("CoinGecko fetch error:", err.message || err);
    return null;
  }
}

async function getPrice(mintOrSymbol, tokenMeta = null) {
  if (!mintOrSymbol) return null;
  const cacheKey = `price:${mintOrSymbol}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    if (mintOrSymbol === "SOL") {
      const cg = await fetchPriceFromCoinGeckoById("solana");
      if (cg !== null) {
        cache.set(cacheKey, cg, 30);
        return cg;
      }
    }

    try {
      const j = await fetchPriceFromJupiter(mintOrSymbol);
      if (j !== null) {
        cache.set(cacheKey, j, 30);
        return j;
      }
    } catch (err) {
      console.warn("Jupiter price fetch error:", err.message || err);
    }

    let meta = tokenMeta;
    if (!meta) {
      meta = await tokenService.getByMint(mintOrSymbol);
    }
    const coingeckoId =
      (meta && meta.extensions && meta.extensions.coingeckoId) || null;

    if (coingeckoId) {
      const cg = await fetchPriceFromCoinGeckoById(coingeckoId);
      if (cg !== null) {
        cache.set(cacheKey, cg, 30);
        return cg;
      }
    }

    return null;
  } catch (err) {
    console.warn("Price error:", err.message || err);
    return null;
  }
}

module.exports = {
  getPrice,
  fetchPriceFromJupiter,
  fetchPriceFromCoinGeckoById,
};