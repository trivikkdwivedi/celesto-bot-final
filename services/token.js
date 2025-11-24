// services/token.js
const axios = require("axios");

const TOKEN_LIST_URL = "https://tokens.jup.ag/tokens.json";

// Cached token list
let TOKEN_LIST = [];

/**
 * Load Jupiter token list once
 */
async function loadTokenList() {
  if (TOKEN_LIST.length > 0) return TOKEN_LIST;

  try {
    const res = await axios.get(TOKEN_LIST_URL, { timeout: 10000 });
    TOKEN_LIST = res.data || [];
    console.log(`Loaded ${TOKEN_LIST.length} tokens from Jupiter`);
  } catch (err) {
    console.error("Token list load error:", err.message);
  }

  return TOKEN_LIST;
}

/**
 * Resolve user query → token metadata
 * Supports:
 * - Symbol (SOL, USDC, BONK)
 * - Token name (Solana, USD Coin)
 * - Mint address
 * - Contract address (CA)
 */
async function resolve(query) {
  const q = query.trim().toLowerCase();
  const list = await loadTokenList();
  if (!list.length) return null;

  // 1. Direct mint/CA match
  const mintMatch = list.find(t => t.address.toLowerCase() === q);
  if (mintMatch) return mintMatch;

  // 2. Exact symbol match
  const symbolMatch = list.find(
    t => t.symbol?.toLowerCase() === q
  );
  if (symbolMatch) return symbolMatch;

  // 3. Exact name match
  const nameMatch = list.find(
    t => t.name?.toLowerCase() === q
  );
  if (nameMatch) return nameMatch;

  // 4. Partial search
  const partial = list.find(
    t =>
      t.symbol?.toLowerCase().includes(q) ||
      t.name?.toLowerCase().includes(q)
  );
  if (partial) return partial;

  return null;
}

module.exports = { resolve };