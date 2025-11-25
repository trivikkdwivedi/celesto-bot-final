// handlers/callbacks.js — handles Refresh/Buy/Sell/Chart/info_refresh
const axios = require("axios");
const priceService = require("../services/price");
const tokenService = require("../services/token");
const { Markup } = require("telegraf");

const API_KEY = process.env.BIRDEYE_API_KEY;
const BASE = process.env.BIRDEYE_BASE_URL || "https://public-api.birdeye.so";

function priceKeyboard(mint) {
  return Markup.inlineKeyboard([
    [ Markup.button.callback("🔁 Refresh", `refresh|${mint}`), Markup.button.callback("🛒 Buy", `buy|${mint}`), Markup.button.callback("📤 Sell", `sell|${mint}`) ],
    [ Markup.button.callback("📈 Chart", `chart|${mint}|1D`) ]
  ]);
}
function chartKeyboard(mint) {
  return Markup.inlineKeyboard([[ Markup.button.callback("1H", `chart|${mint}|1H`), Markup.button.callback("4H", `chart|${mint}|4H`), Markup.button.callback("1D", `chart|${mint}|1D`), Markup.button.callback("7D", `chart|${mint}|7D`) ]]);
}

module.exports = async function callbackHandler(ctx) {
  try {
    const data = ctx.callbackQuery?.data;
    if (!data) return ctx.answerCbQuery();
    const parts = data.split("|");
    const action = parts[0];
    const mint = parts[1];
    const timeframe = parts[2];
    await ctx.answerCbQuery();

    if (action === "refresh") {
      const token = await tokenService.getByMint(mint) || await tokenService.resolve(mint);
      const symbol = token?.symbol || "Token";
      const price = await priceService.getPrice(mint);
      const msg = `💰 *${symbol}*\n\n• Mint: \`${mint}\`\n• Price: *${price ? `$${price.toFixed(6)}` : "N/A"}*`;
      try { return ctx.editMessageText(msg, { parse_mode: "Markdown", ...priceKeyboard(mint) }); } catch (e) { return ctx.reply(msg, { parse_mode: "Markdown", ...priceKeyboard(mint) }); }
    }

    if (action === "chart") {
      const tf = timeframe || "1D";
      const chartUrl = `${BASE}/defi/price_chart?address=${encodeURIComponent(mint)}&type=${tf}&width=800&height=500`;
      try {
        const chart = await axios.get(chartUrl, { headers: { "X-API-KEY": API_KEY }, responseType: "arraybuffer", timeout: 10000 });
        const media = { source: Buffer.from(chart.data) };
        // edit existing message media if possible
        try {
          return ctx.editMessageMedia({ type: "photo", media }, { caption: `📊 *Chart — ${tf}*\nMint: \`${mint}\``, parse_mode: "Markdown", ...chartKeyboard(mint) });
        } catch (e) {
          return ctx.replyWithPhoto(media, { caption: `📊 *Chart — ${tf}*\nMint: \`${mint}\``, parse_mode: "Markdown", ...chartKeyboard(mint) });
        }
      } catch (err) {
        console.error("Chart callback error:", err.message);
        return ctx.reply("⚠️ Failed to load chart.");
      }
    }

    if (action === "buy") {
      const token = await tokenService.getByMint(mint) || await tokenService.resolve(mint);
      const symbol = token?.symbol || mint;
      const reply = `🛒 To buy *${symbol}*:\nUse: \`/buy <INPUT_TOKEN> ${mint} <AMOUNT>\`\nExample: \`/buy SOL ${mint} 0.1\``;
      return ctx.reply(reply, { parse_mode: "Markdown" });
    }

    if (action === "sell") {
      const token = await tokenService.getByMint(mint) || await tokenService.resolve(mint);
      const symbol = token?.symbol || mint;
      const reply = `📤 To sell *${symbol}*:\nUse: \`/sell ${mint} <OUTPUT_TOKEN> <AMOUNT>\`\nExample: \`/sell ${mint} SOL 1\``;
      return ctx.reply(reply, { parse_mode: "Markdown" });
    }

    if (action === "info_refresh") {
      try {
        const token = await tokenService.getByMint(mint) || await tokenService.resolve(mint);
        const price = await priceService.getPrice(mint);
        const url = `${BASE}/defi/token_overview?address=${encodeURIComponent(mint)}`;
        const res = await axios.get(url, { headers: { "X-API-KEY": API_KEY }, timeout: 8000 });
        const d = res.data?.data || {};
        const msg =
          `📊 *${token?.name || token?.symbol} (${token?.symbol})*\n\n` +
          `📌 *Mint:* \`${mint}\`\n\n` +
          `💵 *Price:* ${price ? `$${price.toFixed(6)}` : "N/A"}\n` +
          `💰 *Market Cap:* ${d.marketCap ? `$${d.marketCap.toLocaleString()}` : "N/A"}\n` +
          `🏦 *FDV:* ${d.fdv ? `$${d.fdv.toLocaleString()}` : "N/A"}\n` +
          `🧪 *Liquidity:* ${d.liquidity ? `$${d.liquidity.toLocaleString()}` : "N/A"}\n` +
          `📈 *24h Volume:* ${d.volume24h ? `$${d.volume24h.toLocaleString()}` : "N/A"}\n` +
          `📉 *24h Change:* ${d.priceChange24h ? d.priceChange24h.toFixed(2) + "%" : "N/A"}`;
        return ctx.editMessageText(msg, { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("📈 Chart", `chart|${mint}|1D`)],[Markup.button.callback("🔁 Refresh Info", `info_refresh|${mint}`)]]) });
      } catch (err) {
        console.error("info_refresh error:", err.message);
        return ctx.reply("⚠️ Failed to refresh info.");
      }
    }

    return ctx.reply("⚠️ Unknown action.");
  } catch (err) {
    console.error("callback error:", err);
    try { await ctx.answerCbQuery("Handler error"); } catch {}
    return;
  }
};