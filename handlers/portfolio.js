const portfolioService = require("../services/portfolio");
const priceService = require("../services/price");
const tokenService = require("../services/token");

async function portfolioCommand(ctx) {
  try {
    const telegramId = String(ctx.from.id);

    const items = await portfolioService.getPortfolio(telegramId);

    if (!items.length) {
      return ctx.reply("📭 Your portfolio is empty.\nBuy tokens to get started!");
    }

    let totalUsd = 0;
    let text = `📊 *Your Portfolio*\n\n`;

    for (const row of items) {
      const token = await tokenService.getByMint(row.mint);
      const price = await priceService.getPrice(row.mint);

      const value = (row.amount * (price || 0));
      totalUsd += value;

      text += `• *${token?.symbol || "TOKEN"}*\n`;
      text += `  Amount: *${row.amount}*\n`;
      text += `  Value: *$${value.toFixed(2)}*\n\n`;
    }

    text += `💰 *Total Value:* $${totalUsd.toFixed(2)}`;

    return ctx.reply(text, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("portfolioCommand error:", err);
    return ctx.reply("❌ Failed to load portfolio.");
  }
}

module.exports = portfolioCommand;