const searchService = require("../services/search");
const { Markup } = require("telegraf");
const tokenService = require("../services/token");
const priceService = require("../services/price");

async function searchHandler(ctx) {
  const query = ctx.message.text.trim();

  if (query.length < 2) return; // Ignore too-short text

  // Search birdeye
  const results = await searchService.searchTokens(query);

  if (!results || results.length === 0) return;

  // Show max 6 tokens
  const top = results.slice(0, 6);

  const keyboard = top.map((t) => {
    return [
      Markup.button.callback(
        `${t.symbol} (${t.name})`,
        `select_${t.address}`
      )
    ];
  });

  return ctx.reply(
    `🔎 *Results for:* \`${query}\``,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
  );
}

// When user taps a search result
async function selectedToken(ctx) {
  const mint = ctx.callbackQuery.data.split("_")[1];

  const token = await tokenService.resolve(mint);
  const price = await priceService.getPrice(mint);

  if (!price) {
    return ctx.reply("❌ Could not fetch price.");
  }

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

module.exports = { searchHandler, selectedToken };
