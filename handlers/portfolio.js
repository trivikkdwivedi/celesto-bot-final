// handlers/portfolio.js
const portfolio = require("../services/portfolio");
const tokenService = require("../services/token");
const priceService = require("../services/price");

module.exports = async function portfolioHandler(ctx) {
  try {
    const tg = String(ctx.from.id);

    const { items, total } = await portfolio.valuate(tg);

    if (!items || items.length === 0) {
      return ctx.reply("📭 Your portfolio is empty.");
    }

    let out = `📊 *Your Portfolio*\n\n`;
    for (const it of items) {
      const meta = await tokenService.resolve(it.mint) || {};
      out += `• *${meta.symbol || it.mint}*\n`;
      out += `  Amount: ${it.amount}\n`;
      out += `  Price: $${it.price ? Number(it.price).toFixed(6) : "N/A"}\n`;
      out += `  Value: $${Number(it.value || 0).toFixed(2)}\n\n`;
    }

    out += `💰 *Total:* $${Number(total || 0).toFixed(2)}`;
    return ctx.reply(out, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("/portfolio error:", err);
    return ctx.reply("Failed to load portfolio.");
  }
};