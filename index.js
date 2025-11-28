require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");

// Services
const dbService = require("./services/db");
const walletService = require("./services/wallet");

// Handlers
const priceHandler = require("./handlers/price");
const chartHandler = require("./handlers/chart");
const infoHandler = require("./handlers/info");
const buyHandler = require("./handlers/buy");
const sellHandler = require("./handlers/sell");
const callbackHandler = require("./handlers/callbacks");
const watchHandler = require("./handlers/watchlist");

// ENV
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN missing.");
  process.exit(1);
}
if (!WEBHOOK_URL) {
  console.error("❌ WEBHOOK_URL missing.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

/**
 * START APP
 */
async function startApp() {
  try {
    // Initialize DB
    await dbService.init({
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY,
    });

    // Initialize Wallet system
    await walletService.init({
      supabase: dbService.supabase,
      encryptionKey: ENCRYPTION_KEY,
      solanaRpc: SOLANA_RPC,
    });

    console.log("Supabase initialized");
    console.log("Wallet service initialized");
    console.log("Services initialized");

    // =========================================================
    // COMMANDS
    // =========================================================

    bot.start((ctx) => {
      const name = ctx.from?.first_name || ctx.from?.username || "User";
      ctx.reply(`👋 Welcome ${name}!\n\nUse /help to see commands.`);
    });

    bot.command("help", (ctx) => {
      ctx.reply(
        `📘 *Commands*

/createwallet — Create secure wallet
/mywallet — Show your wallet
/balance — Show your SOL balance

/price <token> — Price
/chart <token> — Chart
/info <token> — Token info

/buy <input> <output> <amount> — Swap
/sell <input> <output> <amount> — Swap

/watch add <token> <above|below> <price>
/watch list
/watch remove <id>

All data powered by Birdeye + Jupiter.
        `,
        { parse_mode: "Markdown" }
      );
    });

    // Wallet Commands
    bot.command("createwallet", async (ctx) => {
      try {
        const userId = String(ctx.from.id);

        const exists = await walletService.getWallet(userId);
        if (exists) {
          return ctx.reply(
            `⚠️ Wallet already exists:\n\`${exists.publicKey}\``,
            { parse_mode: "Markdown" }
          );
        }

        const w = await walletService.createWallet({ ownerId: userId });

        ctx.reply(
          `✅ Wallet created!\n\n🔑 Public Key:\n\`${w.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("createwallet error:", err);
        ctx.reply("❌ Failed to create wallet.");
      }
    });

    bot.command("mywallet", async (ctx) => {
      try {
        const w = await walletService.getWallet(String(ctx.from.id));
        if (!w) return ctx.reply("❌ No wallet found. Use /createwallet");
        ctx.reply(`🔑 Your wallet:\n\`${w.publicKey}\``, {
          parse_mode: "Markdown",
        });
      } catch (err) {
        console.error("mywallet error:", err);
        ctx.reply("❌ Failed to fetch wallet.");
      }
    });

    bot.command("balance", async (ctx) => {
      try {
        const w = await walletService.getWallet(String(ctx.from.id));
        if (!w) return ctx.reply("❌ No wallet found. Use /createwallet");

        const sol = await walletService.getSolBalance(w.publicKey);
        ctx.reply(
          `💰 *SOL Balance:*\n\`${w.publicKey}\`\n\n${sol.toFixed(6)} SOL`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("balance error:", err);
        ctx.reply("❌ Failed to fetch balance.");
      }
    });

    // Main Token Tools
    bot.command("price", priceHandler);
    bot.command("chart", chartHandler);
    bot.command("info", infoHandler);

    // Swaps
    bot.command("buy", buyHandler);
    bot.command("sell", sellHandler);

    // Watchlist
    bot.command("watch", watchHandler);

    // Inline Buttons Handler
    bot.on("callback_query", callbackHandler);

    // =========================================================
    // WEBHOOK MODE
    // =========================================================

    const app = express();
    app.use(express.json());

    // Set Telegram Webhook
    await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

    // Incoming TG Updates
    app.post("/bot", (req, res) => {
      bot.handleUpdate(req.body);
      res.sendStatus(200);
    });

    // Start Express server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`🚀 Webhook server running on port ${PORT}`);
      console.log(`Webhook URL: ${WEBHOOK_URL}/bot`);
    });

    console.log("Bot webhook set. Bot is running.");

    // =========================================================
    // START ALERTS BACKGROUND WORKER
    // =========================================================

    try {
      const alerts = require("./services/alerts");
      alerts.start();
    } catch (err) {
      console.error("Alerts worker failed to start:", err);
    }

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();