// handlers/buy.js — Jupiter swap execution (BUY)
const tokenService = require("../services/token");
const walletService = require("../services/wallet");
const jupiter = require("../services/jupiter");
const { Keypair, Connection, PublicKey } = require("@solana/web3.js");

// helper: convert decimal amount to base units given decimals
function toBaseUnits(amountDecimal, decimals) {
  return BigInt(Math.round(Number(amountDecimal) * (10 ** decimals)));
}

module.exports = async function buyCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1);
    if (!parts || parts.length < 3) {
      return ctx.reply("🟢 Usage: /buy <INPUT_TOKEN> <OUTPUT_TOKEN> <AMOUNT>\nExample: /buy SOL USDC 0.1");
    }

    const [inputRaw, outputRaw, amountRaw] = parts;
    const amountFloat = Number(amountRaw);
    if (isNaN(amountFloat) || amountFloat <= 0) return ctx.reply("⚠️ Invalid amount.");

    // Resolve tokens
    const inputToken = await tokenService.resolve(inputRaw);
    const outputToken = await tokenService.resolve(outputRaw);
    if (!inputToken || !inputToken.address) return ctx.reply(`❌ Invalid input token: ${inputRaw}`);
    if (!outputToken || !outputToken.address) return ctx.reply(`❌ Invalid output token: ${outputRaw}`);

    // Get user's wallet from DB
    const telegramId = String(ctx.from.id);
    const userWallet = await walletService.getWallet(telegramId);
    if (!userWallet || !userWallet.encryptedSecret) {
      return ctx.reply("❌ No wallet found. Create one with /createwallet");
    }

    // Convert amount -> base units (use decimals if available; default 9)
    const outDecimals = outputToken.decimals ?? 9;
    // For Jupiter quote: amount param is input amount in base units. We'll do input side amount.
    // If user provided amount as amount of INPUT token (e.g. 0.1 SOL), convert using input token decimals.
    const inDecimals = inputToken.decimals ?? 9;
    const amountInBase = toBaseUnits(amountFloat, inDecimals); // BigInt

    // Request quotes — prefer best route
    const quoteResp = await jupiter.getQuote({
      inputMint: inputToken.address,
      outputMint: outputToken.address,
      amount: amountInBase.toString(),
      slippageBps: Number(process.env.SLIPPAGE_BPS || 50),
      userPublicKey: userWallet.publicKey,
    });

    if (!quoteResp || !quoteResp.data || !quoteResp.data?.length) {
      return ctx.reply("⚠️ No swap route found (Jupiter).");
    }

    // Pick best route (first)
    const route = quoteResp.data[0];

    // Ask Jupiter for swap transaction (will return swapTransaction base64)
    const swapPayload = await jupiter.requestSwap(route, userWallet.publicKey);
    if (!swapPayload || (!swapPayload.swapTransaction && !swapPayload.transaction)) {
      console.error("Bad swap payload:", swapPayload);
      return ctx.reply("⚠️ Jupiter returned no swap transaction.");
    }

    const swapTxBase64 = swapPayload.swapTransaction || swapPayload.transaction;
    const rawTx = Buffer.from(swapTxBase64, "base64");

    // Decrypt user's keypair and sign the transaction
    const keypair = walletService.keypairFromEncrypted(userWallet.encryptedSecret);

    // Build connection
    const connection = new Connection(process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com", "confirmed");

    // Sign & send raw transaction
    // rawTx is usually an unsigned Transaction serialized; we need to sign it.
    // The returned base64 from Jupiter is usually an unsigned transaction requiring user's signature.
    // We'll use web3.js to deserialize, sign, and send.
    const { Transaction } = require("@solana/web3.js");
    const tx = Transaction.from(rawTx);

    // Add signer
    tx.partialSign(keypair);

    const signed = tx.serialize();
    const sig = await connection.sendRawTransaction(signed, { skipPreflight: false, preflightCommitment: "confirmed" });

    // Wait confirmation
    await connection.confirmTransaction(sig, "confirmed");

    return ctx.reply(`✅ Swap submitted!\n\nSignature: \`${sig}\`\n\nCheck on Solscan: https://solscan.io/tx/${sig}`);
  } catch (err) {
    console.error("/buy swap error:", err.response?.data || err.message || err);
    const msg = err.response?.data?.error || err.message || "Swap failed.";
    return ctx.reply(`❌ Swap failed: ${msg}`);
  }
};