// handlers/price.js — polished + inline buttons (Buy / Sell / Refresh / Chart)
const { Markup } = require("telegraf");
const tokenService = require("../services/token");
const priceService = require("../services/price");

function buildKeyboard(mint, token) {
  // Chart button uses Solscan token page (works for most tokens)
  const chartUrl =
    mint && mint !== "SOL"
      ? `https://solscan.io/token/${mint}`
      : `https://solscan.io/`; // fallback for SOL

  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🔁 Refresh", `refresh|${mint}`),
      Markup.button.callback("🛒 Buy", `buy|${mint}`),
      Markup.button.callback("📤 Sell", `sell|${mint}`)
    ],
    [Markup.button.url("📈 Chart", chartUrl)]
  ]);
}

async function priceCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1) || [];
    const rawQuery = parts.join(" ") || "SOL";

    const token = await tokenService.resolve(rawQuery);

    let mint;
    let symbol;
    if (!token) {
      mint = rawQuery.trim();
      symbol = rawQuery.toUpperCase();
    } else {
      mint = token.address;
      symbol = token.symbol || token.name || rawQuery.toUpperCase();
    }

    if (!mint) {
      return ctx.reply(`❌ Could not resolve token: "${rawQuery}"`);
    }

    const price = await priceService.getPrice(mint, token);

    if (price === null) {
      return ctx.reply(
        `⚠️ No reliable market price for:\n• **${symbol}**\n• Mint: \`${mint}\``,
        { parse_mode: "Markdown" }
      );
    }

    const priceStr = `$${Number(price).toFixed(6)}`;

    const text =
      `💰 *${(symbol || rawQuery).toString().toUpperCase()}*\n\n` +
      `• *Mint:* \`${mint}\`\n` +
      `• *Price:* **${priceStr}**\n`;

    // send message with inline keyboard
    return ctx.reply(text, {
      parse_mode: "Markdown",
      ...buildKeyboard(mint, token)
    });
  } catch (err) {
    console.error("priceCommand error:", err);
    return ctx.reply("⚠️ Failed to fetch price. Try again later.");
  }
}

module.exports = priceCommand;