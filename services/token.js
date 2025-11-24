// services/token.js — Unified token resolver for Solana
const axios = require("axios");

let TOKEN_LIST = null;

// Jupiter token list URL (Solana only)
const TOKEN_LIST_URL = "https://tokens.jup.ag/tokens.json";

/**
 * Load Jupiter token list (cached in memory)
 */
async function loadTokenList() {
  if (TOKEN_LIST) return TOKEN_LIST;

  const res = await axios.get(TOKEN_LIST_URL, { timeout: 10000 });
  TOKEN_LIST = res.data;

  return TOKEN_LIST;
}

/**
 * Detect if string is a Solana mint/CA (base58 & 32 bytes)
 */
function looksLikeMint(str) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);
}

/**
 * Main resolver
 * Supports:
 *  - token symbol (SOL, BONK)
 *  - token name (Solana, Bonk)
 *  - CA/mint address
 */
async function resolve(query) {
  if (!query) return null;

  const q = query.trim().toLowerCase();

  const list = await loadTokenList();

  // 1. Direct mint address
  if (looksLikeMint(query)) {
    const match = list.find(t => t.address.toLowerCase() === q);

    if (match) return match;

    // If mint not in list, return minimal metadata:
    return {
      address: query,
      symbol: query.slice(0, 4).toUpperCase(),
      name: query
    };
  }

  // 2. Symbol match (exact)
  let bySymbol = list.find(t => t.symbol.toLowerCase() === q);
  if (bySymbol) return bySymbol;

  // 3. Name match (exact)
  let byName = list.find(t => t.name.toLowerCase() === q);
  if (byName) return byName;

  // 4. Partial name/symbol match
  let partial = list.find(
    t =>
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q)
  );

  if (partial) return partial;

  // 5. Nothing found
  return null;
}

module.exports = {
  resolve,
};