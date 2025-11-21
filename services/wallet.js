// services/wallet.js
import { Keypair } from "@solana/web3.js";
import { encryptText, decryptText } from "../utils/encrypt.js";
import { getDB } from "./db.js";

/**
 * For development only:
 * - Creates a Solana Keypair
 * - Stores publicKey + encrypted secret in MongoDB if configured
 * - Returns publicKey + secretBase64 (only immediately after creation)
 */

export async function createWalletForUser(userId) {
  const kp = Keypair.generate();
  const secretBase64 = Buffer.from(kp.secretKey).toString("base64");
  const encrypted = encryptText(secretBase64);

  // if DB present, store
  try {
    const db = getDB();
    const coll = db.collection("wallets");
    await coll.updateOne(
      { userId },
      { $set: { userId, publicKey: kp.publicKey.toBase58(), encryptedSecret: encrypted } },
      { upsert: true }
    );
  } catch (e) {
    // No DB -> fallback to local file (NOT recommended)
    // Optionally write to wallets.json or skip
    console.warn("Wallet not persisted to DB:", e.message ?? e);
  }

  return { publicKey: kp.publicKey.toBase58(), secretBase64 };
}

export async function getWalletForUser(userId) {
  try {
    const db = getDB();
    const doc = await db.collection("wallets").findOne({ userId });
    if (!doc) return null;
    const secretBase64 = decryptText(doc.encryptedSecret);
    return { publicKey: doc.publicKey, secretBase64 };
  } catch (e) {
    console.warn("getWalletForUser failed:", e?.message ?? e);
    return null;
  }
}

// For admin
export async function listAllWallets() {
  const db = getDB();
  const rows = await db.collection("wallets").find({}).toArray();
  return rows.map(r => ({ userId: r.userId, publicKey: r.publicKey }));
       }
