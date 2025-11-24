require("dotenv").config();
const { Telegraf } = require("telegraf");

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

if (!BOT_TOKEN) {
  console.error("❌ Missing TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

/**
 * Initialize all services
 */
async function startApp() {
  try {
    // Initialize Supabase
    await dbService.init({
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY,
    });

    // Initialize wallet encryption + RPC
    await walletService.init({
      supabase: dbService.supabase,
      encryptionKey: ENCRYPTION_KEY,
      solanaRpc: SOLANA_RPC,
    });

    console.log("Services initialized.");

    /**
     * BOT COMMANDS
     */

    // /start
    bot.start(async (ctx) => {
      const name =
        ctx.from?.first_name || ctx.from?.username || "User";
      ctx.reply(
        `👋 Welcome ${name}!\n\nUse /help to see available commands.`
      );
    });

    // /help
    bot.command("help", (ctx) => {
      ctx.reply(
        `📘 **Commands**

/createwallet — Create a secure encrypted wallet
/mywallet — Show your wallet public key
/balance — Show your SOL balance
/price <token> — Get token price via Jupiter
/buy <input> <output> <amount> — Swap tokens
/sell <input> <output> <amount> — Swap tokens (reverse)

All swaps are powered by **Jupiter**.
`,
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
        const wallet = await walletService.getWallet(
          String(ctx.from.id)
        );
        if (!wallet) {
          return ctx.reply(
            "❌ No wallet found. Create one with /createwallet"
          );
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
          `💰 SOL Balance for:\n\`${wallet.publicKey}\`\n\n**${sol.toFixed(6)} SOL**`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("balance error:", err);
        ctx.reply("❌ Failed to fetch SOL balance.");
      }
    });

    // /price
    bot.command("price", async (ctx) => {
      return priceHandler(ctx);
    });

    // /buy
    bot.command("buy", async (ctx) => {
      return buyHandler(ctx);
    });

    // /sell
    bot.command("sell", async (ctx) => {
      return sellHandler(ctx);
    });

    /**
     * Start bot
     */
    await bot.launch();
    console.log("🚀 Celesto Bot started!");

    // Graceful shutdown
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();
    
