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

// Track states
const waitingFor = {}; // { userId: 'price' | 'info' }

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC;

if (!BOT_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN");
if (!WEBHOOK_URL) throw new Error("Missing WEBHOOK_URL");

const bot = new Telegraf(BOT_TOKEN);

async function startApp() {
  // Init DB
  await dbService.init({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_ANON_KEY,
  });

  // Init wallet
  await walletService.init({
    supabase: dbService.supabase,
    encryptionKey: ENCRYPTION_KEY,
    solanaRpc: SOLANA_RPC,
  });

  console.log("Supabase initialized");
  console.log("Services initialized");

  // COMMANDS
  bot.start((ctx) =>
    ctx.reply("👋 Welcome to Celesto Bot! Use /menu to begin.")
  );

  bot.command("menu", menuHandler);

  bot.command("price", async (ctx) => {
    waitingFor[ctx.from.id] = "price";
    return price.askPrice(ctx);
  });

  bot.command("info", async (ctx) => {
    waitingFor[ctx.from.id] = "info";
    return ctx.reply("ℹ️ Send the token you want info for:");
  });

  bot.command("buy", buyHandler);
  bot.command("sell", sellHandler);

  /**
   * 🔍 FAST & OPTIMIZED INPUT HANDLER
   */
  bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    const mode = waitingFor[userId];

    if (!mode) return; // ignore normal chat

    const msg = ctx.message.text.trim();

    // If user is searching token for PRICE
    if (mode === "price") {
      // Search Birdeye token (light)
      await search.searchHandler(ctx);

      // If user sends full token text
      return price.handlePriceResponse(ctx);
    }

    // If user is searching token for INFO
    if (mode === "info") {
      const token = msg;
      waitingFor[userId] = null;
      return infoHandler(ctx);
    }
  });

  // User taps a search result button
  bot.action(/select_(.+)/, search.selectedToken);

  // Refresh / Buy / Sell buttons
  bot.action(/refresh_(.+)/, price.handlePriceResponse);
  bot.action(/buy_(.+)/, buyHandler);
  bot.action(/sell_(.+)/, sellHandler);
  bot.action(/chart_(.+)/, (ctx) => ctx.reply("📈 Chart coming soon"));

  /**
   * WEBHOOK (Railway)
   */
  const app = express();
  app.use(express.json());

  await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

  app.post("/bot", (req, res) => {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
  });

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () =>
    console.log(`🚀 Webhook running on port ${PORT}`)
  );
}

startApp();