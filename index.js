// index.js — Final entrypoint (polling or webhook)
require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

// Services / handlers
const dbService = require("./services/db");
const walletService = require("./services/wallet");
const priceHandler = require("./handlers/price");
const chartHandler = require("./handlers/chart"); // make sure services/chart.js + handlers/chart.js exist
const buyHandler = require("./handlers/buy");
const sellHandler = require("./handlers/sell");
// optional: const infoHandler = require("./handlers/info");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // if set, uses webhook mode
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
          "/price <token> — Get token price via Jupiter or alternative",
          "/chart <token> — Show quick 24H chart (via BirdEye)",
          "/buy <input> <output> <amount> — Swap tokens (Jupiter)",
          "/sell <input> <output> <amount> — Swap tokens (reverse)",
          "",
          "All swaps are powered by Jupiter.",
        ].join("\n"),
        { parse_mode: "Markdown" }
      );
    });

    // createwallet
    bot.command("createwallet", async (ctx) => {
      try {
        const telegramId = String(ctx.from.id);
        const existing = await walletService.getWallet(telegramId);
        if (existing) {
          return ctx.reply(`⚠️ You already have a wallet:\n\`${existing.publicKey}\``, {
            parse_mode: "Markdown",
          });
        }
        const created = await walletService.createWallet({ ownerId: telegramId });
        return ctx.reply(`✅ Wallet created!\n\nPublic key:\n\`${created.publicKey}\``, {
          parse_mode: "Markdown",
        });
      } catch (err) {
        console.error("createwallet error:", err);
        return ctx.reply("❌ Failed to create wallet.");
      }
    });

    // mywallet
    bot.command("mywallet", async (ctx) => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));
        if (!wallet) return ctx.reply("❌ No wallet found. Create one with /createwallet");
        return ctx.reply(`🔑 Your wallet address:\n\`${wallet.publicKey}\``, {
          parse_mode: "Markdown",
        });
      } catch (err) {
        console.error("mywallet error:", err);
        return ctx.reply("❌ Failed to fetch wallet.");
      }
    });

    // balance
    bot.command("balance", async (ctx) => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));
        if (!wallet) return ctx.reply("❌ No wallet found. Use /createwallet");
        const sol = await walletService.getSolBalance(wallet.publicKey);
        return ctx.reply(
          `💰 SOL Balance for:\n\`${wallet.publicKey}\`\n\n**${sol.toFixed(6)} SOL**`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("balance error:", err);
        return ctx.reply("❌ Failed to fetch SOL balance.");
      }
    });

    // price
    bot.command("price", async (ctx) => {
      try {
        await priceHandler(ctx);
      } catch (err) {
        console.error("price command wrapper error:", err);
        ctx.reply("⚠️ Price command failed.");
      }
    });

    // chart
    bot.command("chart", async (ctx) => {
      try {
        await chartHandler(ctx);
      } catch (err) {
        console.error("chart command wrapper error:", err);
        ctx.reply("⚠️ Failed to load chart.");
      }
    });

    // buy
    bot.command("buy", async (ctx) => {
      try {
        await buyHandler(ctx);
      } catch (err) {
        console.error("buy command wrapper error:", err);
        ctx.reply("⚠️ Buy failed.");
      }
    });

    // sell
    bot.command("sell", async (ctx) => {
      try {
        await sellHandler(ctx);
      } catch (err) {
        console.error("sell command wrapper error:", err);
        ctx.reply("⚠️ Sell failed.");
      }
    });

    // --------------------------------
    // Start either webhook mode (if WEBHOOK_URL present) or polling mode
    // --------------------------------
    if (WEBHOOK_URL) {
      // Webhook mode (Railway)
      const app = express();
      app.use(express.json());

      // Telegram webhook URL: `${WEBHOOK_URL}/bot`
      await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);
      app.post("/bot", (req, res) => {
        bot.handleUpdate(req.body).catch((err) => {
          console.error("bot.handleUpdate error:", err);
        });
        res.sendStatus(200);
      });

      app.get("/", (req, res) => res.send("OK"));
      app.listen(PORT, () => {
        console.log(`🚀 Webhook server running on port ${PORT}`);
        console.log(`Webhook URL: ${WEBHOOK_URL}/bot`);
      });

      console.log("Webhook set! Bot is running.");
    } else {
      // Polling mode (local/dev)
      await bot.launch();
      console.log("🚀 Bot launched in polling mode.");
    }

    // graceful shutdown
    process.once("SIGINT", async () => {
      console.log("SIGINT received, stopping bot...");
      try { await bot.stop("SIGINT"); } catch {}
      process.exit(0);
    });
    process.once("SIGTERM", async () => {
      console.log("SIGTERM received, stopping bot...");
      try { await bot.stop("SIGTERM"); } catch {}
      process.exit(0);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();