// handlers/buy.js
module.exports = async function buyHandler(ctx) {
  try {
    await ctx.reply("🔧 Buy is not yet enabled on this deploy. Coming soon.");
  } catch (err) {
    console.error("buyHandler error:", err);
    await ctx.reply("❌ Buy failed.");
  }
};