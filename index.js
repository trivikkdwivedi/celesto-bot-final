// index.js — Final entrypoint (polling or webhook)
require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

// Services / handlers
const dbService = require("./services/db");
const walletService = require("./services/wallet");
const priceHandler = require("./handlers/price");
const chartHandler = require("./handlers/chart");
const infoHandler = require("./handlers/info");
const buyHandler = require("./handlers/buy");
const sellHandler = require("./handlers/sell");
const callbackHandler = require("./handlers/callbacks");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // if set, webhook mode
const PORT = process.env.PORT || 8080;

if (!BOT_TOKEN) {
  console.error("❌ Missing TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function startApp() {
  try {
    // Initialize Supabase (if supplied)
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

    // --- Bot commands ---
    bot.start((ctx) => {
      const name = ctx.from?.first_name || ctx.from?.username || "User";
      return ctx.reply(`👋 Welcome ${name}!\n\nUse /help to see available commands.`);
    });

    bot.command("help", (ctx) => {
      return ctx.reply(
        [
          "📘 *Commands*",
          "",
          "/createwallet — Create a secure encrypted wallet",
          "/mywallet — Show your wallet public key",
          "/balance — Show your SOL balance",
          "/price <token> — Get token price (symbol/name/mint)",
          "/chart <token> — Price chart (interactive)",
          "/info <token> — Token overview (mcap, vol, liquidity)",
          "/buy <input> <output> <amount> — Swap tokens (guide)",
          "/sell <input> <output> <amount> — Swap tokens (guide)",
          "",
          "All major market data powered by Birdeye; price fallback to DexScreener/Jupiter."
        ].join("\n"),
        { parse_mode: "Markdown" }
      );
    });

    // Wallet commands
    bot.command("createwallet", async (ctx) => {
      try {
        const telegramId = String(ctx.from.id);
        const existing = await walletService.getWallet(telegramId);
        if (existing) {
          return ctx.reply(`⚠️ You already have a wallet:\n\`${existing.publicKey}\``, { parse_mode: "Markdown" });
        }
        const created = await walletService.createWallet({ ownerId: telegramId });
        return ctx.reply(`✅ Wallet created!\n\nPublic key:\n\`${created.publicKey}\``, { parse_mode: "Markdown" });
      } catch (err) {
        console.error("createwallet error:", err);
        return ctx.reply("❌ Failed to create wallet.");
      }
    });

    bot.command("mywallet", async (ctx) => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));
        if (!wallet) return ctx.reply("❌ No wallet found. Create one with /createwallet");
        return ctx.reply(`🔑 Your wallet address:\n\`${wallet.publicKey}\``, { parse_mode: "Markdown" });
      } catch (err) {
        console.error("mywallet error:", err);
        return ctx.reply("❌ Failed to fetch wallet.");
      }
    });

    bot.command("balance", async (ctx) => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));
        if (!wallet) return ctx.reply("❌ No wallet found. Use /createwallet");
        const sol = await walletService.getSolBalance(wallet.publicKey);
        return ctx.reply(`💰 SOL Balance for:\n\`${wallet.publicKey}\`\n\n**${sol.toFixed(6)} SOL**`, { parse_mode: "Markdown" });
      } catch (err) {
        console.error("balance error:", err);
        return ctx.reply("❌ Failed to fetch SOL balance.");
      }
    });

    // Core feature commands
    bot.command("price", async (ctx) => {
      try { await priceHandler(ctx); } catch (e) { console.error("price wrapper", e); ctx.reply("⚠️ Price command failed."); }
    });
    bot.command("chart", async (ctx) => {
      try { await chartHandler(ctx); } catch (e) { console.error("chart wrapper", e); ctx.reply("⚠️ Chart failed."); }
    });
    bot.command("info", async (ctx) => {
      try { await infoHandler(ctx); } catch (e) { console.error("info wrapper", e); ctx.reply("⚠️ Info failed."); }
    });

    bot.command("buy", async (ctx) => { try { await buyHandler(ctx); } catch (e) { console.error("buy wrapper", e); ctx.reply("⚠️ Buy failed."); } });
    bot.command("sell", async (ctx) => { try { await sellHandler(ctx); } catch (e) { console.error("sell wrapper", e); ctx.reply("⚠️ Sell failed."); } });

    // Callback handler
    bot.on("callback_query", callbackHandler);

    // Start webhook or polling
    if (WEBHOOK_URL) {
      const app = express();
      app.use(express.json());
      await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);
      app.post("/bot", (req, res) => { bot.handleUpdate(req.body).catch((e) => console.error("handleUpdate", e)); res.sendStatus(200); });
      app.get("/", (req, res) => res.send("OK"));
      app.listen(PORT, () => {
        console.log(`🚀 Webhook server running on port ${PORT}`);
        console.log(`Webhook URL: ${WEBHOOK_URL}/bot`);
      });
      console.log("Webhook set! Bot is running.");
    } else {
      await bot.launch();
      console.log("🚀 Bot launched in polling mode.");
    }

    // Graceful shutdown
    process.once("SIGINT", async () => { console.log("SIGINT"); try { await bot.stop("SIGINT"); } catch {} process.exit(0); });
    process.once("SIGTERM", async () => { console.log("SIGTERM"); try { await bot.stop("SIGTERM"); } catch {} process.exit(0); });

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();