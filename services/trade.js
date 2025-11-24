// services/trade.js — Jupiter Quote + Swap Transaction API
const axios = require('axios');

const JUPITER_QUOTE_URL =
  process.env.JUPITER_QUOTE_URL || "https://quote-api.jup.ag/v6/quote";

const JUPITER_SWAP_URL =
  process.env.JUPITER_SWAP_URL || "https://quote-api.jup.ag/v6/swap";

/**
 * Get a swap quote from Jupiter
 *
 * @param {object} opts
 * @param {string} opts.inputMint
 * @param {string} opts.outputMint
 * @param {number} opts.amount — smallest units
 * @param {number} opts.slippageBps — default 50 (0.5%)
 */
async function getQuote({ inputMint, outputMint, amount, slippageBps = 50 }) {
  if (!inputMint || !outputMint || !amount) {
    throw new Error("inputMint, outputMint, amount required");
  }

  const url =
    `${JUPITER_QUOTE_URL}` +
    `?inputMint=${encodeURIComponent(inputMint)}` +
    `&outputMint=${encodeURIComponent(outputMint)}` +
    `&amount=${encodeURIComponent(amount)}` +
    `&slippageBps=${encodeURIComponent(slippageBps)}`;

  const res = await axios.get(url, { timeout: 10000 });

  if (!res.data) throw new Error("Invalid quote response");

  return res.data;
}

/**
 * Get a serialized swap transaction from Jupiter
 *
 * @param {object} opts
 * @param {object} opts.route — route object returned by getQuote()
 * @param {string} opts.userPublicKey
 */
async function getSwapTransaction({ route, userPublicKey, wrapUnwrapSOL = true }) {
  if (!route) {
    throw new Error("route is required");
  }

  const body = {
    route,
    userPublicKey,
    wrapUnwrapSOL,
  };

  const res = await axios.post(JUPITER_SWAP_URL, body, { timeout: 15000 });

  if (!res.data) throw new Error("Invalid swap transaction response");

  return res.data;
}

module.exports = {
  getQuote,
  getSwapTransaction,
};
