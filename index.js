require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

// Services
const dbService = require("./services/db");
const walletService = require("./services/wallet");

// Handlers
const priceHandler = require("./handlers/price");
const buyHandler = require("./handlers/buy");
const sellHandler = require("./handlers/sell");
const infoHandler = require("./handlers/info");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC;

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

    // ------------------------- COMMANDS -------------------------

    bot.start(async (ctx) => {
      const name = ctx.from?.first_name || ctx.from?.username || "User";

      return ctx.reply(
        `👋 Welcome ${name}!\n\n` +
        `Use /help to view all commands.`,
        { parse_mode: "Markdown" }
      );
    });

    bot.command("help", (ctx) => {
      ctx.reply(
        `📘 *Available Commands*\n\n` +
        `/createwallet — Create a new wallet\n` +
        `/mywallet — View your wallet address\n` +
        `/balance — Check your SOL balance\n` +
        `/price <token> — Get token price\n` +
        `/info <token> — Full token overview\n` +
        `/buy <from> <to> <amount> — Swap tokens\n` +
        `/sell <from> <to> <amount> — Swap tokens (reverse)\n`,
        { parse_mode: "Markdown" }
      );
    });

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

        const created = await walletService.createWallet({
          ownerId: telegramId,
        });

        return ctx.reply(
          `✅ Wallet created!\n\nPublic key:\n\`${created.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("createwallet error:", err);
        return ctx.reply("❌ Failed to create wallet.");
      }
    });

    bot.command("mywallet", async (ctx) => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));

        if (!wallet) {
          return ctx.reply("❌ No wallet found. Use /createwallet");
        }

        return ctx.reply(
          `🔑 *Your Wallet:*\n\`${wallet.publicKey}\``,
          { parse_mode: "Markdown" }
        );
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

        return ctx.reply(
          `💰 *SOL Balance:*\n\`${wallet.publicKey}\`\n\n*${sol.toFixed(6)} SOL*`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("balance error:", err);
        return ctx.reply("❌ Failed to fetch balance.");
      }
    });

    bot.command("price", priceHandler);

    bot.command("info", infoHandler);

    bot.command("buy", buyHandler);

    bot.command("sell", sellHandler);

    // ------------------------- WEBHOOK -------------------------

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

    console.log("Webhook set! Bot is running.");

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();