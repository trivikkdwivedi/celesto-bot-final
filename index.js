require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

// Services
const dbService = require("./services/db");
const walletService = require("./services/wallet");

// Handlers
const priceHandler = require("./handlers/price");
const infoHandler = require("./handlers/info");
const buyHandler = require("./handlers/buy");
const sellHandler = require("./handlers/sell");
const menuHandler = require("./handlers/menu");

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
  await dbService.init({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_ANON_KEY
  });

  await walletService.init({
    supabase: dbService.supabase,
    encryptionKey: ENCRYPTION_KEY,
    solanaRpc: SOLANA_RPC
  });

  // Commands
  bot.start((ctx) => ctx.reply("👋 Welcome! Use /menu"));
  bot.command("menu", menuHandler);
  bot.command("price", priceHandler);
  bot.command("info", infoHandler);
  bot.command("buy", buyHandler);
  bot.command("sell", sellHandler);

  // Webhook
  const app = express();
  app.use(express.json());

  await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

  app.post("/bot", (req, res) => {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
  });

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () =>
    console.log(`🚀 Webhook running on ${PORT}`)
  );
}

startApp();