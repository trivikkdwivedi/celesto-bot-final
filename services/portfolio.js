// services/portfolio.js
const db = require("./db").supabase;
const priceService = require("./price");

async function getPortfolio(telegramId) {
  const { data, error } = await db
    .from("user_portfolio")
    .select("*")
    .eq("telegram_id", String(telegramId))
    .order("id", { ascending: true });

  if (error) {
    console.error("portfolio.getPortfolio error:", error);
    return [];
  }
  return data || [];
}

/**
 * Update absolute amount for a token (set)
 * If you want increment/decrement, use adjustToken()
 */
async function updateToken(telegramId, mint, amount) {
  const tg = String(telegramId);

  // check existing
  const { data: existing, error: e1 } = await db
    .from("user_portfolio")
    .select("*")
    .eq("telegram_id", tg)
    .eq("mint", mint)
    .maybeSingle();

  if (e1) {
    console.error("portfolio.updateToken select error:", e1);
    throw e1;
  }

  if (!existing) {
    const { error } = await db
      .from("user_portfolio")
      .insert({
        telegram_id: tg,
        mint,
        amount: String(amount),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("portfolio.updateToken insert error:", error);
      throw error;
    }
    return true;
  }

  const { error } = await db
    .from("user_portfolio")
    .update({ amount: String(amount), updated_at: new Date().toISOString() })
    .eq("telegram_id", tg)
    .eq("mint", mint);

  if (error) {
    console.error("portfolio.updateToken update error:", error);
    throw error;
  }

  return true;
}

/**
 * Adjust (add/subtract) token amount. amountDelta can be positive or negative.
 */
async function adjustToken(telegramId, mint, amountDelta) {
  const tg = String(telegramId);
  const { data: existing } = await db
    .from("user_portfolio")
    .select("*")
    .eq("telegram_id", tg)
    .eq("mint", mint)
    .maybeSingle();

  let newAmount = Number(amountDelta);
  if (existing) {
    newAmount = Number(existing.amount || 0) + Number(amountDelta);
  }

  if (newAmount <= 0) {
    // delete record
    await db.from("user_portfolio").delete().eq("telegram_id", tg).eq("mint", mint);
    return true;
  }

  await updateToken(tg, mint, newAmount);
  return true;
}

/**
 * Valuate a user's portfolio (returns array with price + value and total)
 */
async function valuate(telegramId) {
  const rows = await getPortfolio(telegramId);
  const out = [];
  let total = 0;
  for (const r of rows) {
    const price = await priceService.getPrice(r.mint);
    const amount = Number(r.amount || 0);
    const value = price ? amount * price : 0;
    total += value;
    out.push({
      mint: r.mint,
      amount,
      price,
      value,
    });
  }
  return { items: out, total };
}

module.exports = {
  getPortfolio,
  updateToken,
  adjustToken,
  valuate,
};