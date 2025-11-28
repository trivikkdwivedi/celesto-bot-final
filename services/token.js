// services/token.js
//
// Token resolver for:
// - mint address (CA)
// - token symbol
// - token name
//
// Uses Jupiter token-list + Birdeye as fallback.
// Caches results via NodeCache.
// ---------------------------------------------------------

const axios = require("axios");
const cache = require("./cache");

const TOKENLIST_URL = "https://tokens.jup.ag/tokens";

// fetch & cache full token list (24h)
async function loadTokenList() {
  const cached = cache.get("tokenlist");
  if (cached) return cached;

  try {
    const res = await axios.get(TOKENLIST_URL, { timeout: 10000 });
    if (!Array.isArray(res.data)) throw new Error("Bad tokenlist format");

    cache.set("tokenlist", res.data, 86400); // 24h cache
    return res.data;
  } catch (err) {
    console.error("Token list load error:", err.message);
    return [];
  }
}

// main resolver
async function resolve(query) {
  if (!query) return null;

  const q = String(query).trim();

  // 1. Direct mint address (all Solana mints are 32–44 chars)
  if (q.length >= 32 && q.length <= 50) {
    const list = await loadTokenList();
    const found = list.find(t => t.address === q);
    if (found) return found;

    // fallback pseudo-token (mint but not in list)
    return {
      address: q,
      symbol: q.slice(0, 4).toUpperCase(),
      name: "Unknown Token",
      decimals: 9,
    };
  }

  // 2. Symbol or Name search
  const list = await loadTokenList();
  const lower = q.toLowerCase();

  // exact symbol match first
  let found =
    list.find(t => t.symbol?.toLowerCase() === lower) ||
    list.find(t => t.name?.toLowerCase() === lower);

  if (!found) {
    // partial match fallback
    found =
      list.find(t => t.symbol?.toLowerCase().startsWith(lower)) ||
      list.find(t => t.name?.toLowerCase().startsWith(lower));
  }

  if (found) return found;

  // nothing found
  return null;
}

// get metadata by mint
async function getByMint(mint) {
  return resolve(mint);
}

module.exports = {
  resolve,
  getByMint,
  loadTokenList,
};