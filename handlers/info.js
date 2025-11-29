const tokenService = require("../services/token");
const priceService = require("../services/price");
const axios = require("axios");

async function infoHandler(ctx) {
  try {
    const args = ctx.message.text.split(/\s+/).slice(1);
    const query = args.join(" ");

    if (!query) return ctx.reply("❌ Provide a token.\nExample: /info sol");

    // resolve symbol/name/CA
    const token = await tokenService.resolve(query);
    if (!token || !token.address) {
      return ctx.reply(`❌ Unknown token: "${query}"`);
    }

    // fetch price
    const price = await priceService.getPrice(token.address);

    // fetch extra data from Birdeye
    const url = `https://public-api.birdeye.so/defi/token_overview?address=${token.address}`;
    const res = await axios.get(url, {
      headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY },
    });

    const data = res.data?.data || {};

    const mc = data.mc || 0;
    const vol = data.v24hUSD || 0;
    const change = data.pctChange24h || 0;

    return ctx.reply(
      `📘 <b>${token.symbol} — Token Overview</b>\n\n` +
      `💲 <b>Price</b>: $${(price || 0).toFixed(6)}\n` +
      `💰 <b>Market Cap</b>: $${mc.toLocaleString()}\n` +
      `📈 <b>24h Volume</b>: $${vol.toLocaleString()}\n` +
      `📊 <b>24h Change</b>: ${change > 0 ? "🟢" : "🔴"} ${change}%\n\n` +
      `🧩 <b>CA</b>:\n<code>${token.address}</code>`,
      { parse_mode: "HTML" }
    );

  } catch (err) {
    console.error("infoHandler error:", err);
    return ctx.reply("⚠️ Failed to fetch token info.");
  }
}

module.exports = infoHandler;