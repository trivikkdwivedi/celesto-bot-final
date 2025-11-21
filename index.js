require("dotenv").config();
const { Telegraf } = require("telegraf");

const dbService = require("./services/db");
const walletService = require("./services/wallet");
const priceService = require("./services/price");

// ENV
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = String(process.env.ADMIN_TELEGRAM_ID || "");

// Safety
if (!BOT_TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// STARTUP
async function start() {
  const mongoUri = process.env.MONGO_URI;

  if (mongoUri && mongoUri !== "none") {
    await dbService.connect(mongoUri);
  } else {
    console.log("MongoDB disabled.");
  }

  await walletService.init({
    encryptionKey: process.env.ENCRYPTION_KEY,
    mongoUri,
  });

  await bot.launch();
  console.log("Celesto bot started");
}

function isAdmin(ctx) {
  return ADMIN_ID === String(ctx.from.id);
}

// COMMANDS
bot.start((ctx) => {
  ctx.reply("Welcome to Celesto Bot! Use /help");
});

bot.command("help", (ctx) => {
  ctx.reply(
`Commands:
/start
/help
/price [symbol]
/createwallet
/mywallet
/balance
/broadcast (admin)`
  );
});

bot.command("price", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  const symbol = (parts[1] || "SOL").toUpperCase();

  const price = await priceService.getPrice(symbol);
  if (!price) return ctx.reply("Price not found");

  ctx.reply(`${symbol} price: $${price}`);
});

bot.command("createwallet", async (ctx) => {
  const id = String(ctx.from.id);

  const existing = await walletService.getWallet(id);
  if (existing) return ctx.reply(`Wallet exists:\n${existing.publicKey}`);

  const w = await walletService.createWallet({ ownerId: id });
  ctx.reply(`Wallet created:\n${w.publicKey}`);
});

bot.command("mywallet", async (ctx) => {
  const id = String(ctx.from.id);
  const w = await walletService.getWallet(id);

  if (!w) return ctx.reply("No wallet found");
  ctx.reply(`Your wallet:\n${w.publicKey}`);
});

bot.command("balance", async (ctx) => {
  const id = String(ctx.from.id);
  const w = await walletService.getWallet(id);
  if (!w) return ctx.reply("No wallet found");

  const bal = await walletService.getSolBalance(w.publicKey);
  ctx.reply(`Balance: ${bal} SOL`);
});

// ADMIN BROADCAST
bot.command("broadcast", async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("Not allowed.");

  if (!dbService.userModel)
    return ctx.reply("Broadcast requires Mongo enabled.");

  const msg = ctx.message.text.split(" ").slice(1).join(" ");
  if (!msg) return ctx.reply("Provide a message.");

  const users = await dbService.userModel.find({});
  for (const u of users) {
    try {
      await bot.telegram.sendMessage(u.telegramId, msg);
    } catch {}
  }
  ctx.reply("Broadcast sent");
});

// Shutdown
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());

// Start
start();
    
