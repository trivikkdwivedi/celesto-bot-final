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

// ENV variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN) {
  console.error("❌ Missing TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error("❌ Missing WEBHOOK_URL");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

/**
 * Start the application
 */
async function startApp() {
  try {
    // Initialize Supabase
    await dbService.init({
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY,
    });

    // Initialize wallet service
    await walletService.init({
      supabase: dbService.supabase,
      encryptionKey: ENCRYPTION_KEY,
      solanaRpc: SOLANA_RPC,
    });

    console.log("Supabase initialized");
    console.log("Services initialized\n");

    // -------------------------
    // COMMANDS
    // -------------------------

    bot.start((ctx) => {
      const name = ctx.from?.first_name || ctx.from?.username || "User";
      ctx.reply(`👋 Welcome ${name}!\n\nUse /help to see all commands.`);
    });

    bot.command("help", (ctx) => {
      ctx.reply(
        `📘 *Available Commands*

/createwallet — Create a secure wallet
/mywallet — Show your wallet public key
/balance — Show your SOL balance

/price <token> — Get token price
/chart <token> — 24h text chart
/info <token> — Token fundamentals

/buy <input> <output> <amount> — Swap (coming soon)
/sell <input> <output> <amount> — Swap (coming soon)
        `,
        { parse_mode: "Markdown" }
      );
    });

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
          `✅ Wallet created!\n\n🔑 *Public Key:*\n\`${w.publicKey}\``,
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

    // Main token tools
    bot.command("price", priceHandler);
    bot.command("chart", chartHandler);
    bot.command("info", infoHandler);

    // Swap stubs
    bot.command("buy", buyHandler);
    bot.command("sell", sellHandler);

    // -------------------------
    // CALLBACK BUTTON HANDLER
    // -------------------------
    bot.on("callback_query", callbackHandler);

    // -------------------------
    // WEBHOOK CONFIG
    // -------------------------

    const app = express();
    app.use(express.json());

    // Telegram webhook URL
    await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

    // Incoming updates
    app.post("/bot", (req, res) => {
      bot.handleUpdate(req.body);
      res.sendStatus(200);
    });

    // Start server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`🚀 Webhook server ready on port ${PORT}`);
      console.log(`Webhook URL: ${WEBHOOK_URL}/bot\n`);
      console.log("Bot is running in webhook mode.");
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();