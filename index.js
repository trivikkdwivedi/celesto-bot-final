require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

// Handlers
const priceHandler = require("./handlers/price");
const infoHandler = require("./handlers/info");
const chartHandler = require("./handlers/chart");

const walletService = require("./services/wallet");
const dbService = require("./services/db");

// ENV
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
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

/* ---------------------------
   START APPLICATION
----------------------------*/
async function startApp() {
  try {
    // Init DB + RPC + Encryption
    await dbService.init({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY,
    });

    await walletService.init({
      supabase: dbService.supabase,
      encryptionKey: process.env.ENCRYPTION_KEY,
      solanaRpc: process.env.SOLANA_RPC,
    });

    console.log("Supabase initialized");
    console.log("Services initialized");

    /* ---------------------------
       COMMANDS
    ----------------------------*/

    bot.start((ctx) => {
      ctx.reply(
        `👋 Welcome to *Celesto Trading Bot!*\n\nUse /menu to see all commands.`,
        { parse_mode: "Markdown" }
      );
    });

    bot.command("menu", (ctx) => {
      ctx.reply(
        "📌 *Main Menu*\nChoose an option:",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "💰 Price", callback_data: "ask_price" },
                { text: "ℹ Info", callback_data: "ask_info" },
              ],
              [
                { text: "📈 Chart", callback_data: "ask_chart" },
              ],
              [
                { text: "👛 Create Wallet", callback_data: "create_wallet" },
                { text: "🔑 My Wallet", callback_data: "show_wallet" },
              ],
              [
                { text: "💵 Balance", callback_data: "show_balance" },
              ],
              [
                { text: "🛒 Buy", callback_data: "ask_buy" },
                { text: "📤 Sell", callback_data: "ask_sell" },
              ],
            ],
          },
        }
      );
    });

    /* ---------- Price Command ---------- */
    bot.command("price", priceHandler);

    /* ---------- Info Command ---------- */
    bot.command("info", infoHandler);

    /* ---------- Chart Command ---------- */
    bot.command("chart", chartHandler);

    /* ---------- Wallet Commands ---------- */
    bot.command("createwallet", async (ctx) => {
      try {
        const telegramId = String(ctx.from.id);

        const wallet = await walletService.getWallet(telegramId);
        if (wallet) {
          return ctx.reply(
            `⚠️ You already have a wallet.\n\n🪪 *Public Key:* \`${wallet.publicKey}\``,
            { parse_mode: "Markdown" }
          );
        }

        const created = await walletService.createWallet({ ownerId: telegramId });

        ctx.reply(
          `✅ *Wallet Created Successfully!*\n\n🔑 Public Key:\n\`${created.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error(err);
        ctx.reply("❌ Failed to create wallet.");
      }
    });

    bot.command("mywallet", async (ctx) => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));

        if (!wallet) {
          return ctx.reply("❌ No wallet found. Use /createwallet first.");
        }

        ctx.reply(
          `🔑 *Your Wallet Address:*\n\`${wallet.publicKey}\``,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error(err);
        ctx.reply("❌ Failed to get wallet.");
      }
    });

    bot.command("balance", async (ctx) => {
      try {
        const wallet = await walletService.getWallet(String(ctx.from.id));

        if (!wallet) {
          return ctx.reply("❌ No wallet found. Use /createwallet.");
        }

        const sol = await walletService.getSolBalance(wallet.publicKey);

        ctx.reply(
          `💰 *Your Balance:*\n${sol.toFixed(6)} SOL`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error(err);
        ctx.reply("❌ Failed to fetch balance.");
      }
    });

    /* ---------------------------
       BUTTON CALLBACKS
    ----------------------------*/

    bot.on("callback_query", async (ctx) => {
      const data = ctx.callbackQuery.data;

      if (data === "ask_price") {
        return ctx.reply("💬 Send token symbol:\nExample: `SOL`", {
          parse_mode: "Markdown",
        });
      }

      if (data === "ask_info") {
        return ctx.reply("ℹ Send token symbol:\nExample: `SOL`", {
          parse_mode: "Markdown",
        });
      }

      if (data === "ask_chart") {
        return ctx.reply("📊 Send token symbol:\nExample: `SOL`", {
          parse_mode: "Markdown",
        });
      }

      if (data === "create_wallet") {
        return ctx.reply("/createwallet");
      }

      if (data === "show_wallet") {
        return ctx.reply("/mywallet");
      }

      if (data === "show_balance") {
        return ctx.reply("/balance");
      }

      if (data === "ask_buy") {
        return ctx.reply("🛒 Usage: /buy <input> <output> <amount>");
      }

      if (data === "ask_sell") {
        return ctx.reply("📤 Usage: /sell <input> <output> <amount>");
      }

      ctx.answerCbQuery();
    });

    /* ---------------------------
       WEBHOOK (Railway)
    ----------------------------*/
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
  }
}

startApp();