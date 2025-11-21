Use /createwallet to create one.');
    ctx.reply(`Public key:\n${w.publicKey}`);
  } catch (err) {
    console.error('mywallet err:', err);
    ctx.reply('Error retrieving wallet.');
  }
});

// /balance
bot.command('balance', async (ctx) => {
  try {
    const telegramId = String(ctx.from.id);
    const w = await walletService.getWallet(telegramId);
    if (!w) return ctx.reply('No wallet found. Use /createwallet to create one.');

    const balance = await walletService.getSolBalance(w.publicKey); // expects SOL number
    ctx.reply(`SOL balance for ${w.publicKey}:\n${Number(balance).toFixed(6)} SOL`);
  } catch (err) {
    console.error('balance err:', err);
    ctx.reply('Failed to fetch balance.');
  }
});

// admin broadcast
bot.command('broadcast', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('You are not authorized.');
  const message = ctx.message.text.split(' ').slice(1).join(' ');
  if (!message) return ctx.reply('Provide a message to broadcast.');

  // TODO: lookup user list from DB (if implemented); fallback: reply back
  if (!dbService.userModel) return ctx.reply('Broadcast requires DB user list. Implement userModel in db service.');
  try {
    const users = await dbService.userModel.find({}, 'telegramId').lean().exec();
    for (const u of users) {
      try {
        await bot.telegram.sendMessage(u.telegramId, message);
      } catch (sendErr) {
        console.warn(`Failed to send to ${u.telegramId}:`, sendErr.message);
      }
    }
    ctx.reply(`Broadcast sent to ${users.length} users (attempted).`);
  } catch (err) {
    console.error('broadcast err', err);
    ctx.reply('Broadcast failed.');
  }
});

/* --------------
   Optional: track users (simple)
   -------------- */
bot.on('message', async (ctx, next) => {
  try {
    if (dbService.userModel) {
      const id = String(ctx.from && ctx.from.id);
      const exists = await dbService.userModel.findOne({ telegramId: id }).exec();
      if (!exists) {
        await dbService.userModel.create({
          telegramId: id,
          username: ctx.from.username || null,
          firstName: ctx.from.first_name || null,
          createdAt: new Date()
        });
      }
    }
  } catch (err) {
    console.warn('user tracking warning:', err.message);
  } finally {
    return next();
  }
});

/* Graceful shutdown handlers */
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/* Start everything */
start();
