// handlers/buy.js
const tokenService = require("../services/token");
const swap = require("../services/swap");
const walletService = require("../services/wallet");
const portfolio = require("../services/portfolio");

module.exports = async function buyHandler(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1);
    if (!parts || parts.length < 3) {
      return ctx.reply("Usage: /buy <input> <output> <amount>");
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

    // Update portfolio by adding outAmount (if available)
    if (res.outAmount !== null && res.outAmount !== undefined) {
      // add outAmount to user's holdings
      await portfolio.adjustToken(tg, outputTok.address, Number(res.outAmount));
    } else {
      // Fallback: don't update if outAmount unknown
      console.warn("Buy: outAmount unknown, portfolio not updated automatically.");
    }

    return ctx.reply(
      `✅ Buy executed.\nTx: \`${res.signature}\`\nReceived: ${res.outAmount ?? "N/A"} ${outputTok.symbol || ""}`,
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    console.error("/buy error:", err);
    return ctx.reply("Buy failed: " + (err.message || ""));
  }
};