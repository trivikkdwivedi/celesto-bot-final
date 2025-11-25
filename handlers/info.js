const tokenService = require("../services/token");
const priceService = require("../services/price");
const axios = require("axios");

async function infoCommand(ctx) {
  try {
    const parts = ctx.message.text.split(/\s+/).slice(1);
    const query = parts.join(" ").trim();

    if (!query) return ctx.reply("ℹ️ Usage: /info <token>");

    const token = await tokenService.resolve(query);

    if (!token) {
      return ctx.reply(`❌ Unknown token: "${query}"`);
    }

    const mint = token.address;
    const symbol = token.symbol || query.toUpperCase();

    // -------------------------
    // PRICE (from Jupiter)
    // -------------------------
    const price = await priceService.getPrice(mint);

    // -------------------------
    // INFO FROM BIRDEYE
    // -------------------------
    let be = null;
    try {
      const r = await axios.get(
        `https://public-api.birdeye.so/defi/token_overview?address=${mint}`,
        {
          headers: {
            "x-chain": "solana",
            "x-api-key": process.env.BIRDEYE_API || "",
          },
          timeout: 5000,
        }
      );
      be = r.data?.data || null;
    } catch (err) {
      console.log("Birdeye error:", err.message);
    }

    const priceStr = price ? `$${price.toFixed(6)}` : "N/A";
    const mcap = be?.market_cap ? `$${be.market_cap.toLocaleString()}` : "N/A";
    const volume = be?.volume_24h ? `$${be.volume_24h.toLocaleString()}` : "N/A";
    const fdv = be?.fdv ? `$${be.fdv.toLocaleString()}` : "N/A";
    const change24 =
      be?.price_change_24h != null
        ? `${be.price_change_24h > 0 ? "🟢" : "🔴"} ${be.price_change_24h.toFixed(2)}%`
        : "N/A";

    const text =
      `📘 *Token Info — ${symbol}*\n\n` +
      `• *Name:* ${token.name || "N/A"}\n` +
      `• *Symbol:* ${symbol}\n` +
      `• *Mint:* \`${mint}\`\n\n` +
      `💰 *Market Data:*\n` +
      `• Price: *${priceStr}*\n` +
      `• 24h Change: *${change24}*\n` +
      `• Market Cap: *${mcap}*\n` +
      `• 24h Volume: *${volume}*\n` +
      `• FDV: *${fdv}*\n\n` +
      `🔗 *Links:*\n` +
      (token.extensions?.website ? `• Website: ${token.extensions.website}\n` : "") +
      (token.extensions?.twitter ? `• Twitter: ${token.extensions.twitter}\n` : "") +
      `• Solscan: https://solscan.io/token/${mint}\n`;

    return ctx.reply(text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("info error:", err);
    return ctx.reply("⚠️ Failed to fetch token info.");
  }
}

module.exports = infoCommand;
  
