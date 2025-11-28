const tokenService = require("../services/token");

module.exports = async function sellCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1);

    if (!parts || parts.length < 3) {
      return ctx.reply(
        "🔻 *Usage:* /sell <input_token> <output_token> <amount>\n\nExample:\n`/sell BONK SOL 10000`",
        { parse_mode: "Markdown" }
      );
    }

    const [inputRaw, outputRaw, amountRaw] = parts;

    const amount = Number(amountRaw);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply("⚠️ Invalid amount.");
    }

    // Resolve tokens
    const input = await tokenService.resolve(inputRaw);
    const output = await tokenService.resolve(outputRaw);

    if (!input || !input.address) {
      return ctx.reply(`❌ Invalid input token: ${inputRaw}`);
    }

    if (!output || !output.address) {
      return ctx.reply(`❌ Invalid output token: ${outputRaw}`);
    }

    return ctx.reply(
      `📤 *Sell Request Preview*\n\n` +
      `Selling: *${input.symbol}* (${input.address})\n` +
      `Receiving: *${output.symbol}* (${output.address})\n` +
      `Amount: *${amount}*\n\n` +
      `⚠️ Swaps not enabled yet. Jupiter integration coming next.`,
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    console.error("/sell error:", err);
    return ctx.reply("⚠️ Failed to process sell request.");
  }
};