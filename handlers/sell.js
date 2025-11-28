// handlers/sell.js
const tokenService = require("../services/token");
const swap = require("../services/swap");
const walletService = require("../services/wallet");
const portfolio = require("../services/portfolio");

module.exports = async function sellHandler(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1);
    if (!parts || parts.length < 3) {
      return ctx.reply("Usage: /sell <input> <output> <amount>");
    }

    const [inputQ, outputQ, amountStr] = parts;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) return ctx.reply("Invalid amount.");

    const tg = String(ctx.from.id);
    const userWallet = await walletService.getWallet(tg);
    if (!userWallet) return ctx.reply("No wallet found. Use /createwallet");

    const inputTok = await tokenService.resolve(inputQ);
    const outputTok = await tokenService.resolve(outputQ);

    if (!inputTok || !outputTok) return ctx.reply("Could not resolve tokens.");

    // execute swap
    const res = await swap.executeSwap({
      wallet: userWallet,
      inputMint: inputTok.address,
      outputMint: outputTok.address,
      amountInFloat: amount,
    });

    if (!res || !res.signature) {
      return ctx.reply("Swap failed.");
    }

    // Decrease portfolio by inAmount
    if (res.inAmount !== null && res.inAmount !== undefined) {
      await portfolio.adjustToken(tg, inputTok.address, -Number(res.inAmount));
    } else {
      console.warn("Sell: inAmount unknown, portfolio not updated automatically.");
    }

    return ctx.reply(
      `✅ Sell executed.\nTx: \`${res.signature}\`\nSold: ${res.inAmount ?? "N/A"} ${inputTok.symbol || ""}`,
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    console.error("/sell error:", err);
    return ctx.reply("Sell failed: " + (err.message || ""));
  }
};