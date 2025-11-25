// handlers/sell.js — safe simple guide
module.exports = async function sellHandler(ctx) {
  try {
    const text = ctx.message?.text?.split(/\s+/).slice(1) || [];
    if (text.length < 3) {
      return ctx.reply("Usage: /sell <INPUT_TOKEN_MINT_OR_SYMBOL> <OUTPUT_TOKEN> <AMOUNT>");
    }
    return ctx.reply("🔧 Sell flow is not enabled in this deploy. Use Sell button -> command example shown.");
  } catch (err) {
    console.error("sellHandler error:", err);
    return ctx.reply("❌ Sell failed.");
  }
};