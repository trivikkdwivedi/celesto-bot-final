// services/token.js
const axios = require("axios");

const SOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Manual SOL entry
 */
function resolveSOL() {
  return {
    symbol: "SOL",
    name: "Solana",
    address: SOL_MINT
  };
}

/**
 * Resolve token by name, symbol, or mint.
 * Uses Jupiter Token List.
 */
async function resolve(query) {
  if (!query) return null;

  query = query.trim().toUpperCase();

  // --- Handle SOL manually ---
  if (query === "SOL" || query === SOL_MINT.toUpperCase()) {
    return resolveSOL();
  }

  try {
    // Jupiter token list (fast + reliable)
    const res = await axios.get("https://tokens.jup.ag/tokens", { timeout: 7000 });
    const list = res.data;

    if (!Array.isArray(list)) return null;

    // Match by symbol or mint
    const token = list.find(
      (t) =>
        t.address.toUpperCase() === query ||
        t.symbol?.toUpperCase() === query ||
        t.name?.toUpperCase() === query
    );

    if (!token) return null;

    return {
      symbol: token.symbol,
      name: token.name,
      address: token.address
    };
  } catch (err) {
    console.error("tokenService.resolve error:", err.message);
    return null;
  }
}

module.exports = {
  resolve,
};