
const tokenService = require("../services/token");
const chartService = require("../services/chart");
const { InlineKeyboard } = require("telegraf");

async function chartCommand(ctx) {
  try {
    const q = ctx.message?.text?.split(" ").slice(1).join(" ");
    if (!q) return ctx.reply("📉 Usage: /chart <token>");

    const token = await tokenService.resolve(q);
    if (!token) return ctx.reply(`❌ Unknown token: ${q}`);

    const candles = await chartService.getChart(token.address);

    if (!candles) {
      return ctx.reply("⚠️ Failed to load chart.");
    }

    const points = candles.map(c => c.close).slice(-20);
    const miniChart = points.map(p => "▇".repeat(Math.max(1, p / points[0]))).join("\n");

    return ctx.reply(
      `📊 *${token.symbol} — Mini Chart (24H)*\n\n${miniChart}`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().row(
          InlineKeyboard.text("↩ Back", "refresh_price:" + token.address)
        )
      }
    );

  } catch (err) {
    console.log("chartCommand error:", err);
    return ctx.reply("⚠️ Chart failed.");
  }
}

module.exports = chartCommand;