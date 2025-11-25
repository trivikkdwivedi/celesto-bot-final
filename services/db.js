// services/db.js
const { createClient } = require("@supabase/supabase-js");

let supabase = null;

/**
 * Initialize Supabase
 */
async function init({ supabaseUrl, supabaseKey }) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL + ANON KEY required");
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  console.log("Supabase initialized");
}

/**
 * Store or update wallet (encrypted secret + public key)
 * Table: wallets
 * Columns:
 * - telegram_id (text, primary)
 * - public_key (text)
 * - encrypted_secret (text)
 */
async function storeWallet({ telegramId, publicKey, encryptedSecret }) {
  if (!supabase) throw new Error("Supabase not initialized");

  const payload = {
    telegram_id: String(telegramId),
    public_key: publicKey,
    encrypted_secret: encryptedSecret,
  };

  const { data, error } = await supabase
    .from("wallets")
    .upsert(payload, { onConflict: "telegram_id" });

  if (error) throw error;

  return data;
}

/**
 * Fetch wallet record by Telegram ID
 */
async function getWalletByTelegram(telegramId) {
  if (!supabase) throw new Error("Supabase not initialized");

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("telegram_id", String(telegramId))
    .limit(1);

  if (error) throw error;

  return data?.[0] || null;
}

/**
 * Fetch wallet record by public key
 */
async function getWalletByPublicKey(publicKey) {
  if (!supabase) throw new Error("Supabase not initialized");

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("public_key", publicKey)
    .limit(1);

  if (error) throw error;

  return data?.[0] || null;
}

module.exports = {
  init,
  storeWallet,
  getWalletByTelegram,
  getWalletByPublicKey,

  // expose supabase client
  get supabase() {
    return supabase;
  },
};