// handlers/sell.js — Jupiter swap execution (SELL)
const tokenService = require("../services/token");
const walletService = require("../services/wallet");
const jupiter = require("../services/jupiter");
const { Keypair, Connection, Transaction } = require("@solana/web3.js");

function toBaseUnits(amountDecimal, decimals) {
  return BigInt(Math.round(Number(amountDecimal) * (10 ** decimals)));
}

module.exports = async function sellCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1);
    if (!parts || parts.length < 3) {
      return ctx.reply("🔻 Usage: /sell <INPUT_TOKEN> <OUTPUT_TOKEN> <AMOUNT>\nExample: /sell BONK SOL 10000");
    }

    const [inputRaw, outputRaw, amountRaw] = parts;
    const amountFloat = Number(amountRaw);
    if (isNaN(amountFloat) || amountFloat <= 0) return ctx.reply("⚠️ Invalid amount.");

    // Resolve tokens
    const inputToken = await tokenService.resolve(inputRaw);
    const outputToken = await tokenService.resolve(outputRaw);
    if (!inputToken || !inputToken.address) return ctx.reply(`❌ Invalid input token: ${inputRaw}`);
    if (!outputToken || !outputToken.address) return ctx.reply(`❌ Invalid output token: ${outputRaw}`);

    // Get user's wallet
    const telegramId = String(ctx.from.id);
    const userWallet = await walletService.getWallet(telegramId);
    if (!userWallet || !userWallet.encryptedSecret) {
      return ctx.reply("❌ No wallet found. Create one with /createwallet");
    }

    const inDecimals = inputToken.decimals ?? 9;
    const amountInBase = toBaseUnits(amountFloat, inDecimals);

    // Get quote
    const quoteResp = await jupiter.getQuote({
      inputMint: inputToken.address,
      outputMint: outputToken.address,
      amount: amountInBase.toString(),
      slippageBps: Number(process.env.SLIPPAGE_BPS || 50),
      userPublicKey: userWallet.publicKey,
    });

    if (!quoteResp || !quoteResp.data || !quoteResp.data.length) {
      return ctx.reply("⚠️ No swap route found (Jupiter).");
    }

    const route = quoteResp.data[0];
    const swapPayload = await jupiter.requestSwap(route, userWallet.publicKey);
    if (!swapPayload || (!swapPayload.swapTransaction && !swapPayload.transaction)) {
      return ctx.reply("⚠️ Jupiter returned no swap transaction.");
    }

    const swapTxBase64 = swapPayload.swapTransaction || swapPayload.transaction;
    const rawTx = Buffer.from(swapTxBase64, "base64");

    const connection = new Connection(process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com", "confirmed");
    const tx = Transaction.from(rawTx);

    const keypair = walletService.keypairFromEncrypted(userWallet.encryptedSecret);
    tx.partialSign(keypair);

    const signed = tx.serialize();
    const sig = await connection.sendRawTransaction(signed, { skipPreflight: false, preflightCommitment: "confirmed" });
    await connection.confirmTransaction(sig, "confirmed");

    return ctx.reply(`✅ Sell swap submitted!\n\nSignature: \`${sig}\``);
  } catch (err) {
    console.error("/sell swap error:", err.response?.data || err.message || err);
    const msg = err.response?.data?.error || err.message || "Swap failed.";
    return ctx.reply(`❌ Swap failed: ${msg}`);
  }
};