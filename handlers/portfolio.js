const portfolioService = require("../services/portfolio");
const tokenService = require("../services/token");
const priceService = require("../services/price");

module.exports = async function portfolioHandler(ctx) {
  try {
    const telegramId = String(ctx.from.id);

    const holdings = await portfolioService.getPortfolio(telegramId);
    if (!holdings.length) {
      return ctx.reply("📭 Your portfolio is empty.");
    }

    const valued = await portfolioService.valuatePortfolio(holdings);

    let total = 0;
    let out = `📊 *Your Portfolio*\n\n`;

    for (const item of valued) {
      const tok = await tokenService.getByMint(item.mint);
      total += item.value;

      out += `• *${tok?.symbol || "TOKEN"}*\n`;
      out += `  Amount: ${item.amount}\n`;
      out += `  Price: $${item.price?.toFixed(4) || "N/A"}\n`;
      out += `  Value: $${item.value.toFixed(2)}\n\n`;
    }

    out += `💰 *Total Value:* $${total.toFixed(2)}`;

    return ctx.reply(out, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("portfolio error:", err);
    return ctx.reply("❌ Could not load portfolio.");
  }
};