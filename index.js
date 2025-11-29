require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

// Services
const dbService = require("./services/db");
const walletService = require("./services/wallet");

// Handlers
const price = require("./handlers/price");
const infoHandler = require("./handlers/info");
const buyHandler = require("./handlers/buy");
const sellHandler = require("./handlers/sell");
const menuHandler = require("./handlers/menu");
const search = require("./handlers/search");

// ENV
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC;

// Validation
if (!BOT_TOKEN) throw new Error("❌ Missing TELEGRAM_BOT_TOKEN");
if (!WEBHOOK_URL) throw new Error("❌ Missing WEBHOOK_URL");

const bot = new Telegraf(BOT_TOKEN);

async function startApp() {
  // Initialize DB
  await dbService.init({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_ANON_KEY,
  });

  // Init wallet service
  await walletService.init({
    supabase: dbService.supabase,
    encryptionKey: ENCRYPTION_KEY,
    solanaRpc: SOLANA_RPC,
  });

  console.log("Supabase initialized");
  console.log("Services initialized");

  // COMMANDS
  bot.start((ctx) =>
    ctx.reply("👋 Welcome to Celesto Bot! Use /menu to get started.")
  );

  bot.command("menu", menuHandler);

  // NEW: /price prompts for token name
  bot.command("price", price.askPrice);

  // /info command
  bot.command("info", infoHandler);

  // Buy & Sell
  bot.command("buy", buyHandler);
  bot.command("sell", sellHandler);

  /**
   * 🔍 INLINE TOKEN SEARCH (Birdeye)
   * When user types ANYTHING:
   *  1. Search Birdeye
   *  2. If user is in /price mode → handle price input
   */
  bot.on("text", async (ctx, next) => {
    // 1) Birdeye search suggestions
    await search.searchHandler(ctx);

    // 2) /price user response
    await price.handlePriceResponse(ctx);

    return next();
  });

  // User taps a search result button
  bot.action(/select_(.+)/, search.selectedToken);

  // Inline action for price refresh / buy / sell / chart
  bot.action(/refresh_(.+)/, price.handlePriceResponse);
  bot.action(/buy_(.+)/, buyHandler);
  bot.action(/sell_(.+)/, sellHandler);
  bot.action(/chart_(.+)/, (ctx) => ctx.reply("📈 Chart feature coming soon"));

  /**
   * WEBHOOK MODE FOR RAILWAY
   */
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
}

startApp();