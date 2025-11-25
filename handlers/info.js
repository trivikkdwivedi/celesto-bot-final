// handlers/info.js — token overview using Birdeye token_overview
const axios = require("axios");
const tokenService = require("../services/token");
const priceService = require("../services/price");
const { Markup } = require("telegraf");

const API_KEY = process.env.BIRDEYE_API_KEY;
const BASE = process.env.BIRDEYE_BASE_URL || "https://public-api.birdeye.so";

module.exports = async function infoCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1) || [];
    const query = parts.join(" ");
    if (!query) return ctx.reply("ℹ️ Usage: /info <token>");
    const token = await tokenService.resolve(query);
    if (!token || !token.address) return ctx.reply(`❌ Could not find token: ${query}`);
    const mint = token.address;
    const price = await priceService.getPrice(mint);
    const url = `${BASE}/defi/token_overview?address=${encodeURIComponent(mint)}`;
    const res = await axios.get(url, { headers: { "X-API-KEY": API_KEY, accept: "application/json" }, timeout: 8000 });
    const d = res.data?.data || {};
    const mcap = d.marketCap ? `$${d.marketCap.toLocaleString()}` : "N/A";
    const fdv = d.fdv ? `$${d.fdv.toLocaleString()}` : "N/A";
    const liq = d.liquidity ? `$${d.liquidity.toLocaleString()}` : "N/A";
    const vol24 = d.volume24h ? `$${d.volume24h.toLocaleString()}` : "N/A";
    const change24 = (d.priceChange24h !== undefined && d.priceChange24h !== null) ? `${d.priceChange24h.toFixed(2)}%` : "N/A";
    const msg =
      `📊 *${token.name || token.symbol} (${token.symbol})*\n\n` +
      `📌 *Mint:* \`${mint}\`\n\n` +
      `💵 *Price:* ${price ? `$${price.toFixed(6)}` : "N/A"}\n` +
      `💰 *Market Cap:* ${mcap}\n` +
      `🏦 *FDV:* ${fdv}\n` +
      `🧪 *Liquidity:* ${liq}\n` +
      `📈 *24h Volume:* ${vol24}\n` +
      `📉 *24h Change:* ${change24}\n\n` +
      `🔗 *Links:*\n` +
      `[Birdeye](https://birdeye.so/token/${mint}?chain=solana) | [DexScreener](https://dexscreener.com/solana/${mint})`;
    return ctx.reply(msg, { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("📈 Chart", `chart|${mint}|1D`)],[Markup.button.callback("🔁 Refresh Info", `info_refresh|${mint}`)]]) });
  } catch (err) {
    console.error("infoCommand error:", err.message);
    return ctx.reply("⚠️ Failed to load token info.");
  }
};