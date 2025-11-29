const tokenService = require("../services/token");
const infoService = require("../services/info");

async function infoCommand(ctx) {
  try {
    const q = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!q) return ctx.reply("❗ Usage: /info <token>");

    // Resolve name / symbol / CA
    const token = await tokenService.resolve(q);
    if (!token) return ctx.reply(`❌ Unknown token: "${q}"`);

    const mint = token.address;

    // Fetch from Birdeye
    const d = await infoService.getTokenOverview(mint);
    if (!d) return ctx.reply("❌ Failed to fetch token overview.");

    const price = d.price || 0;
    const mc = d.marketCap || 0;
    const vol = d.volume24h || 0;
    const change = d.priceChange24h || 0;

    const changeEmoji = change > 0 ? "🟢" : change < 0 ? "🔴" : "⚪";

    const msg =
      `📘 *${token.symbol} — Token Overview*\n\n` +
      `💵 *Price:* $${price.toFixed(6)}\n` +
      `💰 *Market Cap:* $${mc.toLocaleString()}\n` +
      `📊 *24h Volume:* $${vol.toLocaleString()}\n` +
      `📈 *24h Change:* ${changeEmoji} ${change.toFixed(2)}%\n\n` +
      `🧩 *CA:* \`${mint}\``;

    return ctx.reply(msg, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("infoCommand error:", err);
    return ctx.reply("❌ Failed to load info.");
  }
}

module.exports = infoCommand;