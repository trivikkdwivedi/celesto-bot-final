// handlers/sell.js
module.exports = async function sellHandler(ctx) {
  try {
    await ctx.reply("🔧 Sell is not yet enabled on this deploy. Coming soon.");
  } catch (err) {
    console.error("sellHandler error:", err);
    await ctx.reply("❌ Sell failed.");
  }
};