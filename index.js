require("dotenv").config();

const { Telegraf } = require("telegraf");
const express = require("express");

// Services
const dbService = require("./services/db");
const walletService = require("./services/wallet");
const priceHandler = require("./handlers/price");
const infoHandler = require("./handlers/info");
const chartHandler = require("./handlers/chart");
const buyHandler = require("./handlers/buy");
const sellHandler = require("./handlers/sell");
const portfolioHandler = require("./handlers/portfolio");

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
    console.log("Services initialized");

    // Inject helper services into ctx
    bot.context.wallet = walletService;

    // -----------------------------------
    // COMMANDS
    // -----------------------------------

    bot.start(async ctx => {
      const name = ctx.from?.first_name || ctx.from?.username || "User";
      ctx.reply(
        `👋 Welcome ${name}!\n\nUse /help to see all commands.`
      );
    });

    bot.command("help", ctx => {
      ctx.reply(
        `📘 *Commands*\n
/createwallet — Create a secure encrypted wallet
/mywallet — Show your wallet public key
/balance — Show your SOL balance

/price <token> — Token price
/info <token> — Token info
/chart <token> — Token chart (Birdeye)

/buy <input> <output> <amount> — Swap tokens (Jupiter)
/sell <input> <output> <amount> — Swap tokens

/portfolio — Show your token portfolio

All swaps and prices powered by *Jupiter + Birdeye*.`,
        { parse_mode: "Markdown" }
      );
    });

    // Wallet creation
    bot.command("createwallet", async ctx => {
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
          `✅ Wallet created!\n\nPublic Key:\n\`${created.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("createwallet error:", err);
        ctx.reply("❌ Failed to create wallet.");
      }
    });

    // Show wallet
    bot.command("mywallet", async ctx => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));
        if (!wallet) return ctx.reply("❌ No wallet found. Use /createwallet");

        ctx.reply(
          `🔑 Your wallet address:\n\`${wallet.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("mywallet error:", err);
        ctx.reply("❌ Failed to fetch wallet.");
      }
    });

    // Balance
    bot.command("balance", async ctx => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));
        if (!wallet) return ctx.reply("❌ No wallet found. Use /createwallet");

        const sol = await walletService.getSolBalance(wallet.publicKey);

        ctx.reply(
          `💰 SOL Balance:\n\`${wallet.publicKey}\`\n\n*${sol.toFixed(6)} SOL*`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("balance error:", err);
        ctx.reply("❌ Failed to fetch SOL balance.");
      }
    });

    // Price
    bot.command("price", async ctx => priceHandler(ctx));

    // Info
    bot.command("info", async ctx => infoHandler(ctx));

    // Chart
    bot.command("chart", async ctx => chartHandler(ctx));

    // Buy
    bot.command("buy", async ctx => buyHandler(ctx));

    // Sell
    bot.command("sell", async ctx => sellHandler(ctx));

    // Portfolio
    bot.command("portfolio", async ctx => portfolioHandler(ctx));

    // -----------------------------------
    // WEBHOOK SERVER (RAILWAY)
    // -----------------------------------

    const app = express();
    app.use(express.json());

    // Register webhook with Telegram
    await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

    // Telegram sends updates here
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