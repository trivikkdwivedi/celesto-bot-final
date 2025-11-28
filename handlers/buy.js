const tokenService = require("../services/token");

module.exports = async function buyCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1);

    if (!parts || parts.length < 3) {
      return ctx.reply(
        "🟢 *Usage:* /buy <input_token> <output_token> <amount>\n\nExample:\n`/buy SOL USDC 0.5`",
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
      `🛒 *Swap Request Preview*\n\n` +
      `Input: *${input.symbol}* (${input.address})\n` +
      `Output: *${output.symbol}* (${output.address})\n` +
      `Amount: *${amount}*\n\n` +
      `⚠️ Swaps are not enabled yet. Jupiter integration will be added.`,
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    console.error("/buy error:", err);
    return ctx.reply("⚠️ Failed to process buy request.");
  }
};