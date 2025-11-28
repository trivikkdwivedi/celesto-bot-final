// services/jupiter.js
// Simple helper for Jupiter v6 quote + swap flow
const axios = require("axios");

const JUPITER_QUOTE_URL = process.env.JUPITER_QUOTE_URL || "https://quote-api.jup.ag/v6/quote";
const JUPITER_SWAP_URL = process.env.JUPITER_SWAP_URL || "https://quote-api.jup.ag/v6/swap";

/**
 * Request a quote from Jupiter
 * inputMint/outputMint: mint addresses (if using SOL, use wrapped SOL mint So1111...)
 * amount: integer amount in smallest unit (for tokens, amount in base units). For SOL input, you may use lamports
 * slippageBps: integer (e.g. 50 = 0.5%)
 */
async function getQuote({ inputMint, outputMint, amount, slippageBps = Number(process.env.SLIPPAGE_BPS || 50), userPublicKey }) {
  try {
    const params = {
      inputMint,
      outputMint,
      amount: String(amount),
      slippageBps: String(slippageBps),
      userPublicKey: userPublicKey || undefined,
      asLegacyTransaction: "true" // attempt to get legacy swap tx (works cross-clients)
    };
    // Remove undefined keys
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

    const res = await axios.get(JUPITER_QUOTE_URL, { params, timeout: 10000 });
    if (!res.data) return null;
    return res.data; // contains routes, inAmount/outAmount, other fields
  } catch (err) {
    console.error("Jupiter quote error:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Request swap transaction from Jupiter.
 * - quoteResponse = the "data" objects from getQuote (pass chosen route)
 * - userPublicKey = base58 string
 *
 * Jupiter returns `swapTransaction` (base64) which you sign and send.
 */
async function requestSwap(quoteResponse, userPublicKey) {
  try {
    const body = {
      route: quoteResponse, // route object returned by quote API (one chosen route)
      userPublicKey,
    };

    const res = await axios.post(JUPITER_SWAP_URL, body, { timeout: 10000 });
    if (!res.data) throw new Error("No swap response from Jupiter");
    return res.data; // expected shape contains swapTransaction (base64) or transaction
  } catch (err) {
    console.error("Jupiter swap error:", err.response?.data || err.message);
    throw err;
  }
}

module.exports = {
  getQuote,
  requestSwap,
};