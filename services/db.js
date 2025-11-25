// services/db.js
const { createClient } = require("@supabase/supabase-js");

let supabase = null;

async function init({ supabaseUrl, supabaseKey }) {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase URL/Key not provided — db methods will error if used.");
    return;
  }
  supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  console.log("Supabase initialized");
}

async function storeWallet({ telegramId, publicKey, encryptedSecret }) {
  if (!supabase) throw new Error("Supabase not initialized");
  const payload = { telegram_id: String(telegramId), public_key: publicKey, encrypted_secret: encryptedSecret };
  const { data, error } = await supabase.from("wallets").upsert(payload, { onConflict: "telegram_id" });
  if (error) throw error;
  return data;
}

async function getWalletByTelegram(telegramId) {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase.from("wallets").select("*").eq("telegram_id", String(telegramId)).limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

async function getWalletByPublicKey(publicKey) {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase.from("wallets").select("*").eq("public_key", publicKey).limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

module.exports = {
  init,
  storeWallet,
  getWalletByTelegram,
  getWalletByPublicKey,
  get supabase() { return supabase; }
};