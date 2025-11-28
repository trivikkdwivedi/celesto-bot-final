const db = require("./db").supabase;

/**
 * Get all tokens in user's portfolio
 */
async function getPortfolio(telegramId) {
  const { data, error } = await db
    .from("user_portfolio")
    .select("*")
    .eq("telegram_id", telegramId);

  if (error) {
    console.error("getPortfolio error:", error);
    return [];
  }

  return data || [];
}

/**
 * Update token amount (used after BUY/SELL)
 */
async function updateToken(telegramId, mint, amount) {
  // check if exists
  const { data: existing } = await db
    .from("user_portfolio")
    .select("*")
    .eq("telegram_id", telegramId)
    .eq("mint", mint)
    .maybeSingle();

  if (!existing) {
    // create record
    return await db.from("user_portfolio").insert({
      telegram_id: telegramId,
      mint,
      amount,
    });
  }

  // update amount
  return await db
    .from("user_portfolio")
    .update({
      amount,
      updated_at: new Date(),
    })
    .eq("telegram_id", telegramId)
    .eq("mint", mint);
}

module.exports = {
  getPortfolio,
  updateToken,
};