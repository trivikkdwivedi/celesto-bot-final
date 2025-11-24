// handlers/price.js — /price command using Jupiter price API
const tokenService = require("../services/token");
const priceService = require("../services/price");

async function priceCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1) || [];
    const query = parts.join(" ") || "SOL";

    // resolve symbol/name/mint → token metadata
    const token = await tokenService.resolve(query);
    if (!token || !token.address) {
      return ctx.reply(`❌ Could not resolve token: "${query}"`);
    }

    const price = await priceService.getPrice(token.address);

    if (price === null) {
      return ctx.reply(
        `⚠️ No reliable market price for:\n` +
        `• **${token.symbol || query}**\n` +
        `• Mint: \`${token.address}\``
      );
    }

    return ctx.reply(
      `💰 **${token.symbol || query.toUpperCase()} Price**\n\n` +
      `Mint: \`${token.address}\`\n` +
      `Price: **$${Number(price).toFixed(6)} USD**`
    );

  } catch (err) {
    console.error("priceCommand error:", err);
    return ctx.reply("⚠️ Failed to fetch price. Try again later.");
  }
}

module.exports = priceCommand;

