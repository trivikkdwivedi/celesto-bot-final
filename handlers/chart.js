// handlers/chart.js
const axios = require("axios");
const tokenService = require("../services/token");
const { Markup } = require("telegraf");

const API_KEY = process.env.BIRDEYE_API_KEY;
const BASE_URL = "https://public-api.birdeye.so";

async function chartCommand(ctx) {
  try {
    const parts = ctx.message.text.split(/\s+/).slice(1);
    const query = parts.join(" ");

    if (!query) {
      return ctx.reply("📈 Usage: /chart <token>");
    }

    const token = await tokenService.resolve(query);
    if (!token) {
      return ctx.reply(`❌ Token not found: ${query}`);
    }

    const mint = token.address;

    // generate chart image from Birdeye
    const chartUrl = `${BASE_URL}/defi/price_chart?address=${mint}&type=1D&width=800&height=500`;

    // download chart
    const chart = await axios.get(chartUrl, {
      headers: { "X-API-KEY": API_KEY },
      responseType: "arraybuffer",
    });

    return ctx.replyWithPhoto({ source: Buffer.from(chart.data) }, {
      caption: `📊 *${token.symbol} Price Chart*\nMint: \`${mint}\``,
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("1H", `chart|${mint}|1H`),
          Markup.button.callback("4H", `chart|${mint}|4H`),
          Markup.button.callback("1D", `chart|${mint}|1D`),
          Markup.button.callback("7D", `chart|${mint}|7D`),
        ]
      ])
    });

  } catch (err) {
    console.error("chart error:", err.message);
    return ctx.reply("⚠️ Failed to load chart.");
  }
}

module.exports = chartCommand;