const tokenService = require("../services/token");
const priceService = require("../services/price");
const infoService = require("../services/info"); // for stats

async function priceCommand(ctx) {
  try {
    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    const query = args.join(" ") || "SOL";

    // Resolve token metadata
    const token = await tokenService.resolve(query);
    if (!token || !token.address) {
      return ctx.reply(`❌ Unknown token: "${query}"`);
    }

    // Fetch price
    const price = await priceService.getPrice(token.address);
    if (price === null) {
      return ctx.reply(`⚠️ Price unavailable for **${token.symbol}**`);
    }

    // Fetch extra stats (24h change, volume, mcap)
    const info = await infoService.getInfo(token.address);

    const change = info?.priceChange24h;
    const volume = info?.volume24h;
    const mcap = info?.marketCap;

    let changeEmoji = "➖";
    if (change > 0) changeEmoji = "📈";
    else if (change < 0) changeEmoji = "📉";

    // Build card-style message
    let msg = `━━━━━━━━━━━━━━━━━━━━\n`;

    msg += `💎 **${token.symbol}**\n`;
    msg += `💰 Price: **$${Number(price).toFixed(6)}**\n`;

    if (change !== undefined)
      msg += `${changeEmoji} 24h Change: **${change.toFixed(2)}%**\n`;

    if (volume !== undefined)
      msg += `🔄 Volume: **$${Number(volume).toLocaleString()}**\n`;

    if (mcap !== undefined)
      msg += `🏦 Market Cap: **$${Number(mcap).toLocaleString()}**\n`;

    msg += `━━━━━━━━━━━━━━━━━━━━`;

    return ctx.reply(msg, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("priceCommand error:", err);
    return ctx.reply("⚠️ Failed to fetch price.");
  }
}

module.exports = priceCommand;