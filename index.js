// index.js — Final production-ready bot entry (Webhook + Polling)
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
const callbackHandler = require("./handlers/callbacks");

// ENV
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // if set → webhook mode

const PORT = process.env.PORT || 8080;

if (!BOT_TOKEN) {
  console.error("❌ Missing TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function startApp() {
  try {
    // init supabase
    await dbService.init({
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY,
    });

    // init wallet service
    await walletService.init({
      supabase: dbService.supabase,
      encryptionKey: ENCRYPTION_KEY,
      solanaRpc: SOLANA_RPC,
    });

    console.log("Supabase initialized");
    console.log("Services initialized");

    // ─────────────────────────────
    // COMMANDS
    // ─────────────────────────────

    bot.start((ctx) => {
      const name = ctx.from?.first_name || ctx.from?.username || "User";
      return ctx.reply(`👋 Welcome ${name}!\n\nUse /help to see bot commands.`);
    });

    bot.command("help", (ctx) => {
      return ctx.reply(
        [
          "📘 *Commands*",
          "",
          "/createwallet — Create encrypted wallet",
          "/mywallet — Show your wallet address",
          "/balance — Show your SOL balance",
          "",
          "/price <token> — Show price",
          "/chart <token> — Show chart",
          "/info <token> — Token statistics & info",
          "",
          "/buy  — Swap guide",
          "/sell — Swap guide",
          "",
          "Powered by Solana • Birdeye • DexScreener • Jupiter",
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
          return ctx.reply(`⚠️ Wallet already exists:\n\`${existing.publicKey}\``, {
            parse_mode: "Markdown",
          });
        }
        const w = await walletService.createWallet({ ownerId: telegramId });
        return ctx.reply(
          `✅ Wallet created!\n\n🔑 Public key:\n\`${w.publicKey}\``,
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
        if (!w) return ctx.reply("❌ No wallet. Use /createwallet");
        return ctx.reply(`🔑 Your wallet:\n\`${w.publicKey}\``, {
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
        if (!w) return ctx.reply("❌ No wallet. Use /createwallet");
        const sol = await walletService.getSolBalance(w.publicKey);
        return ctx.reply(
          `💰 SOL Balance for \`${w.publicKey}\`:\n**${sol.toFixed(6)} SOL**`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("balance error:", err);
        ctx.reply("❌ Failed to fetch balance.");
      }
    });

    // Feature commands
    bot.command("price", (ctx) => priceHandler(ctx));
    bot.command("chart", (ctx) => chartHandler(ctx));
    bot.command("info", (ctx) => infoHandler(ctx));

    bot.command("buy", (ctx) => buyHandler(ctx));
    bot.command("sell", (ctx) => sellHandler(ctx));

    // Callback handler (buttons)
    bot.on("callback_query", callbackHandler);

    // ─────────────────────────────
    // START BOT
    // ─────────────────────────────

    if (WEBHOOK_URL) {
      // Webhook mode — Railway
      const app = express();
      app.use(express.json());

      await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);
      console.log("Webhook set!");

      app.post("/bot", (req, res) => {
        bot.handleUpdate(req.body).catch((err) =>
          console.error("Webhook update error:", err)
        );
        res.sendStatus(200);
      });

      app.get("/", (req, res) => res.send("OK"));

      app.listen(PORT, () =>
        console.log(`🚀 Running webhook on port ${PORT}\nURL: ${WEBHOOK_URL}/bot`)
      );
    } else {
      // Polling mode — local
      await bot.launch();
      console.log("🚀 Bot running in polling mode");
    }

    // graceful shutdown
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();