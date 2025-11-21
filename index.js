// index.js - cleaned and fixed version

require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

// services
const dbService = require('./services/db');
const walletService = require('./services/wallet');
const priceService = require('./services/price');

// env
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID && String(process.env.ADMIN_TELEGRAM_ID);

// safety
if (!BOT_TOKEN) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN missing in .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ----------------------------
// STARTUP
// ----------------------------
async function start() {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (mongoUri && mongoUri !== 'none') {
      await dbService.connect(mongoUri);
      console.log('MongoDB connected');
    } else {
      console.log('Skipping MongoDB (MONGO_URI=none)');
    }

    if (walletService.init) {
      await walletService.init({
        encryptionKey: process.env.ENCRYPTION_KEY,
        mongoUri
      });
    }

    await bot.launch();
    console.log('Celesto Bot started');
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

// admin check
function isAdmin(ctx) {
  try {
    return ADMIN_ID && String(ctx.from.id) === ADMIN_ID;
  } catch {
    return false;
  }
}

// ----------------------------
// COMMANDS
// ----------------------------

bot.start(async (ctx) => {
  const name = ctx.from?.first_name || ctx.from?.username || 'User';
  await ctx.reply(`Hi ${name}! I'm Celesto — a dev trading bot. Use /help to see commands.`);
});

bot.command('help', (ctx) => {
  ctx.reply(
`/start - start bot
/help - command list
/ping - alive check
/price [symbol] - get crypto price
/createwallet - create Solana wallet
/mywallet - show your wallet
/balance - SOL balance
/admin - admin-only commands`
  );
});

bot.command('ping', (ctx) => ctx.reply('pong'));

// PRICE CHECK
bot.command('price', async (ctx) => {
  try {
    const parts = ctx.message.text.trim().split(/\s+/);
    const symbol = (parts[1] || 'SOL').toUpperCase();

    const price = await priceService.getPrice(symbol);
    if (!price) return ctx.reply(`Price for ${symbol} not available.`);

    ctx.reply(`${symbol} price: $${Number(price).toFixed(6)}`);
  } catch (err) {
    console.error('price error', err);
    ctx.reply('Price fetch failed.');
  }
});

// CREATE WALLET
bot.command('createwallet', async (ctx) => {
  try {
    const telegramId = String(ctx.from.id);
    const key = process.env.ENCRYPTION_KEY;

    if (!key) return ctx.reply('ENCRYPTION_KEY missing.');

    const existing = await walletService.getWallet(telegramId);
    if (existing) return ctx.reply(`You already have a wallet:\n${existing.publicKey}`);

    const { publicKey } = await walletService.createWallet({
      ownerId: telegramId,
      encryptionKey: key
    });

    ctx.reply(`Wallet created.\nPublic key:\n${publicKey}`);
  } catch (err) {
    console.error('createwallet err:', err);
    ctx.reply('Error creating wallet.');
  }
});

// SHOW WALLET
bot.command('mywallet', async (ctx) => {
  try {
    const telegramId = String(ctx.from.id);
    const w = await walletService.getWallet(telegramId);

    if (!w) return ctx.reply('No wallet found.');

    ctx.reply(`Public key:\n${w.publicKey}`);
  } catch (err) {
    console.error('mywallet err:', err);
    ctx.reply('Error retrieving wallet.');
  }
});

// BALANCE
bot.command('balance', async (ctx) => {
  try {
    const telegramId = String(ctx.from.id);
    const w = await walletService.getWallet(telegramId);

    if (!w) return ctx.reply('No wallet found.');

    const balance = await walletService.getSolBalance(w.publicKey);

    ctx.reply(`SOL balance for ${w.publicKey}:\n${Number(balance).toFixed(6)} SOL`);
  } catch (err) {
    console.error('balance err:', err);
    ctx.reply('Failed to fetch balance.');
  }
});

// SHUTDOWN HANDLERS
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// START BOT
start();

