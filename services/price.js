// services/price.js
import axios from "axios";

const COINGECKO_SOL_ID = "solana";

/**
 * Fetch SOL price in USD from coingecko public API
 */
export async function fetchSOLPrice() {
  try {
    const r = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_SOL_ID}&vs_currencies=usd`, { timeout: 10000 });
    return r.data?.[COINGECKO_SOL_ID]?.usd ?? null;
  } catch (e) {
    console.error("fetchSOLPrice error", e?.message ?? e);
    return null;
  }
}

