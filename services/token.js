// services/token.js — Universal Solana Token Resolver
const axios = require("axios");

let TOKEN_LIST = [];
const TOKEN_LIST_URL = "https://tokens.jup.ag/tokens.json";

// Correct SOL mint (wrapped SOL)
const SOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Load token list from Jupiter (cached)
 */
async function loadTokenList() {
  try {
    const res = await axios.get(TOKEN_LIST_URL, { timeout: 8000 });
    TOKEN_LIST = res.data || [];
  } catch (err) {
    console.error("Token list load error:", err.message);
  }
}

// Load at startup
loadTokenList();
// Refresh every 5 minutes
setInterval(loadTokenList, 5 * 60 * 1000);

/**
 * Detect if string is a Solana mint address (base58)
 */
function isMintAddress(str) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);
}

/**
 * Main resolver: accepts
 *  - token symbol (SOL)
 *  - token name (Solana)
 *  - mint/CA (So1111..)
 */
async function resolve(query) {
  if (!query) return null;

  query = query.trim();

  const qLower = query.toLowerCase();
  const qUpper = query.toUpperCase();

  // ------------------------------------
  // 1. SOL manual override
  // ------------------------------------
  if (qUpper === "SOL") {
    return {
      symbol: "SOL",
      name: "Solana",
      address: SOL_MINT,
    };
  }

  // ------------------------------------
  // 2. If looks like a CA (mint address)
  // ------------------------------------
  if (isMintAddress(query)) {
    const token = TOKEN_LIST.find(
      (t) => t.address.toLowerCase() === qLower
    );

    if (token) return token;

    // Unknown mint → still return it
    return {
      symbol: query.slice(0, 4).toUpperCase(),
      name: query,
      address: query,
    };
  }

  // ------------------------------------
  // 3. Exact symbol match
  // ------------------------------------
  let bySymbol = TOKEN_LIST.find(
    (t) => t.symbol.toLowerCase() === qLower
  );
  if (bySymbol) return bySymbol;

  // ------------------------------------
  // 4. Exact name match
  // ------------------------------------
  let byName = TOKEN_LIST.find(
    (t) => t.name.toLowerCase() === qLower
  );
  if (byName) return byName;

  // ------------------------------------
  // 5. Partial match (symbol or name)
  // ------------------------------------
  let partial = TOKEN_LIST.find(
    (t) =>
      t.symbol.toLowerCase().includes(qLower) ||
      t.name.toLowerCase().includes(qLower)
  );
  if (partial) return partial;

  // ------------------------------------
  // 6. No match
  // ------------------------------------
  return null;
}

module.exports = { resolve };