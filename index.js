// ================================
// CELSTO BOT - FINAL INDEX.JS
// WITH FLOATING QUICK ACTION MENU
// ================================

require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

// Services
const dbService = require("./services/db");
const walletService = require("./services/wallet");
const priceHandler = require("./handlers/price");
const buyHandler = require("./handlers/buy");
const sellHandler = require("./handlers/sell");
const infoHandler = require("./handlers/info");
const chartHandler = require("./handlers/chart");

// ENV
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN) throw new Error("❌ Missing TELEGRAM_BOT_TOKEN");
if (!WEBHOOK_URL) throw new Error("❌ Missing WEBHOOK_URL");

const bot = new Telegraf(BOT_TOKEN);

// =========================
// INITIALIZE SERVICES
// =========================
async function startApp() {
  try {
    await dbService.init({
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY,
    });

    await walletService.init({
      supabase: dbService.supabase,
      encryptionKey: ENCRYPTION_KEY,
      solanaRpc: SOLANA_RPC,
    });

    console.log("Supabase initialized");
    console.log("Services initialized");

    // ====================================
    // TELEGRAM COMMAND SHORTCUTS
    // ====================================
    await bot.telegram.setMyCommands([
      { command: "menu", description: "Open Quick Actions" },
      { command: "price", description: "Get token price" },
      { command: "chart", description: "View chart" },
      { command: "info", description: "Token details" },
      { command: "buy", description: "Swap tokens (Buy)" },
      { command: "sell", description: "Swap tokens (Sell)" },
      { command: "createwallet", description: "Create wallet" },
      { command: "mywallet", description: "Show wallet" },
      { command: "balance", description: "Show balance" }
    ]);

    // ====================================
    // /start
    // ====================================
    bot.start((ctx) => {
      const name = ctx.from?.first_name || ctx.from?.username || "User";
      ctx.reply(
        `👋 Welcome ${name}!\nUse /menu to open quick actions.`,
      );
    });

    // ====================================
    // WALLET COMMANDS
    // ====================================
    bot.command("createwallet", async (ctx) => {
      try {
        const telegramId = String(ctx.from.id);
        const existing = await walletService.getWallet(telegramId);

        if (existing) {
          return ctx.reply(
            `⚠️ You already have a wallet:\n\`${existing.publicKey}\``,
            { parse_mode: "Markdown" }
          );
        }

        const created = await walletService.createWallet({ ownerId: telegramId });

        return ctx.reply(
          `✅ Wallet created!\n\n🔑 Public key:\n\`${created.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        ctx.reply("❌ Failed to create wallet.");
      }
    });

    bot.command("mywallet", async (ctx) => {
      try {
        const w = await walletService.getWallet(String(ctx.from.id));
        if (!w) return ctx.reply("❌ No wallet found. Use /createwallet.");

        ctx.reply(`🔑 Your wallet:\n\`${w.publicKey}\``, {
          parse_mode: "Markdown",
        });
      } catch (err) {
        ctx.reply("❌ Failed to fetch wallet.");
      }
    });

    bot.command("balance", async (ctx) => {
      try {
        const w = await walletService.getWallet(String(ctx.from.id));
        if (!w) return ctx.reply("❌ No wallet. Use /createwallet.");

        const sol = await walletService.getSolBalance(w.publicKey);
        ctx.reply(`💰 **${sol.toFixed(6)} SOL**`, { parse_mode: "Markdown" });
      } catch (err) {
        ctx.reply("❌ Failed to get balance.");
      }
    });

    // ====================================
    // MAIN FEATURES
    // ====================================
    bot.command("price", priceHandler);
    bot.command("chart", chartHandler);
    bot.command("info", infoHandler);
    bot.command("buy", buyHandler);
    bot.command("sell", sellHandler);

    // ====================================
    // FLOATING QUICK ACTION MENU (STYLE C)
    // ====================================
    bot.command("menu", (ctx) => {
      return ctx.reply(
        "✨ *Quick Actions Menu*\nChoose what you want:",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "💰 Price", callback_data: "price_menu" },
                { text: "📊 Chart", callback_data: "chart_menu" }
              ],
              [
                { text: "ℹ️ Info", callback_data: "info_menu" }
              ],
              [
                { text: "🔄 Buy", callback_data: "buy_menu" },
                { text: "🔁 Sell", callback_data: "sell_menu" }
              ],
              [
                { text: "👛 Create Wallet", callback_data: "create_wallet_menu" }
              ],
              [
                { text: "🪪 My Wallet", callback_data: "mywallet_menu" },
                { text: "💼 Balance", callback_data: "balance_menu" }
              ]
            ]
          }
        }
      );
    });

    // ====================================
    // CALLBACKS
    // ====================================
    bot.action("price_menu", (ctx) => {
      ctx.answerCbQuery();
      ctx.reply("💰 Send: `price <token>`", { parse_mode: "Markdown" });
    });

    bot.action("chart_menu", (ctx) => {
      ctx.answerCbQuery();
      ctx.reply("📊 Send: `chart <token>`");
    });

    bot.action("info_menu", (ctx) => {
      ctx.answerCbQuery();
      ctx.reply("ℹ️ Send: `info <token>`");
    });

    bot.action("buy_menu", (ctx) => {
      ctx.answerCbQuery();
      ctx.reply("🔄 `/buy <input> <output> <amount>`", { parse_mode: "Markdown" });
    });

    bot.action("sell_menu", (ctx) => {
      ctx.answerCbQuery();
      ctx.reply("🔁 `/sell <input> <output> <amount>`", { parse_mode: "Markdown" });
    });

    bot.action("create_wallet_menu", (ctx) => {
      ctx.answerCbQuery();
      ctx.reply("👛 Use `/createwallet`");
    });

    bot.action("mywallet_menu", (ctx) => {
      ctx.answerCbQuery();
      ctx.reply("🪪 Use `/mywallet`");
    });

    bot.action("balance_menu", (ctx) => {
      ctx.answerCbQuery();
      ctx.reply("💼 Use `/balance`");
    });

    // ====================================
    // WEBHOOK MODE (RAILWAY)
    // ====================================
    const app = express();
    app.use(express.json());

    await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

    app.post("/bot", (req, res) => {
      bot.handleUpdate(req.body);
      res.sendStatus(200);
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`🚀 Webhook server running on port ${PORT}`);
      console.log(`Webhook URL: ${WEBHOOK_URL}/bot`);
    });

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();