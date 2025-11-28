// services/token.js
const axios = require("axios");

let TOKEN_LIST = [];

const JUPITER_TOKEN_LIST_URL =
  "https://cache.jup.ag/tokens";

// Load token list on startup
async function loadTokenList() {
  try {
    const res = await axios.get(JUPITER_TOKEN_LIST_URL);
    TOKEN_LIST = res.data;

    console.log(`✅ Loaded ${TOKEN_LIST.length} tokens from Jupiter`);
  } catch (err) {
    console.error("❌ Token list load error:", err.message);
  }
}

// Resolve token by symbol, name, or mint
async function resolve(query) {
  if (!TOKEN_LIST.length) {
    console.warn("⚠️ Token list empty — reloading...");
    await loadTokenList();
  }

  const q = query.trim().toLowerCase();

  // 1. Mint match
  let token = TOKEN_LIST.find(t => t.address.toLowerCase() === q);

  if (!token) {
    // 2. Symbol match
    token = TOKEN_LIST.find(t => (t.symbol || "").toLowerCase() === q);
  }

  if (!token) {
    // 3. Name match
    token = TOKEN_LIST.find(t => (t.name || "").toLowerCase() === q);
  }

  if (!token) return null;

  return {
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
  };
}

module.exports = {
  resolve,
  loadTokenList,
};