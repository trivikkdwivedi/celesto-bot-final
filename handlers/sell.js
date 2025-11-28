const tokenService = require("../services/token");
const swapService = require("../services/swap");
const portfolioService = require("../services/portfolio");

module.exports = async function sellHandler(ctx) {
  try {
    const parts = ctx.message.text.split(" ").slice(1);

    if (parts.length < 3) {
      return ctx.reply("⚠️ Usage:\n/sell <inputToken> <outputToken> <amount>");
    }

    const [inputQuery, outputQuery, amountStr] = parts;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply("❌ Invalid amount.");
    }

    const telegramId = String(ctx.from.id);
    const wallet = await ctx.wallet?.getWallet(telegramId) || null;

    if (!wallet) {
      return ctx.reply("❌ No wallet found. Use /createwallet");
    }

    // Token resolution
    const inputToken = await tokenService.resolve(inputQuery);
    const outputToken = await tokenService.resolve(outputQuery);

    if (!inputToken || !outputToken) {
      return ctx.reply("❌ Could not resolve one of the tokens.");
    }

    const inputMint = inputToken.address;
    const outputMint = outputToken.address;

    // Jupiter swap execution
    const result = await swapService.executeSwap({
      wallet,
      inputMint,
      outputMint,
      amountIn: amount,
    });

    if (!result || !result.signature) {
      return ctx.reply("❌ Sell failed. Try again.");
    }

    // Update portfolio tracker
    await portfolioService.addTransaction({
      telegramId,
      tokenMint: inputMint,
      tokenSymbol: inputToken.symbol,
      amount,
      direction: "SELL",
    });

    return ctx.reply(
      `✅ *SELL Successful!*\n\n` +
      `• Sold: *${inputToken.symbol}*\n` +
      `• Received: *${outputToken.symbol}*\n` +
      `• Amount: *${amount}*\n\n` +
      `🔗 Explorer:\nhttps://solscan.io/tx/${result.signature}`,
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    console.error("Sell command error:", err);
    return ctx.reply("❌ Sell failed.");
  }
};