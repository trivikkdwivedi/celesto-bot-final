require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

// Services
const dbService = require("./services/db");
const walletService = require("./services/wallet");
const tokenService = require("./services/token");
const priceHandler = require("./handlers/price");
const infoHandler = require("./handlers/info");
const chartHandler = require("./handlers/chart");
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
    // Initialize database + services
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

    // Load Jupiter tokens
    await tokenService.loadTokenList();

    console.log("Token list loaded");

    /**
     * COMMANDS
     */

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
        `📘 **Commands**

/createwallet — Create your trading wallet  
/mywallet — Show your wallet address  
/balance — Show your SOL balance  

💰 **Token data**
/price <token> — Live price  
/info <token> — Token metadata  
/chart <token> — 24h price chart  

🔄 **Trading (Solana only)**
/buy <input> <output> <amount>
/sell <input> <output> <amount>

Powered by **Jupiter + BirdEye**`,
        { parse_mode: "Markdown" }
      );
    });

    // Wallet
    bot.command("createwallet", async (ctx) => {
      try {
        const telegramId = String(ctx.from.id);
        const existing = await walletService.getWallet(telegramId);

        if (existing)
          return ctx.reply(
            `⚠️ You already have a wallet:\n\`${existing.publicKey}\``,
            { parse_mode: "Markdown" }
          );

        const w = await walletService.createWallet({ ownerId: telegramId });

        ctx.reply(
          `✅ Wallet created!\n\nPublic key:\n\`${w.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("createwallet error:", err);
        ctx.reply("❌ Failed to create wallet.");
      }
    });

    bot.command("mywallet", async (ctx) => {
      const w = await walletService.getWallet(String(ctx.from.id));
      if (!w) return ctx.reply("❌ No wallet found. Use /createwallet");

      ctx.reply(
        `🔑 Your wallet address:\n\`${w.publicKey}\``,
        { parse_mode: "Markdown" }
      );
    });

    bot.command("balance", async (ctx) => {
      try {
        const w = await walletService.getWallet(String(ctx.from.id));
        if (!w) return ctx.reply("❌ No wallet found. Use /createwallet");

        const sol = await walletService.getSolBalance(w.publicKey);

        ctx.reply(
          `💰 Balance for \`${w.publicKey}\`\n\n**${sol.toFixed(6)} SOL**`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("balance error:", err);
        ctx.reply("❌ Failed to fetch SOL balance.");
      }
    });

    /**
     * Token commands
     */
    bot.command("price", (ctx) => priceHandler(ctx));
    bot.command("info", (ctx) => infoHandler(ctx));
    bot.command("chart", (ctx) => chartHandler(ctx));

    /**
     * Trading
     */
    bot.command("buy", (ctx) => buyHandler(ctx));
    bot.command("sell", (ctx) => sellHandler(ctx));

    /**
     * WEBHOOK SETUP FOR RAILWAY
     */
    const app = express();
    app.use(express.json());

    // Telegram calls this URL
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