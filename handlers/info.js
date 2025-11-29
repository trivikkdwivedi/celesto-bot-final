const tokenService = require("../services/token");
const infoService = require("../services/info");

async function infoHandler(ctx) {
  try {
    const args = ctx.message.text.split(" ").slice(1);
    const query = args.join(" ");

    if (!query) return ctx.reply("❗ Usage: /info <token>");

    const token = await tokenService.resolve(query);
    if (!token) return ctx.reply(`❌ Unknown token: ${query}`);

    const d = await infoService.getTokenOverview(token.address);
    if (!d) return ctx.reply("❌ Failed to fetch token info.");

    const price = d.price || 0;
    const mc = d.marketCap || 0;
    const vol = d.volume24h || 0;
    const change = d.priceChange24h || 0;

    const emoji = change > 0 ? "🟢" : change < 0 ? "🔴" : "⚪";

    const msg =
      `📘 *${token.symbol} — Token Overview*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💵 *Price:* $${price.toFixed(6)}\n` +
      `💰 *Market Cap:* $${mc.toLocaleString()}\n` +
      `📊 *24h Volume:* $${vol.toLocaleString()}\n` +
      `📈 *24h Change:* ${emoji} ${change.toFixed(2)}%\n\n` +
      `🧩 *CA:* \`${token.address}\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    return ctx.reply(msg, { parse_mode: "Markdown" });

  } catch (e) {
    console.error("infoHandler error:", e);
    return ctx.reply("⚠️ Error fetching token info.");
  }
}

module.exports = infoHandler;