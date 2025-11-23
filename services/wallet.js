// services/wallet.js
const crypto = require('crypto');
const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');

let supabaseClient = null;
let ENC_KEY = null; // raw key buffer
let solConnection = null;

function deriveKey(pass) {
  // derive a 32 byte key from passphrase
  return crypto.createHash('sha256').update(String(pass)).digest();
}

async function init({ supabase, encryptionKey, solanaRpc }) {
  supabaseClient = supabase;
  if (!encryptionKey) throw new Error('ENCRYPTION_KEY required for wallet service');
  ENC_KEY = deriveKey(encryptionKey);
  solConnection = new Connection(solanaRpc || 'https://api.devnet.solana.com', 'confirmed');
}

function encryptSecret(secretBytes) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(secretBytes), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store iv + tag + encrypted
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptSecret(payload) {
  const b = Buffer.from(payload, 'base64');
  const iv = b.slice(0, 12);
  const tag = b.slice(12, 28);
  const encrypted = b.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return out; // Buffer
}

async function createWallet({ ownerId }) {
  if (!supabaseClient) throw new Error('Supabase not initialized for wallet');
  const kp = Keypair.generate();
  const secret = kp.secretKey; // Buffer
  const enc = encryptSecret(secret);
  // store in wallets table
  const { error } = await supabaseClient.from('wallets').insert([{
    owner_telegram_id: ownerId,
    public_key: kp.publicKey.toBase58(),
    encrypted_secret: enc,
    created_at: new Date()
  }]);
  if (error) throw error;
  return { publicKey: kp.publicKey.toBase58() };
}

async function getWallet(telegramId) {
  if (!supabaseClient) throw new Error('Supabase not initialized for wallet');
  const { data, error } = await supabaseClient.from('wallets').select('*').eq('owner_telegram_id', telegramId).limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function getSolBalance(pubKeyString) {
  if (!solConnection) solConnection = new Connection(process.env.SOLANA_RPC || 'https://api.devnet.solana.com', 'confirmed');
  const balLamports = await solConnection.getBalance({ publicKey: require('@solana/web3.js').PublicKey.fromString(pubKeyString) });
  return balLamports / LAMPORTS_PER_SOL;
}

module.exports = {
  init,
  createWallet,
  getWallet,
  getSolBalance
};
