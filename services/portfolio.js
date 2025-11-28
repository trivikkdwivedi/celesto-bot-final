const db = require("./db").supabase;
const priceService = require("./price");

module.exports = {
  async updateToken(telegramId, mint, amount) {
    const tg = String(telegramId);

    const { data: existing } = await db
      .from("user_portfolio")
      .select("*")
      .eq("telegram_id", tg)
      .eq("mint", mint)
      .maybeSingle();

    if (!existing) {
      return await db.from("user_portfolio").insert({
        telegram_id: tg,
        mint,
        amount,
      });
    }

    return await db
      .from("user_portfolio")
      .update({
        amount,
        updated_at: new Date(),
      })
      .eq("telegram_id", tg)
      .eq("mint", mint);
  },

  async getPortfolio(telegramId) {
    const tg = String(telegramId);

    const { data, error } = await db
      .from("user_portfolio")
      .select("*")
      .eq("telegram_id", tg);

    if (error) return [];
    return data || [];
  },

  async valuatePortfolio(rows) {
    const items = [];
    for (const row of rows) {
      const price = await priceService.getPrice(row.mint);
      items.push({
        ...row,
        price,
        value: price ? Number(row.amount) * price : 0,
      });
    }
    return items;
  },
};