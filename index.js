// ==========================================
//  Celesto Bot - FINAL INDEX.JS
// ==========================================

require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

// Services
const dbService = require("./services/db");
const walletService = require("./services/wallet");
const priceHandler = require("./handlers/price");
const chartHandler = require("./handlers/chart");
const buyHandler = require("./handlers/buy");
const sellHandler = require("./handlers/sell");
const infoHandler = require("./handlers/info");
const portfolioHandler = require("./handlers/portfolio");

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

// ==========================================
//  Initialize Services
// ==========================================

async function startApp() {
  try {
    await dbService.init({
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY,
    });

    await walletService.init({
      supabase: dbService.supabase,
      encryptionKey: ENCRYPTION_KEY,
      solanaRpc: SOLANA_RPC,
    });

    console.log("Supabase initialized");
    console.log("Services initialized");

    // ==========================================
    //  BOT COMMANDS
    // ==========================================

    // /start
    bot.start(async (ctx) => {
      const name = ctx.from?.first_name || ctx.from?.username || "User";
      ctx.reply(
        `👋 Welcome ${name}!\n\nUse /help to see available commands.`,
        { parse_mode: "Markdown" }
      );
    });

    // /help
    bot.command("help", (ctx) => {
      ctx.reply(
`📘 *Commands*

/createwallet — Create your Solana wallet
/mywallet — View your wallet public key
/balance — Show your SOL balance
/price <token> — Token price
/info <token> — Token info + market data
/chart <token> — Price chart with Birdeye
/buy <input> <output> <amount> — Swap tokens
/sell <input> <output> <amount> — Reverse swap
/portfolio — Your tracked token holdings

All powered by *Jupiter + Birdeye + Supabase*`,
        { parse_mode: "Markdown" }
      );
    });

    // /createwallet
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
          `✅ Wallet created!\n\nPublic key:\n\`${created.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("createwallet error:", err);
        ctx.reply("❌ Failed to create wallet.");
      }
    });

    // /mywallet
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

    // /balance
    bot.command("balance", async (ctx) => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));
        if (!wallet) {
          return ctx.reply("❌ No wallet found. Use /createwallet");
        }

        const sol = await walletService.getSolBalance(wallet.publicKey);

        ctx.reply(
          `💰 *SOL Balance:*\n\`${wallet.publicKey}\`\n\n*${sol.toFixed(5)} SOL*`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("balance error:", err);
        ctx.reply("❌ Failed to fetch SOL balance.");
      }
    });

    // /price
    bot.command("price", (ctx) => priceHandler(ctx));

    // /info
    bot.command("info", (ctx) => infoHandler(ctx));

    // /chart
    bot.command("chart", (ctx) => chartHandler(ctx));

    // /portfolio
    bot.command("portfolio", (ctx) => portfolioHandler(ctx));

    // /buy
    bot.command("buy", (ctx) => buyHandler(ctx));

    // /sell
    bot.command("sell", (ctx) => sellHandler(ctx));

    // ==========================================
    //  WEBHOOK MODE (Railway)
    // ==========================================

    const app = express();
    app.use(express.json());

    await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

    app.post("/bot", (req, res) => {
      bot.handleUpdate(req.body);
      res.sendStatus(200);
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () =>
      console.log(`🚀 Webhook server on port ${PORT}\nURL: ${WEBHOOK_URL}/bot`)
    );

    console.log("Webhook set! Bot is running.");

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();