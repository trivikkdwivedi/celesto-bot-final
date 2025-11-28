// services/token.js — Birdeye-powered token resolver
const axios = require("axios");

const BIRDEYE_TOKEN_LIST =
  "https://public-api.birdeye.so/public/tokenlist?chain=solana";

let TOKEN_MAP = null;

// Load token list once
async function load() {
  try {
    const res = await axios.get(BIRDEYE_TOKEN_LIST, {
      headers: { "x-api-key": process.env.BIRDEYE_API_KEY }
    });

    if (res.data && res.data.data && res.data.data.tokens) {
      TOKEN_MAP = res.data.data.tokens;
      console.log(`Loaded ${TOKEN_MAP.length} tokens`);
    }
  } catch (err) {
    console.error("Token list load error:", err.message);
  }
}

// Ensure loaded before usage
async function ensureLoaded() {
  if (!TOKEN_MAP) await load();
}

// Resolve a token by symbol, name, or mint
async function resolve(query) {
  await ensureLoaded();
  if (!TOKEN_MAP) return null;

  const q = query.trim().toLowerCase();

  return (
    TOKEN_MAP.find(t => t.address.toLowerCase() === q) || // CA
    TOKEN_MAP.find(t => t.symbol?.toLowerCase() === q) || // symbol
    TOKEN_MAP.find(t => t.name?.toLowerCase() === q) ||   // name
    null
  );
}

module.exports = { resolve, load };