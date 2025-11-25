// index.js — FINAL PRODUCTION VERSION
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
const callbackHandler = require("./handlers/callbacks");

// ENV
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN) throw new Error("❌ TELEGRAM_BOT_TOKEN missing");
if (!WEBHOOK_URL) throw new Error("❌ WEBHOOK_URL missing");

const bot = new Telegraf(BOT_TOKEN);

async function startApp() {
  try {
    // --- INIT SUPABASE ---
    await dbService.init({
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY,
    });

    // --- INIT WALLET SERVICE ---
    await walletService.init({
      supabase: dbService.supabase,
      encryptionKey: ENCRYPTION_KEY,
      solanaRpc: SOLANA_RPC,
    });

    console.log("Supabase initialized");
    console.log("Services initialized");

    // ========================
    // BOT COMMANDS
    // ========================

    bot.start(async (ctx) => {
      const name = ctx.from?.first_name || "User";
      ctx.reply(`👋 Welcome ${name}!\n\nUse /help to see all commands.`);
    });

    bot.command("help", (ctx) => {
      ctx.reply(
        `📘 *Available Commands*

/createwallet — Create encrypted wallet  
/mywallet — View your wallet address  
/balance — Check SOL balance  
/price <symbol/name/CA> — Price with buttons  
/buy — Buy tokens (simple flow)  
/sell — Sell tokens (simple flow)

Buttons available inside */price*:
🔁 Refresh  
🛒 Buy  
📤 Sell  
📈 Chart  

`,
        { parse_mode: "Markdown" }
      );
    });

    // --- WALLET COMMANDS ---
    bot.command("createwallet", async (ctx) => {
      try {
        const tgId = String(ctx.from.id);
        const existing = await walletService.getWallet(tgId);

        if (existing) {
          return ctx.reply(
            `⚠️ You already have a wallet:\n\`${existing.publicKey}\``,
            { parse_mode: "Markdown" }
          );
        }

        const w = await walletService.createWallet({ ownerId: tgId });
        ctx.reply(
          `✅ Wallet created!\n\n🔑 Public key:\n\`${w.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (e) {
        console.error("createwallet error:", e);
        ctx.reply("❌ Failed to create wallet.");
      }
    });

    bot.command("mywallet", async (ctx) => {
      try {
        const w = await walletService.getWallet(String(ctx.from.id));
        if (!w) return ctx.reply("❌ No wallet found. Use /createwallet");
        ctx.reply(`🔑 Your wallet:\n\`${w.publicKey}\``, {
          parse_mode: "Markdown",
        });
      } catch (e) {
        console.error("mywallet error:", e);
        ctx.reply("❌ Failed to fetch wallet.");
      }
    });

    bot.command("balance", async (ctx) => {
      try {
        const w = await walletService.getWallet(String(ctx.from.id));
        if (!w) return ctx.reply("❌ No wallet found. Use /createwallet");
        const sol = await walletService.getSolBalance(w.publicKey);
        ctx.reply(
          `💰 Balance:\n\`${w.publicKey}\`\n\n*${sol.toFixed(6)} SOL*`,
          { parse_mode: "Markdown" }
        );
      } catch (e) {
        console.error("balance error:", e);
        ctx.reply("❌ Failed to fetch balance.");
      }
    });

    // --- PRICE + BUTTONS ---
    bot.command("price", priceHandler);

    // --- buy/sell stubs ---
    bot.command("buy", buyHandler);
    bot.command("sell", sellHandler);

    // --- BUTTON CALLBACK HANDLER ---
    bot.on("callback_query", callbackHandler);

    // ========================
    // WEBHOOK MODE (RAILWAY)
    // ========================
    const app = express();
    app.use(express.json());

    await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

    app.post("/bot", (req, res) => {
      bot.handleUpdate(req.body).catch((e) => {
        console.error("callback error:", e);
      });
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