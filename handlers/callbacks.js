// handlers/callbacks.js — FINAL VERSION
const axios = require("axios");
const priceService = require("../services/price");
const tokenService = require("../services/token");
const { Markup } = require("telegraf");

const API_KEY = process.env.BIRDEYE_API_KEY;
const BASE_URL = process.env.BIRDEYE_BASE_URL || "https://public-api.birdeye.so";

// Rebuild the inline keyboard for price output
function priceKeyboard(mint) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🔁 Refresh", `refresh|${mint}`),
      Markup.button.callback("🛒 Buy", `buy|${mint}`),
      Markup.button.callback("📤 Sell", `sell|${mint}`)
    ],
    [
      Markup.button.callback("📈 Chart", `chart|${mint}|1D`)
    ]
  ]);
}

// Rebuild the inline keyboard for chart timeframe switching
function chartKeyboard(mint) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("1H", `chart|${mint}|1H`),
      Markup.button.callback("4H", `chart|${mint}|4H`),
      Markup.button.callback("1D", `chart|${mint}|1D`),
      Markup.button.callback("7D", `chart|${mint}|7D`)
    ]
  ]);
}

module.exports = async function callbackHandler(ctx) {
  try {
    const data = ctx.callbackQuery.data;
    if (!data) return ctx.answerCbQuery();

    const parts = data.split("|");
    const action = parts[0];
    const mint = parts[1];
    const timeframe = parts[2];

    await ctx.answerCbQuery(); // remove the loading animation immediately

    // =====================================================
    // 🔁 REFRESH PRICE
    // =====================================================
    if (action === "refresh") {
      const token = await tokenService.resolve(mint);
      const symbol = token?.symbol || "Token";

      const price = await priceService.getPrice(mint);
      const priceStr = price ? `$${price.toFixed(6)}` : "N/A";

      const msg =
        `💰 *${symbol}*\n\n` +
        `• Mint: \`${mint}\`\n` +
        `• Price: *${priceStr}*`;

      try {
        return ctx.editMessageText(msg, {
          parse_mode: "Markdown",
          ...priceKeyboard(mint)
        });
      } catch (err) {
        // fallback to replying if editing fails
        return ctx.reply(msg, {
          parse_mode: "Markdown",
          ...priceKeyboard(mint)
        });
      }
    }

    // =====================================================
    // 📈 CHART DISPLAY / SWITCH TIMEFRAME
    // =====================================================
    if (action === "chart") {
      const tf = timeframe || "1D"; // default 1D

      const chartUrl =
        `${BASE_URL}/defi/price_chart?address=${mint}` +
        `&type=${tf}&width=800&height=500`;

      try {
        const chart = await axios.get(chartUrl, {
          headers: { "X-API-KEY": API_KEY },
          responseType: "arraybuffer"
        });

        const media = { source: Buffer.from(chart.data) };

        return ctx.editMessageMedia(
          { type: "photo", media },
          {
            caption: `📊 *Chart — ${tf}*\nMint: \`${mint}\``,
            parse_mode: "Markdown",
            ...chartKeyboard(mint)
          }
        );
      } catch (err) {
        console.error("Chart callback error:", err.message);
        return ctx.reply("⚠️ Failed to load chart.");
      }
    }

    // =====================================================
    // 🛒 BUY QUICK GUIDE
    // =====================================================
    if (action === "buy") {
      const reply =
        `🛒 *Buy Command Guide*\n\n` +
        `Use:\n` +
        `\`/buy <INPUT_TOKEN> ${mint} <AMOUNT>\`\n\n` +
        `Example:\n\`/buy SOL ${mint} 1\``;

      return ctx.reply(reply, { parse_mode: "Markdown" });
    }

    // =====================================================
    // 📤 SELL QUICK GUIDE
    // =====================================================
    if (action === "sell") {
      const reply =
        `📤 *Sell Command Guide*\n\n` +
        `Use:\n` +
        `\`/sell ${mint} <OUTPUT_TOKEN> <AMOUNT>\`\n\n` +
        `Example:\n\`/sell ${mint} SOL 10000\``;

      return ctx.reply(reply, { parse_mode: "Markdown" });
    }

    // =====================================================
    // UNKNOWN CALLBACK
    // =====================================================
    return ctx.reply("⚠️ Unknown action.");

  } catch (err) {
    console.error("callback error:", err);
    return ctx.reply("⚠️ Callback failed.");
  }
};