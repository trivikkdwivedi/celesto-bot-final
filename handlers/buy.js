// handlers/buy.js — Jupiter BUY command (quote → swap → sign → send)
const tokenService = require("../services/token");
const tradeService = require("../services/trade");
const signer = require("../services/signer");
const walletService = require("../services/wallet");

async function buyCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1) || [];
    if (parts.length < 3) {
      return ctx.reply(
        "Usage:\n" +
        "`/buy <input_token> <output_token> <amount>`\n\n" +
        "Example:\n`/buy SOL USDC 0.1`",
        { parse_mode: "Markdown" }
      );
    }

    const [inputQ, outputQ, amountStr] = parts;

    // Resolve tokens (symbol / name / contract)
    const inputToken = await tokenService.resolve(inputQ);
    const outputToken = await tokenService.resolve(outputQ);

    if (!inputToken || !outputToken) {
      return ctx.reply("❌ Could not resolve one of the tokens.");
    }

    // Validate human-readable amount
    const userAmount = Number(amountStr);
    if (!isFinite(userAmount) || userAmount <= 0) {
      return ctx.reply("❌ Invalid amount.");
    }

    // Convert human amount → smallest units
    const amountSmallest = Math.floor(
      userAmount * 10 ** (inputToken.decimals || 9)
    );

    // Get user's wallet
    const wallet = await walletService.getWallet(String(ctx.from.id));
    if (!wallet) {
      return ctx.reply("❌ No wallet found. Create one with /createwallet");
    }

    // Step 1 — Get Jupiter quote
    const quote = await tradeService.getQuote({
      inputMint: inputToken.address,
      outputMint: outputToken.address,
      amount: amountSmallest,
      slippageBps: 50,
    });

    const routes = quote?.data || quote?.routes || [];
    if (!routes.length) {
      return ctx.reply("⚠️ No available route for that trade.");
    }

    const bestRoute = routes[0];

    // Step 2 — Request serialized swap transaction
    const swapTx = await tradeService.getSwapTransaction({
      route: bestRoute,
      userPublicKey: wallet.publicKey,
    });

    const serialized =
      swapTx?.swapTransaction ||
      swapTx?.swap_transaction ||
      null;

    if (!serialized) {
      return ctx.reply(
        "⚠️ Could not fetch swap transaction.\n\n" +
        "Raw quote:\n```json\n" +
        JSON.stringify(quote, null, 2) +
        "\n```",
        { parse_mode: "Markdown" }
      );
    }

    // Step 3 — Sign & send transaction
    const txSig = await signer.signAndSend({
      publicKey: wallet.publicKey,
      serializedTxBase64: serialized,
    });

    return ctx.reply(
      `✅ **Swap submitted successfully**\n\n` +
      `**TX:** https://solscan.io/tx/${txSig}\n` +
      `From: ${inputToken.symbol}\n` +
      `To: ${outputToken.symbol}`,
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    console.error("buyCommand error:", err);
    return ctx.reply(
      `❌ Buy failed:\n\`${err.message || "unknown error"}\``,
      { parse_mode: "Markdown" }
    );
  }
}

module.exports = buyCommand;
    
