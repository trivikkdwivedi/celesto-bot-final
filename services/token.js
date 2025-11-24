const axios = require("axios");

// Correct SOL mint
const SOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Resolve a token query (symbol, name, mint) into metadata
 */
async function resolve(query) {
  if (!query) return null;

  query = query.trim().toUpperCase();

  // -----------------------------
  // 1. Hard-code native SOL
  // -----------------------------
  if (query === "SOL") {
    return {
      symbol: "SOL",
      name: "Solana",
      address: SOL_MINT,
    };
  }

  // -----------------------------
  // 2. If user pastes a mint address
  // -----------------------------
  if (query.length > 30) {
    return {
      symbol: query.slice(0, 5),
      name: query,
      address: query,
    };
  }

  // -----------------------------
  // 3. Jupiter token list lookup
  // -----------------------------
  try {
    const listRes = await axios.get("https://token.jup.ag/all", {
      timeout: 7000,
    });

    const list = listRes.data;

    const token = list.find(
      (t) =>
        t.symbol?.toUpperCase() === query ||
        t.name?.toUpperCase() === query
    );

    if (!token) return null;

    return {
      symbol: token.symbol,
      name: token.name,
      address: token.address,
    };
  } catch (err) {
    console.error("Token resolve error:", err.message);
    return null;
  }
}

module.exports = {
  resolve,
};