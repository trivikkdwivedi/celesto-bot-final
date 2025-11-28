// services/swap.js
const axios = require("axios");
const { Connection, Transaction } = require("@solana/web3.js");
const walletService = require("./wallet");
const tokenService = require("./token");

const JUPITER_QUOTE_URL = process.env.JUPITER_QUOTE_URL || "https://quote-api.jup.ag/v6/quote";
const JUPITER_SWAP_URL = process.env.JUPITER_SWAP_URL || "https://quote-api.jup.ag/v6/swap";

/**
 * Request best quote from Jupiter
 * Returns the first route object (or null)
 */
async function getBestQuote({ inputMint, outputMint, amount, slippageBps = Number(process.env.SLIPPAGE_BPS || 50), userPublicKey }) {
  try {
    const params = {
      inputMint,
      outputMint,
      amount: String(amount),
      slippageBps: String(slippageBps),
      userPublicKey: userPublicKey || undefined,
      asLegacyTransaction: "true"
    };
    // remove undefined
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

    const res = await axios.get(JUPITER_QUOTE_URL, { params, timeout: 10000 });
    if (!res.data || !res.data.data) return null;
    const routes = res.data.data;
    if (!routes || !routes.length) return null;
    return routes[0]; // best route
  } catch (err) {
    console.error("Jupiter quote error:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Request swap transaction for a chosen route
 * returns object { swapTransaction (base64), inAmount, outAmount, ... }
 */
async function buildSwapTransaction(route, userPublicKey) {
  try {
    const body = {
      route,
      userPublicKey
    };

    const res = await axios.post(JUPITER_SWAP_URL, body, { timeout: 15000 });
    if (!res.data) return null;
    return res.data;
  } catch (err) {
    console.error("Jupiter swap build error:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Execute swap: gets quote, builds swap tx, signs with user keypair, sends.
 *
 * Params:
 * - wallet: { publicKey, encryptedSecret } (from walletService.getWallet)
 * - inputMint, outputMint: mint addresses (string)
 * - amountInFloat: human amount (e.g. 0.5 SOL)
 *
 * Returns:
 * { signature, inAmount, outAmount, route }
 */
async function executeSwap({ wallet, inputMint, outputMint, amountInFloat }) {
  if (!wallet) throw new Error("wallet required");

  // Resolve token decimals
  const inputMeta = await tokenService.resolve(inputMint) || {};
  const outputMeta = await tokenService.resolve(outputMint) || {};

  const inDecimals = Number(inputMeta.decimals ?? 9);
  const outDecimals = Number(outputMeta.decimals ?? 9);

  // convert human amount -> base units (integer string)
  const amountBase = BigInt(Math.round(Number(amountInFloat) * (10 ** inDecimals))).toString();

  // 1) get route
  const route = await getBestQuote({
    inputMint,
    outputMint,
    amount: amountBase,
    slippageBps: Number(process.env.SLIPPAGE_BPS || 50),
    userPublicKey: wallet.publicKey,
  });

  if (!route) throw new Error("No route found");

  // 2) build swap transaction
  const swapPayload = await buildSwapTransaction(route, wallet.publicKey);
  if (!swapPayload) throw new Error("Failed to build swap transaction");

  const swapTxBase64 = swapPayload.swapTransaction || swapPayload.transaction;
  if (!swapTxBase64) throw new Error("Jupiter returned no swap transaction");

  // 3) sign & send
  const raw = Buffer.from(swapTxBase64, "base64");

  // Deserialize to Transaction (works for legacy)
  let tx;
  try {
    tx = Transaction.from(raw);
  } catch (e) {
    // fallback: if VersionedTransaction, user must use web3 >=1.87 - but we'll try to send raw
    console.warn("Transaction.from failed, will send raw bytes after partial sign attempt", e.message);
    // create a connection and sendRawTransaction with a signed buffer later after signing
    tx = Transaction.from(raw); // try again to allow partial signing — if fails it'll throw
  }

  // get keypair and sign
  const keypair = walletService.keypairFromEncrypted(wallet.encryptedSecret);
  tx.partialSign(keypair);

  // Send
  const connection = new Connection(process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com", "confirmed");
  const signed = tx.serialize();
  const sig = await connection.sendRawTransaction(signed, { skipPreflight: false, preflightCommitment: "confirmed" });

  // confirm
  await connection.confirmTransaction(sig, "confirmed");

  // derive human amounts from route (route.inAmount/ outAmount are strings of base units)
  const inAmount = route.inAmount ?? route.inputAmount ?? null;
  const outAmount = route.outAmount ?? route.outputAmount ?? null;

  const inAmountFloat = inAmount ? Number(inAmount) / (10 ** inDecimals) : null;
  const outAmountFloat = outAmount ? Number(outAmount) / (10 ** outDecimals) : null;

  return {
    signature: sig,
    inAmount: inAmountFloat,
    outAmount: outAmountFloat,
    route,
  };
}

module.exports = {
  getBestQuote,
  buildSwapTransaction,
  executeSwap,
};