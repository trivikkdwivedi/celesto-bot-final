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
const portfolioHandler = require("./handlers/portfolio");

// Menus
const {
  mainMenu,
  swapMenu,
  walletMenu,
  toolsMenu
} = require("./keyboards/menus");

// ENV
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN");
if (!WEBHOOK_URL) throw new Error("Missing WEBHOOK_URL");

const bot = new Telegraf(BOT_TOKEN);

async function startApp() {
  try {
    // ---------------------------------------------
    // INITIALIZATION
    // ---------------------------------------------
    await dbService.init({
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY,
    });

    await walletService.init({
      supabase: dbService.supabase,
      encryptionKey: ENCRYPTION_KEY,
      solanaRpc: SOLANA_RPC,
    });

    console.log("Supabase + Wallet service initialized");

    await tokenService.loadTokenList();
    console.log("Token list loaded");

    // ---------------------------------------------
    // START COMMAND
    // ---------------------------------------------
    bot.start((ctx) => {
      const name = ctx.from.first_name || ctx.from.username || "User";
      ctx.reply(
        `👋 Welcome ${name}!\nUse the menu below to navigate.`,
        mainMenu()
      );
    });

    bot.command("menu", (ctx) => ctx.reply("📌 Main Menu", mainMenu()));

    // ---------------------------------------------
    // HELP
    // ---------------------------------------------
    bot.command("help", (ctx) => {
      ctx.reply(
        `📘 <b>All Commands</b>\n
<code>/createwallet</code> — Create wallet  
<code>/mywallet</code> — Show wallet  
<code>/balance</code> — SOL balance  
<code>/price TOKEN</code> — Live price  
<code>/info TOKEN</code> — Token info  
<code>/chart TOKEN</code> — 24h chart  
<code>/buy INPUT OUTPUT AMOUNT</code>  
<code>/sell INPUT OUTPUT AMOUNT</code>  
<code>/portfolio</code> — View holdings  
<code>/menu</code> — Show menu  
`,
        { parse_mode: "HTML" }
      );
    });

    // ---------------------------------------------
    // WALLET COMMANDS
    // ---------------------------------------------
    bot.command("createwallet", async (ctx) => {
      try {
        const id = String(ctx.from.id);
        const existing = await walletService.getWallet(id);

        if (existing)
          return ctx.reply(
            `⚠️ Wallet already exists:\n<code>${existing.publicKey}</code>`,
            { parse_mode: "HTML" }
          );

        const created = await walletService.createWallet({ ownerId: id });
        ctx.reply(
          `✅ Wallet Created!\n\n<code>${created.publicKey}</code>`,
          { parse_mode: "HTML" }
        );
      } catch (e) {
        console.error(e);
        ctx.reply("❌ Failed to create wallet.");
      }
    });

    bot.command("mywallet", async (ctx) => {
      const w = await walletService.getWallet(String(ctx.from.id));
      if (!w) return ctx.reply("❌ No wallet found. Use /createwallet");

      ctx.reply(`🔑 <b>Your Wallet</b>\n<code>${w.publicKey}</code>`, {
        parse_mode: "HTML",
      });
    });

    bot.command("balance", async (ctx) => {
      try {
        const w = await walletService.getWallet(String(ctx.from.id));
        if (!w) return ctx.reply("❌ No wallet found.");

        const sol = await walletService.getSolBalance(w.publicKey);

        ctx.reply(
          `💰 <b>SOL Balance</b>\n<code>${sol.toFixed(6)} SOL</code>`,
          { parse_mode: "HTML" }
        );
      } catch (err) {
        ctx.reply("❌ Could not fetch balance.");
      }
    });

    // ---------------------------------------------
    // TOKEN COMMANDS
    // ---------------------------------------------
    bot.command("price", (ctx) => priceHandler(ctx));
    bot.command("info", (ctx) => infoHandler(ctx));
    bot.command("chart", (ctx) => chartHandler(ctx));

    // ---------------------------------------------
    // TRADING
    // ---------------------------------------------
    bot.command("buy", (ctx) => buyHandler(ctx));
    bot.command("sell", (ctx) => sellHandler(ctx));

    // ---------------------------------------------
    // PORTFOLIO
    // ---------------------------------------------
    bot.command("portfolio", (ctx) => portfolioHandler(ctx));

    // ---------------------------------------------
    // ADVANCED MENU NAVIGATION
    // ---------------------------------------------

    // MAIN MENU
    bot.hears("📊 Price", (ctx) =>
      ctx.reply("Send a token.\nExample: /price sol")
    );
    bot.hears("ℹ️ Info", (ctx) =>
      ctx.reply("Send a token.\nExample: /info sol")
    );
    bot.hears("📈 Chart", (ctx) =>
      ctx.reply("Send a token.\nExample: /chart sol")
    );

    bot.hears("💱 Swap", (ctx) =>
      ctx.reply("🔄 Swap Menu", swapMenu())
    );

    bot.hears("👛 Wallet", (ctx) =>
      ctx.reply("👛 Wallet Menu", walletMenu())
    );

    bot.hears("🧰 Tools", (ctx) =>
      ctx.reply("🧰 Tools Menu", toolsMenu())
    );

    // SWAP MENU
    bot.hears("🛒 Buy", (ctx) =>
      ctx.reply("Format:\n/buy <input> <output> <amount>")
    );
    bot.hears("💱 Sell", (ctx) =>
      ctx.reply("Format:\n/sell <input> <output> <amount>")
    );
    bot.hears("🔁 Quick Buy", (ctx) =>
      ctx.reply("Quick Buy Examples:\n/buy sol <token> 0.1\n/buy sol <token> 1")
    );

    // WALLET MENU
    bot.hears("👛 Create Wallet", (ctx) => ctx.reply("/createwallet"));
    bot.hears("🔑 My Wallet", (ctx) => ctx.reply("/mywallet"));
    bot.hears("💰 Balance", (ctx) => ctx.reply("/balance"));
    bot.hears("📈 Portfolio", (ctx) => ctx.reply("/portfolio"));

    // TOOLS MENU
    bot.hears("📢 Alerts", (ctx) => ctx.reply("📢 Alerts coming soon"));
    bot.hears("👀 Watchlist", (ctx) => ctx.reply("👀 Watchlist coming soon"));
    bot.hears("🧮 Calculator", (ctx) => ctx.reply("🧮 Calculator coming soon"));

    // BACK
    bot.hears("⬅️ Back", (ctx) =>
      ctx.reply("📌 Main Menu", mainMenu())
    );

    // ---------------------------------------------
    // WEBHOOK SETUP (RAILWAY)
    // ---------------------------------------------
    const app = express();
    app.use(express.json());

    await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

    app.post("/bot", (req, res) => {
      bot.handleUpdate(req.body);
      res.sendStatus(200);
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () =>
      console.log(`🚀 Webhook server running on port ${PORT}`)
    );

    console.log("Webhook set! Bot is live.");

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();