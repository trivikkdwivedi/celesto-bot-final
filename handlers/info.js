const axios = require("axios");
const tokenService = require("../services/token");
const priceService = require("../services/price");
const { Markup } = require("telegraf");

const BIRDEYE_INFO_URL =
  "https://public-api.birdeye.so/defi/metadata?address=";

module.exports = async function infoCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1);
    if (!parts || parts.length === 0) {
      return ctx.reply("ℹ️ Usage: /info <token>");
    }

    const query = parts.join(" ").trim();

    // Resolve input → token metadata
    const token = await tokenService.resolve(query);
    if (!token || !token.address) {
      return ctx.reply(`❌ Unknown token: "${query}"`);
    }

    const mint = token.address;
    const symbol = token.symbol || query.toUpperCase();

    // Fetch Birdeye metadata
    let info;
    try {
      const res = await axios.get(BIRDEYE_INFO_URL + mint, {
        headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY },
      });
      info = res.data?.data;
    } catch (err) {
      console.error("Birdeye info error:", err.message);
      return ctx.reply("⚠️ Failed to load token info.");
    }

    if (!info) {
      return ctx.reply("⚠️ No info available for this token.");
    }

    const price = await priceService.getPrice(mint);

    const text = `
ℹ️ *${info.name || symbol} Token Info*

🪪 Mint:
\`${mint}\`

💵 *Price:*      $${price ? price.toFixed(6) : "N/A"}
📈 *24h Change:* ${info.change24h ? info.change24h.toFixed(2) + "%" : "N/A"}
📊 *Market Cap:* ${info.mc ? "$" + info.mc.toLocaleString() : "N/A"}
💧 *Liquidity:*  ${info.liquidity ? "$" + info.liquidity.toLocaleString() : "N/A"}
📦 *Volume 24h:* ${info.v24h ? "$" + info.v24h.toLocaleString() : "N/A"}

🧩 *Symbol:* ${symbol}
🔤 *Name:*   ${info.name || "N/A"}

🌍 *Website:* ${info.website || "N/A"}
🐦 *Twitter:* ${info.twitter || "N/A"}
📄 *Description:*
${info.description?.slice(0, 200) || "No description available."}
`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("💲 Price", `price_refresh|${mint}`),
        Markup.button.callback("📊 Chart", `chart_refresh|${mint}`),
      ],
      [Markup.button.callback("🔁 Refresh Info", `info_refresh|${mint}`)],
    ]);

    return ctx.reply(text.trim(), {
      parse_mode: "Markdown",
      ...keyboard,
    });
  } catch (err) {
    console.error("/info error:", err);
    return ctx.reply("⚠️ Failed to load token info.");
  }
};