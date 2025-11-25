// handlers/price.js
const tokenService = require("../services/token");
const priceService = require("../services/price");

async function priceCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1) || [];
    const rawQuery = parts.join(" ") || "SOL";

    const token = await tokenService.resolve(rawQuery);

    let mint;
    let symbol = null;
    if (!token) {
      const maybe = rawQuery.trim();
      mint = maybe;
      symbol = maybe;
    } else {
      mint = token.address;
      symbol = token.symbol || token.name || rawQuery;
    }

    if (!mint) {
      return ctx.reply(`❌ Could not resolve token: "${rawQuery}"`);
    }

    const price = await priceService.getPrice(mint, token);

    if (price === null) {
      return ctx.reply(
        `⚠️ No reliable market price for:\n` +
          `• **${symbol || rawQuery}**\n` +
          `• Mint: \`${mint}\``
      );
    }

    return ctx.reply(
      `💰 **${(symbol || rawQuery).toString().toUpperCase()} Price**\n\n` +
        `Mint: \`${mint}\`\n` +
        `Price: **$${Number(price).toFixed(6)} USD**`
    );
  } catch (err) {
    console.error("priceCommand error:", err);
    return ctx.reply("⚠️ Failed to fetch price. Try again later.");
  }
}

module.exports = priceCommand;