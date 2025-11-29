const { Markup } = require("telegraf");

module.exports = async (ctx) => {
  return ctx.reply(
    "📍 *Main Menu*",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "💰 Price", callback_data: "menu_price" },
            { text: "📘 Info", callback_data: "menu_info" }
          ],
          [
            { text: "🧩 Create Wallet", callback_data: "menu_createwallet" }
          ],
          [
            { text: "🔑 My Wallet", callback_data: "menu_mywallet" }
          ],
          [
            { text: "💵 Balance", callback_data: "menu_balance" }
          ]
        ]
      }
    }
  );
};