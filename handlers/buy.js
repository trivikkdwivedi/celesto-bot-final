// handlers/buy.js — safe simple guide (swap flow can be implemented next)
module.exports = async function buyHandler(ctx) {
  try {
    const text = ctx.message?.text?.split(/\s+/).slice(1) || [];
    if (text.length < 3) {
      return ctx.reply("Usage: /buy <INPUT_TOKEN> <OUTPUT_TOKEN_MINT_OR_SYMBOL> <AMOUNT>\nExample: /buy SOL <mint> 0.1");
    }
    // For now provide guidance. Full swap flow is next phase.
    return ctx.reply("🔧 Swap flow is not enabled in this deploy. Use the Buy button -> command example shown.");
  } catch (err) {
    console.error("buyHandler error:", err);
    return ctx.reply("❌ Buy failed.");
  }
};