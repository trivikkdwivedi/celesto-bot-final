// handlers/callbacks.js — handle Buy / Sell / Refresh callback_data
const { Markup } = require("telegraf");
const tokenService = require("../services/token");
const priceService = require("../services/price");

function buildKeyboard(mint, token) {
  const chartUrl =
    mint && mint !== "SOL"
      ? `https://solscan.io/token/${mint}`
      : `https://solscan.io/`;
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🔁 Refresh", `refresh|${mint}`),
      Markup.button.callback("🛒 Buy", `buy|${mint}`),
      Markup.button.callback("📤 Sell", `sell|${mint}`)
    ],
    [Markup.button.url("📈 Chart", chartUrl)]
  ]);
}

module.exports = async (ctx) => {
  try {
    const payload = ctx.callbackQuery?.data;
    if (!payload) {
      await ctx.answerCbQuery();
      return;
    }

    await ctx.answerCbQuery(); // acknowledge quickly to remove loading

    const [action, mintRaw] = payload.split("|");
    const mint = mintRaw || "";

    // Resolve token for nicer labels where possible
    const token = await tokenService.getByMint(mint).catch(() => null);
    const symbol = token?.symbol || (mint === "SOL" ? "SOL" : mint);

    if (action === "refresh") {
      // fetch latest price and edit the message text in place
      const price = await priceService.getPrice(mint, token);
      const priceStr = price ? `$${Number(price).toFixed(6)}` : "N/A";

      const text =
        `💰 *${(symbol || mint).toString().toUpperCase()}*\n\n` +
        `• *Mint:* \`${mint}\`\n` +
        `• *Price:* **${priceStr}**\n`;

      try {
        // edit original message if possible
        if (ctx.callbackQuery.message) {
          await ctx.editMessageText(text, {
            parse_mode: "Markdown",
            ...buildKeyboard(mint, token)
          });
        } else {
          await ctx.reply(text, { parse_mode: "Markdown", ...buildKeyboard(mint, token) });
        }
      } catch (err) {
        // fallback to replying if editing fails
        await ctx.reply(text, { parse_mode: "Markdown", ...buildKeyboard(mint, token) });
      }
      return;
    }

    if (action === "buy") {
      // lightweight path — guide user to /buy with prefilled args
      // Users will run the /buy command; you can enhance this to a full swap flow later.
      const reply = `🛒 To buy *${symbol}*:\n` +
        `Use the command:\n` +
        `\`/buy ${mint} <YOUR_INPUT_TOKEN_MINT_OR_SYMBOL> <AMOUNT>\`\n\n` +
        `Example: \`/buy SOL ${mint} 0.1\``;
      await ctx.reply(reply, { parse_mode: "Markdown" });
      return;
    }

    if (action === "sell") {
      const reply = `📤 To sell *${symbol}*:\n` +
        `Use the command:\n` +
        `\`/sell ${mint} <YOUR_OUTPUT_TOKEN_MINT_OR_SYMBOL> <AMOUNT>\`\n\n` +
        `Example: \`/sell ${mint} SOL 1\``;
      await ctx.reply(reply, { parse_mode: "Markdown" });
      return;
    }

    // unknown action
    await ctx.reply("⚠️ Unknown action");
  } catch (err) {
    console.error("callback handler error:", err);
    try { await ctx.answerCbQuery("Handler error"); } catch(e){/*ignore*/ }
  }
};
