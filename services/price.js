// services/price.js — Birdeye primary, DexScreener fallback, caching
const axios = require("axios");
const cache = require("./cache");
const tokenService = require("./token");

const BIRDEYE_BASE = process.env.BIRDEYE_BASE_URL || "https://public-api.birdeye.so";
const API_KEY = process.env.BIRDEYE_API_KEY;

async function fetchFromBirdeye(mint) {
  try {
    const url = `${BIRDEYE_BASE}/defi/price?address=${encodeURIComponent(mint)}`;
    const res = await axios.get(url, { headers: { "X-API-KEY": API_KEY, accept: "application/json" }, timeout: 7000 });
    const v = res.data?.data?.value;
    return (v !== undefined && !isNaN(Number(v))) ? Number(v) : null;
  } catch (err) {
    console.warn("Birdeye price fetch error:", err.message);
    return null;
  }
}

async function fetchFromDexScreener(mint) {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`;
    const res = await axios.get(url, { timeout: 7000 });
    const price = res.data?.pairs?.[0]?.priceUsd || res.data?.priceUsd || null;
    return price ? Number(price) : null;
  } catch (err) {
    console.warn("DexScreener price fetch error:", err.message);
    return null;
  }
}

async function getPrice(mintOrSymbol, tokenMeta = null) {
  if (!mintOrSymbol) return null;
  const key = `price:${mintOrSymbol}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  // If provided 'SOL' sentinel
  if (mintOrSymbol === "SOL") {
    const solPrice = await fetchFromBirdeye("So11111111111111111111111111111111111111112").catch(()=>null);
    if (solPrice) { cache.set(key, solPrice, 30); return solPrice; }
  }

  // 1) Try Birdeye
  const b = await fetchFromBirdeye(mintOrSymbol);
  if (b !== null) { cache.set(key, b, 30); return b; }

  // 2) Try DexScreener
  const d = await fetchFromDexScreener(mintOrSymbol);
  if (d !== null) { cache.set(key, d, 30); return d; }

  // 3) Try to resolve token and retry
  if (!tokenMeta) tokenMeta = await tokenService.getByMint(mintOrSymbol);
  const coingeckoId = tokenMeta?.extensions?.coingeckoId || null;
  if (coingeckoId) {
    try {
      const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd`);
      const p = res.data?.[coingeckoId]?.usd;
      if (p) { cache.set(key, Number(p), 30); return Number(p); }
    } catch (err) {
      // ignore
    }
  }

  return null;
}

module.exports = { getPrice, fetchFromBirdeye: fetchFromBirdeye };