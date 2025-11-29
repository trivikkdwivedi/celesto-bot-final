const tokenService = require("../services/token");
const priceService = require("../services/price");
const { Markup } = require("telegraf");

// Track awaiting queries
const waitingForPrice = new Map();

async function askPrice(ctx) {
  const userId = ctx.from.id;

  waitingForPrice.set(userId, true);

  return ctx.reply(
    "🔍 *Which token?*\nSend the token symbol, name, or contract address:",
    { parse_mode: "Markdown" }
  );
}

async function handlePriceResponse(ctx) {
  const userId = ctx.from.id;

  if (!waitingForPrice.has(userId)) return; // Not in price mode
  waitingForPrice.delete(userId);

  const query = ctx.message.text.trim();
  if (!query) return ctx.reply("❌ Please send a real token name or CA.");

  // Resolve mint
  const token = await tokenService.resolve(query);
  if (!token) return ctx.reply(`❌ Could not identify token: ${query}`);

  const mint = token.address;
  const price = await priceService.getPrice(mint);

  if (!price) return ctx.reply("❌ Error fetching price.");

  const msg =
    `💎 *${token.symbol} — Price Overview*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `💰 *Price:* $${Number(price).toFixed(6)}\n` +
    `📦 *Token:* ${token.symbol}\n` +
    `🟩 *Network:* Solana\n\n` +
    `━━━━━━━━━━━━━━━━━━━━`;

  return ctx.reply(msg, {
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
  });
}

module.exports = { askPrice, handlePriceResponse };