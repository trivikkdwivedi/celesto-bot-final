// services/token.js — resolve symbol/name/mint using Birdeye search (with SOL special-case)
const axios = require("axios");
const cache = require("./cache");

const BASE = process.env.BIRDEYE_BASE_URL || "https://public-api.birdeye.so";
const API_KEY = process.env.BIRDEYE_API_KEY;
const CACHE_KEY = "tokenlist_search_cache";
const CACHE_TTL = 60 * 10;

function looksLikePubkey(s) {
  if (!s || typeof s !== "string") return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,60}$/.test(s);
}

async function resolve(query) {
  if (!query) return null;
  const q = query.trim();
  const upper = q.toUpperCase();

  if (upper === "SOL" || upper === "SOLANA") {
    return { address: "So11111111111111111111111111111111111111112", symbol: "SOL", name: "Solana" };
  }

  if (looksLikePubkey(q)) return { address: q, symbol: null, name: null };

  // Cached search hits
  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE}/search?keyword=${encodeURIComponent(q)}`;
    const res = await axios.get(url, { headers: { "X-API-KEY": API_KEY, accept: "application/json" }, timeout: 8000 });
    const token = res.data?.data?.tokens?.[0] || null;
    if (!token) { cache.set(cacheKey, null, 30); return null; }
    const out = { address: token.address, symbol: token.symbol, name: token.name, decimals: token.decimals, extensions: token.extensions || {} };
    cache.set(cacheKey, out, CACHE_TTL);
    return out;
  } catch (err) {
    console.warn("Token resolve error:", err.message);
    cache.set(cacheKey, null, 30);
    return null;
  }
}

async function getByMint(mint) {
  if (!mint) return null;
  // try search by exact address
  try {
    const url = `${BASE}/defi/token_metadata?address=${encodeURIComponent(mint)}`;
    const res = await axios.get(url, { headers: { "X-API-KEY": API_KEY, accept: "application/json" }, timeout: 8000 });
    const t = res.data?.data || null;
    if (!t) return null;
    return { address: t.address, symbol: t.symbol, name: t.name, decimals: t.decimals, extensions: t.extensions || {} };
  } catch (err) {
    return null;
  }
}

module.exports = { resolve, getByMint };