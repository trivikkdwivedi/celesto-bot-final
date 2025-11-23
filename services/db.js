// services/db.js - minimal supabase helpers (CommonJS)
const { createClient } = require('@supabase/supabase-js');

let supabase = null;

async function init({ supabaseUrl, supabaseKey }){
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
  // optional: validate tables exist - we rely on you to create tables in Supabase GUI or run provided SQL
  console.log('Supabase client created');
}

async function upsertUser({ telegramId, username, firstName } = {}){
  if (!supabase) throw new Error('Supabase not initialized');
  const payload = {
    telegram_id: telegramId,
    username,
    first_name: firstName,
    updated_at: new Date()
  };
  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'telegram_id' });
  if (error) throw error;
  return true;
}

async function getAllUsers(){
  if (!supabase) throw new Error('Supabase not initialized');
  const { data, error } = await supabase.from('users').select('telegram_id');
  if (error) throw error;
  return (data || []).map(d => ({ telegramId: String(d.telegram_id) }));
}

module.exports = {
  init,
  upsertUser,
  getAllUsers,
  get supabase(){ return supabase; }
};
