const tokenService = require("../services/token");
const priceService = require("../services/price");
const { Markup } = require("telegraf");

async function priceCommand(ctx) {
  try {
    const args = ctx.message.text.split(/\s+/).slice(1);
    const query = args.join(" ") || "SOL";

    const token = await tokenService.resolve(query);
    if (!token) return ctx.reply(`❌ Unknown token: ${query}`);

    const mint = token.address;
    const price = await priceService.getPrice(mint);

    if (!price) return ctx.reply("❌ Failed to fetch price.");

    const msg =
      `💎 *${token.symbol} — Price Overview*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💰 *Price:* $${Number(price).toFixed(6)}\n` +
      `📦 *Token:* ${token.symbol}\n` +
      `🟩 *Network:* Solana\n\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    return ctx.reply(
      msg,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Refresh", callback_data: `refresh_${mint}` }],
            [
              { text: "🛒 Buy", callback_data: `buy_${mint}` },
              { text: "📤 Sell", callback_data: `sell_${mint}` }
            ],
            [{ text: "📈 Chart", callback_data: `chart_${mint}` }]
          ]
        }
      }
    );

  } catch (e) {
    console.error("priceCommand error:", e);
    return ctx.reply("⚠️ Error fetching price.");
  }
}

module.exports = priceCommand;