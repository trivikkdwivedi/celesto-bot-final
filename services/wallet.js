// services/wallet.js — Wallet creation, secure encryption, restore, SOL balance
const crypto = require("crypto");
const {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");

const db = require("./db");

let ENC_KEY = null; // 32-byte AES key derived from ENCRYPTION_KEY
let solConnection = null;

/**
 * Derive AES-256 key from ENCRYPTION_KEY
 */
function deriveKey(pass) {
  return crypto.createHash("sha256").update(String(pass)).digest();
}

/**
 * Initialize wallet service
 */
async function init({ supabase, encryptionKey, solanaRpc }) {
  if (!supabase) throw new Error("Supabase client missing");

  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY required");
  }

  ENC_KEY = deriveKey(encryptionKey);

  solConnection = new Connection(
    solanaRpc || process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
}

/**
 * Encrypt secret key using AES-256-GCM
 */
function encryptSecret(secretBytes) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);

  const encrypted = Buffer.concat([cipher.update(secretBytes), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt secret key
 */
function decryptSecret(enc) {
  const buf = Buffer.from(enc, "base64");

  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const ciphertext = buf.slice(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted;
}

/**
 * Create a new Solana wallet and store encrypted secret in Supabase
 */
async function createWallet({ ownerId }) {
  if (!ownerId) throw new Error("ownerId required");

  const kp = Keypair.generate();

  const encrypted = encryptSecret(Buffer.from(kp.secretKey));
  await db.storeWallet({
    telegramId: ownerId,
    publicKey: kp.publicKey.toBase58(),
    encryptedSecret: encrypted,
  });

  return {
    publicKey: kp.publicKey.toBase58(),
    encryptedSecret: encrypted,
  };
}

/**
 * Fetch wallet from Supabase
 */
async function getWallet(telegramId) {
  const row = await db.getWalletByTelegram(String(telegramId));
  if (!row) return null;

  return {
    publicKey: row.public_key,
    encryptedSecret: row.encrypted_secret,
  };
}

/**
 * Convert encrypted secret to Keypair
 */
function keypairFromEncrypted(enc) {
  const secret = decryptSecret(enc);
  return Keypair.fromSecretKey(secret);
}

/**
 * Get wallet's SOL balance
 */
async function getSolBalance(pubKeyString) {
  const lamports = await solConnection.getBalance(new PublicKey(pubKeyString));
  return lamports / LAMPORTS_PER_SOL;
}

module.exports = {
  init,
  createWallet,
  getWallet,
  getSolBalance,
  keypairFromEncrypted,
};
