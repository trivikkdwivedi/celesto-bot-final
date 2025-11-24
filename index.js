require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

// Services
const dbService = require("./services/db");
const walletService = require("./services/wallet");
const priceHandler = require("./handlers/price");
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

const bot = new Telegraf(BOT_TOKEN);

async function startApp() {
  try {
    // Init Supabase
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
    console.log("Services initialized.");

    // /start
    bot.start((ctx) => {
      const name = ctx.from?.first_name || ctx.from?.username || "User";
      ctx.reply(`👋 Welcome ${name}!\n\nUse /help to see available commands.`);
    });

    bot.help((ctx) => {
      ctx.reply(
        `📘 **Commands**

/createwallet — Create a secure encrypted wallet
/mywallet — Show your wallet public key
/balance — Show your SOL balance
/price <token> — Get token price via Jupiter
/buy <input> <output> <amount> — Swap tokens
/sell <input> <output> <amount> — Swap tokens (reverse)

All swaps are powered by **Jupiter**.`,
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

        ctx.reply(
          `✅ Wallet created!\nPublic key:\n\`${created.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("createwallet error:", err);
        ctx.reply("❌ Failed to create wallet.");
      }
    });

    bot.command("mywallet", async (ctx) => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));
        if (!wallet) {
          return ctx.reply("❌ No wallet found. Use /createwallet");
        }

        ctx.reply(
          `🔑 Your wallet address:\n\`${wallet.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("mywallet error:", err);
        ctx.reply("❌ Failed to fetch wallet.");
      }
    });

    bot.command("balance", async (ctx) => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));
        if (!wallet) return ctx.reply("❌ No wallet found.");

        const sol = await walletService.getSolBalance(wallet.publicKey);

        ctx.reply(
          `💰 Balance:\n\`${wallet.publicKey}\`\n\n${sol.toFixed(6)} SOL`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("balance error:", err);
        ctx.reply("❌ Failed to fetch SOL balance.");
      }
    });

    bot.command("price", priceHandler);
    bot.command("buy", buyHandler);
    bot.command("sell", sellHandler);

    // --- WEBHOOK MODE ---
    if (!WEBHOOK_URL) {
      console.error("❌ Missing WEBHOOK_URL in Railway!");
      process.exit(1);
    }

    const app = express();
    app.use(bot.webhookCallback("/bot"));

    const PORT = process.env.PORT || 3000;
    await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

    app.listen(PORT, () => {
      console.log("🚀 Bot running via webhook on port", PORT);
    });

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();
            
