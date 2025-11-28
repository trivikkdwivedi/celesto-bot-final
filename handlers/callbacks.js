const priceService = require("../services/price");
const tokenService = require("../services/token");
const axios = require("axios");
const { Markup } = require("telegraf");

const BIRDEYE_INFO_URL = "https://public-api.birdeye.so/defi/metadata?address=";
const BIRDEYE_OHLCV_URL =
  "https://public-api.birdeye.so/defi/ohlcv?type=1H&limit=24";

/**
 * Draw mini chart for refresh events
 */
function miniChart(values) {
  if (!values || values.length === 0) return "No chart";
  const max = Math.max(...values);
  const min = Math.min(...values);
  return values
    .map((v) => {
      const h = Math.round(((v - min) / (max - min || 1)) * 8) + 1;
      return "▇".repeat(h);
    })
    .join("\n");
}

module.exports = async function callbackHandler(ctx) {
  try {
    const data = ctx.callbackQuery.data;
    const [action, mint] = data.split("|");

    if (!mint) {
      return ctx.answerCbQuery("Invalid request.");
    }

    // -----------------------------------------------------
    // PRICE REFRESH
    // -----------------------------------------------------
    if (action === "price_refresh") {
      const price = await priceService.getPrice(mint);

      const text = `
💰 *Price Refreshed*

🪪 Mint:
\`${mint}\`

💵 Price: *$${price ? price.toFixed(6) : "N/A"}*
`;

      return ctx.editMessageText(text.trim(), {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("📊 Chart", `chart|${mint}`),
            Markup.button.callback("ℹ️ Info", `info_refresh|${mint}`)
          ],
          [Markup.button.callback("🔁 Refresh", `price_refresh|${mint}`)]
        ])
      });
    }

    // -----------------------------------------------------
    // INFO REFRESH
    // -----------------------------------------------------
    if (action === "info_refresh") {
      const info = await axios
        .get(`${BIRDEYE_INFO_URL}${mint}`, {
          headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY }
        })
        .then((r) => r.data?.data)
        .catch(() => null);

      if (!info) {
        return ctx.answerCbQuery("Failed to refresh info.");
      }

      const price = await priceService.getPrice(mint);
      const text = `
ℹ️ *Token Info (Refreshed)*

🪪 Mint:
\`${mint}\`

💵 Price: *$${price ? price.toFixed(6) : "N/A"}*
📊 Market Cap: ${info.mc ? `$${info.mc.toLocaleString()}` : "N/A"}
💧 Liquidity: ${info.liquidity ? `$${info.liquidity.toLocaleString()}` : "N/A"}
📈 24h Change: ${info.change24h ? info.change24h.toFixed(2) + "%" : "N/A"}
📊 Volume 24h: ${
        info.v24h ? `$${info.v24h.toLocaleString()}` : "N/A"
      }
`;

      return ctx.editMessageText(text.trim(), {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("📊 Chart", `chart|${mint}`),
            Markup.button.callback("💲 Price", `price_refresh|${mint}`)
          ],
          [Markup.button.callback("🔁 Refresh Info", `info_refresh|${mint}`)]
        ])
      });
    }

    // -----------------------------------------------------
    // CHART REFRESH
    // -----------------------------------------------------
    if (action === "chart_refresh") {
      const candles = await axios
        .get(`${BIRDEYE_OHLCV_URL}&address=${mint}`, {
          headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY }
        })
        .then((r) => r.data?.data?.items)
        .catch(() => null);

      if (!candles) {
        return ctx.answerCbQuery("Failed to refresh chart.");
      }

      const closes = candles.map((c) => Number(c.close));
      const chartText = miniChart(closes);

      const text = `
📊 *Chart (Refreshed)*

${chartText}

🪪 Mint:
\`${mint}\`
`;

      return ctx.editMessageText(text.trim(), {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("ℹ️ Info", `info_refresh|${mint}`),
            Markup.button.callback("💲 Price", `price_refresh|${mint}`)
          ],
          [Markup.button.callback("🔁 Refresh Chart", `chart_refresh|${mint}`)]
        ])
      });
    }

    // -----------------------------------------------------
    // BUY / SELL (stubs)
    // -----------------------------------------------------
    if (action === "buy") {
      return ctx.answerCbQuery("Buy module coming soon.");
    }

    if (action === "sell") {
      return ctx.answerCbQuery("Sell module coming soon.");
    }

    return ctx.answerCbQuery("Unknown action.");
  } catch (err) {
    console.error("Callback error:", err);
    return ctx.answerCbQuery("Unexpected error.");
  }
};