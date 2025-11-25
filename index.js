require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

// Services
const dbService = require("./services/db");
const walletService = require("./services/wallet");

// Handlers
const priceHandler = require("./handlers/price");
const chartHandler = require("./handlers/chart");
const infoHandler = require("./handlers/info");
const buyHandler = require("./handlers/buy");
const sellHandler = require("./handlers/sell");

// ENV
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
    console.log("Services initialized");

    // ────────────────────────────────
    // COMMANDS
    // ────────────────────────────────

    bot.start(async (ctx) => {
      const name = ctx.from?.first_name || "User";
      ctx.reply(`👋 Welcome ${name}!\n\nUse /help to see available commands.`);
    });

    bot.command("help", (ctx) => {
      ctx.reply(
`📘 *Available Commands*

/createwallet – Create a new wallet  
/mywallet – Show your wallet  
/balance – Show your SOL balance  
/price <token> – Token price  
/chart <token> – Token chart image  
/info <token> – Token info (name, symbol, price, liquidity)  
/buy <input> <output> <amount> – Swap tokens  
/sell <input> <output> <amount> – Reverse swap

All powered by *Jupiter* + *Birdeye*.`,
        { parse_mode: "Markdown" }
      );
    });

    // Wallet commands
    bot.command("createwallet", walletService.handleCreateWallet);
    bot.command("mywallet", walletService.handleMyWallet);
    bot.command("balance", walletService.handleBalance);

    // Market commands
    bot.command("price", priceHandler);
    bot.command("chart", chartHandler);
    bot.command("info", infoHandler);

    // Swap commands
    bot.command("buy", buyHandler);
    bot.command("sell", sellHandler);

    // ────────────────────────────────
    // WEBHOOK (Railway)
    // ────────────────────────────────
    const app = express();
    app.use(express.json());

    await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

    app.post("/bot", (req, res) => {
      bot.handleUpdate(req.body);
      res.sendStatus(200);
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () =>
      console.log(`🚀 Webhook server running on port ${PORT}`)
    );

    console.log("Webhook set! Bot is running.");

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();