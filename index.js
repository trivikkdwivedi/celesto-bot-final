require('dotenv').config();
const { Telegraf } = require('telegraf');

const dbService = require('./services/db');
const walletService = require('./services/wallet');
const priceService = require('./services/price');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID && String(process.env.ADMIN_TELEGRAM_ID);

if (!BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN in env');
  process.exit(1);
}
const bot = new Telegraf(BOT_TOKEN);

// helper
function isAdmin(ctx){
  try { return ADMIN_ID && String(ctx.from.id) === ADMIN_ID; } catch(e){ return false; }
}

async function startApp(){
  try {
    const supUrl = process.env.SUPABASE_URL;
    const supKey = process.env.SUPABASE_ANON_KEY;

    if (!supUrl || !supKey) {
      console.log('SUPABASE not fully configured. Exiting.');
      process.exit(1);
    }

    await dbService.init({ supabaseUrl: supUrl, supabaseKey: supKey });

    await walletService.init({
      supabase: dbService.supabase,
      encryptionKey: process.env.ENCRYPTION_KEY,
      solanaRpc: process.env.SOLANA_RPC
    });

    // bot commands
    bot.start(async (ctx) => {
      const name = ctx.from?.first_name || ctx.from?.username || 'User';
      await ctx.reply(`Welcome to Celesto Bot! Use /help`);
    });

    bot.command('help', (ctx) => {
      ctx.reply(`/start - start
/help - this help
/ping - pong
/price [SYMBOL] - price (SOL default)
/createwallet - create Solana wallet (encrypted saved to Supabase)
/mywallet - show public key
/balance - SOL balance
/broadcast <message> - admin-only broadcast`);
    });

    bot.command('ping', ctx => ctx.reply('pong'));

    bot.command('price', async (ctx) => {
      try {
        const parts = ctx.message.text.trim().split(/\s+/);
        const symbol = (parts[1] || 'SOL').toUpperCase();
        const p = await priceService.getPrice(symbol);
        if (!p) return ctx.reply('Price not found');
        ctx.reply(`${symbol} price: $${Number(p).toFixed(6)}`);
      } catch (err) {
        console.error('price err', err);
        ctx.reply('Price fetch failed');
      }
    });

    bot.command('createwallet', async (ctx) => {
      try {
        const telegramId = String(ctx.from.id);
        const key = process.env.ENCRYPTION_KEY;
        if (!key) return ctx.reply('Server missing ENCRYPTION_KEY env variable.');

        const existing = await walletService.getWallet(telegramId);
        if (existing) return ctx.reply(`You already have a wallet:\n${existing.publicKey}`);

        const created = await walletService.createWallet({ ownerId: telegramId });
        return ctx.reply(`Wallet created.\nPublic key:\n${created.publicKey}`);
      } catch (err) {
        console.error('createwallet', err);
        ctx.reply('Failed to create wallet.');
      }
    });

    bot.command('mywallet', async (ctx) => {
      try {
        const telegramId = String(ctx.from.id);
        const w = await walletService.getWallet(telegramId);
        if (!w) return ctx.reply('No wallet found. Use /createwallet');
        ctx.reply(`Public key:\n${w.publicKey}`);
      } catch (err) {
        console.error('mywallet err', err);
        ctx.reply('Error retrieving wallet.');
      }
    });

    bot.command('balance', async (ctx) => {
      try {
        const telegramId = String(ctx.from.id);
        const w = await walletService.getWallet(telegramId);
        if (!w) return ctx.reply('No wallet found. Use /createwallet');
        const bal = await walletService.getSolBalance(w.publicKey);
        ctx.reply(`SOL balance for ${w.publicKey}:\n${Number(bal).toFixed(6)} SOL`);
      } catch (err) {
        console.error('balance err', err);
        ctx.reply('Failed to fetch balance.');
      }
    });

    // admin broadcast
    bot.command('broadcast', async (ctx) => {
      if (!isAdmin(ctx)) return ctx.reply('Not allowed.');
      const message = ctx.message.text.split(' ').slice(1).join(' ');
      if (!message) return ctx.reply('Provide message text to broadcast.');
      try {
        const users = await dbService.getAllUsers();
        let count = 0;
        for (const u of users) {
          try {
            await bot.telegram.sendMessage(u.telegramId, message);
            count++;
          } catch(e){
            console.warn('broadcast send fail', e?.message);
          }
        }
        ctx.reply(`Broadcast attempted to ${count} users.`);
      } catch (err) {
        console.error('broadcast err', err);
        ctx.reply('Broadcast failed.');
      }
    });

    // track simple user table
    bot.on('message', async (ctx,next) => {
      try {
        const id = String(ctx.from?.id);
        await dbService.upsertUser({ telegramId: id, username: ctx.from?.username || null, firstName: ctx.from?.first_name || null });
      } catch (err){
        console.warn('user track warning', err?.message);
      } finally {
        return next();
      }
    });

    // start
    await bot.launch();
    console.log('Celesto Bot started');
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (err) {
    console.error('startup err', err);
    process.exit(1);
  }
}

startApp();
