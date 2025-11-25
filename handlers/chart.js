// handlers/chart.js — show chart image (Birdeye) with timeframe buttons
const axios = require("axios");
const tokenService = require("../services/token");
const { Markup } = require("telegraf");

const API_KEY = process.env.BIRDEYE_API_KEY;
const BASE = process.env.BIRDEYE_BASE_URL || "https://public-api.birdeye.so";

function chartKeyboard(mint) {
  return Markup.inlineKeyboard([
    [ Markup.button.callback("1H", `chart|${mint}|1H`), Markup.button.callback("4H", `chart|${mint}|4H`), Markup.button.callback("1D", `chart|${mint}|1D`), Markup.button.callback("7D", `chart|${mint}|7D`) ]
  ]);
}

module.exports = async function chartCommand(ctx) {
  try {
    const q = ctx.message?.text?.split(/\s+/).slice(1).join(" ");
    if (!q) return ctx.reply("📈 Usage: /chart <token>");
    const token = await tokenService.resolve(q);
    if (!token) return ctx.reply(`❌ Token not found: ${q}`);
    const mint = token.address;
    const chartUrl = `${BASE}/defi/price_chart?address=${encodeURIComponent(mint)}&type=1D&width=800&height=500`;
    const r = await axios.get(chartUrl, { headers: { "X-API-KEY": API_KEY }, responseType: "arraybuffer", timeout: 10000 });
    return ctx.replyWithPhoto({ source: Buffer.from(r.data) }, { caption: `📊 *${token.symbol || token.name} Price Chart*\nMint: \`${mint}\``, parse_mode: "Markdown", ...chartKeyboard(mint) });
  } catch (err) {
    console.error("chartCommand error:", err.message);
    return ctx.reply("⚠️ Failed to load chart.");
  }
};