const axios = require("axios");

const BASE_URL = process.env.BIRDEYE_BASE_URL || "https://public-api.birdeye.so";
const API_KEY = process.env.BIRDEYE_API_KEY;

// Hardcode SOL (Birdeye uses wrapped SOL address)
const SOL_MINT = "So11111111111111111111111111111111111111112";

async function resolve(query) {
  if (!query) return null;
  query = query.trim();

  // Direct mint address
  if (query.length > 40) {
    return { address: query, symbol: null, name: null };
  }

  // SOL special case
  if (query.toUpperCase() === "SOL") {
    return { address: SOL_MINT, symbol: "SOL", name: "Solana" };
  }

  // Search via Birdeye
  try {
    const res = await axios.get(
      `${BASE_URL}/search?keyword=${encodeURIComponent(query)}`,
      {
        headers: {
          "X-API-KEY": API_KEY,
          accept: "application/json",
        },
      }
    );

    const token = res.data.data?.tokens?.[0];
    if (!token) return null;

    return {
      address: token.address,
      symbol: token.symbol,
      name: token.name,
    };

  } catch (err) {
    console.error("Token resolve error:", err.message);
    return null;
  }
}

module.exports = { resolve };