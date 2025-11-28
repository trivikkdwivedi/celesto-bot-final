const tokenService = require("../services/token");
const priceService = require("../services/price");
const { Markup } = require("telegraf");

module.exports = async function priceCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1);
    if (!parts || parts.length === 0) {
      return ctx.reply("💲 Usage: /price <token>");
    }

    const query = parts.join(" ").trim();

    // Resolve symbol / name / CA → mint
    const token = await tokenService.resolve(query);
    if (!token || !token.address) {
      return ctx.reply(`❌ Unknown token: "${query}"`);
    }

    const mint = token.address;
    const symbol = token.symbol || query.toUpperCase();

    // Fetch price
    const price = await priceService.getPrice(mint);
    if (!price) {
      return ctx.reply(`⚠️ No price available for *${symbol}*`, {
        parse_mode: "Markdown",
      });
    }

    // UI
    const text = `
💰 *${symbol} Price*

🪪 Mint:
\`${mint}\`

💵 Price: *$${Number(price).toFixed(6)}*
`;

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback("📊 Chart", `chart|${mint}|1H`),
        Markup.button.callback("ℹ️ Info", `info_refresh|${mint}`)
      ],
      [
        Markup.button.callback("🔁 Refresh", `price_refresh|${mint}`)
      ]
    ]);

    return ctx.reply(text.trim(), {
      parse_mode: "Markdown",
      ...buttons,
    });

  } catch (err) {
    console.error("/price error:", err);
    return ctx.reply("⚠️ Failed to fetch price. Try again later.");
  }
};