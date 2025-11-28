const axios = require("axios");
const tokenService = require("../services/token");
const { Markup } = require("telegraf");

const BIRDEYE_OHLCV_URL =
  "https://public-api.birdeye.so/defi/ohlcv?type=1H&limit=24";

/**
 * Convert candle closes into a text mini-chart
 */
function drawMiniChart(values) {
  if (!values || values.length === 0) return "No chart data.";

  const max = Math.max(...values);
  const min = Math.min(...values);

  return values
    .map((v) => {
      const height = Math.round(((v - min) / (max - min || 1)) * 8) + 1;
      return "▇".repeat(height);
    })
    .join("\n");
}

module.exports = async function chartCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1);
    if (!parts || parts.length === 0) {
      return ctx.reply("📊 Usage: /chart <token>");
    }

    const query = parts.join(" ").trim();

    // Resolve symbol/name/CA → mint
    const token = await tokenService.resolve(query);
    if (!token || !token.address) {
      return ctx.reply(`❌ Unknown token: "${query}"`);
    }

    const mint = token.address;
    const symbol = token.symbol || query.toUpperCase();

    // Fetch Birdeye OHLCV data
    const url = `${BIRDEYE_OHLCV_URL}&address=${mint}`;

    let candles;
    try {
      const res = await axios.get(url, {
        headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY },
      });
      candles = res.data?.data?.items || [];
    } catch (err) {
      console.error("OHLCV error:", err.message);
      return ctx.reply("⚠️ Failed to load chart data.");
    }

    if (!candles.length) {
      return ctx.reply("⚠️ No chart data available.");
    }

    const closes = candles.map((c) => Number(c.close));

    // Draw text chart
    const chartText = drawMiniChart(closes);

    const text = `
📊 *${symbol} — 24H Mini Chart*

${chartText}

🪪 Mint:
\`${mint}\`
`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("ℹ️ Info", `info_refresh|${mint}`),
        Markup.button.callback("💲 Price", `price_refresh|${mint}`)
      ],
      [
        Markup.button.callback("🔁 Refresh Chart", `chart_refresh|${mint}`)
      ]
    ]);

    return ctx.reply(text.trim(), {
      parse_mode: "Markdown",
      ...keyboard,
    });

  } catch (err) {
    console.error("/chart error:", err);
    return ctx.reply("⚠️ Failed to load chart.");
  }
};