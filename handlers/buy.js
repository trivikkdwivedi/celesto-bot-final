const tokenService = require("../services/token");
const swapService = require("../services/swap");
const walletService = require("../services/wallet");
const portfolioService = require("../services/portfolio");

module.exports = async function buyHandler(ctx) {
  try {
    const args = ctx.message.text.split(" ").slice(1);
    if (args.length < 3) {
      return ctx.reply("⚠️ Usage: /buy <input> <output> <amount>");
    }

    const [inputQ, outputQ, amountStr] = args;
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      return ctx.reply("❌ Invalid amount.");
    }

    const telegramId = String(ctx.from.id);
    const wallet = await walletService.getWallet(telegramId);

    if (!wallet) return ctx.reply("❌ No wallet found. Use /createwallet");

    const inputTok = await tokenService.resolve(inputQ);
    const outputTok = await tokenService.resolve(outputQ);

    if (!inputTok || !outputTok) {
      return ctx.reply("❌ Token not found.");
    }

    const result = await swapService.executeSwap({
      wallet,
      inputMint: inputTok.address,
      outputMint: outputTok.address,
      amountIn: amount,
    });

    if (!result) return ctx.reply("❌ Swap failed.");

    // Update portfolio (increase output token)
    await portfolioService.updateToken(
      telegramId,
      outputTok.address,
      amount
    );

    return ctx.reply(
      `✅ *BUY Successful*\n\n` +
      `• From: ${inputTok.symbol}\n` +
      `• To: ${outputTok.symbol}\n` +
      `• Amount: ${amount}\n\n` +
      `🔗 https://solscan.io/tx/${result.signature}`,
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    console.error("BUY ERROR:", err);
    return ctx.reply("❌ Buy failed.");
  }
};