const axios = require("axios");
const tokenService = require("../services/token");
const priceService = require("../services/price");

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

// Birdeye endpoint
const BIRDEYE_INFO_API =
  "https://public-api.birdeye.so/defi/metadata?address=";

async function infoCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1);
    if (!parts || parts.length === 0) {
      return ctx.reply("ℹ️ Usage: /info <token>");
    }

    const query = parts.join(" ").trim();

    // Resolve: CA / symbol / name ➝ mint address
    const token = await tokenService.resolve(query);
    if (!token || !token.address) {
      return ctx.reply(`❌ Could not resolve token: "${query}"`);
    }

    const mint = token.address;

    // Get price from your price service (Birdeye-powered)
    const price = await priceService.getPrice(mint);

    // Fetch token metadata from Birdeye
    const res = await axios.get(`${BIRDEYE_INFO_API}${mint}`, {
      headers: { "X-API-KEY": BIRDEYE_API_KEY },
      timeout: 7000,
    });

    const info = res.data?.data;
    if (!info) {
      return ctx.reply("⚠️ Failed to fetch token info.");
    }

    // Safely extract values
    const symbol = info.symbol || token.symbol || "N/A";
    const name = info.name || "N/A";
    const fdv = info.fdv ? `$${Number(info.fdv).toLocaleString()}` : "N/A";
    const liquidity = info.liquidity
      ? `$${Number(info.liquidity).toLocaleString()}`
      : "N/A";

    const mc = info.mc ? `$${Number(info.mc).toLocaleString()}` : "N/A";
    const vol24h = info.v24h
      ? `$${Number(info.v24h).toLocaleString()}`
      : "N/A";

    const change24h =
      info.change24h !== undefined
        ? `${Number(info.change24h).toFixed(2)}%`
        : "N/A";

    const priceTxt = price
      ? `$${Number(price).toFixed(6)}`
      : "N/A";

    const message = `
📊 *${name}*  (${symbol})
────────────────────
🪙 *Mint:* \`${mint}\`

💰 *Price:* ${priceTxt}
📈 *24h Change:* ${change24h}
📊 *Market Cap:* ${mc}
🏦 *FDV:* ${fdv}
💧 *Liquidity:* ${liquidity}
📊 *Volume 24h:* ${vol24h}
`;

    return ctx.reply(message.trim(), {
      parse_mode: "Markdown",
    });

  } catch (err) {
    console.error("/info error:", err);
    return ctx.reply("⚠️ Failed to fetch token info.");
  }
}

module.exports = infoCommand;