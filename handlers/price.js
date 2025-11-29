const tokenService = require("../services/token");
const priceService = require("../services/price");

async function priceCommand(ctx) {
  try {
    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    const query = args.join(" ") || "SOL";

    const token = await tokenService.resolve(query);
    if (!token || !token.address) {
      return ctx.reply(`❌ Unknown token: "${query}"`);
    }

    const price = await priceService.getPrice(token.address);
    if (price === null) {
      return ctx.reply(`⚠️ No price found for ${token.symbol}`);
    }

    return ctx.reply(
      `📊 <b>${token.symbol} Price</b>\n` +
      `<b>$${Number(price).toFixed(6)}</b>`,
      { parse_mode: "HTML" }
    );

  } catch (err) {
    console.error("priceCommand error:", err);
    return ctx.reply("⚠️ Failed to fetch price.");
  }
}

module.exports = priceCommand;