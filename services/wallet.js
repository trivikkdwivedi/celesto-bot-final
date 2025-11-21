const { Keypair, Connection, PublicKey } = require("@solana/web3.js");
const crypto = require("crypto");
const mongoose = require("mongoose");

let walletModel = null;
let encryptionKey = null;

function encrypt(text) {
  const cipher = crypto.createCipheriv(
    "aes-256-ecb",
    Buffer.from(encryptionKey),
    null
  );
  return Buffer.concat([cipher.update(text), cipher.final()]).toString("hex");
}

function decrypt(hex) {
  const decipher = crypto.createDecipheriv(
    "aes-256-ecb",
    Buffer.from(encryptionKey),
    null
  );
  return Buffer.concat([
    decipher.update(Buffer.from(hex, "hex")),
    decipher.final(),
  ]).toString();
}

async function init({ encryptionKey: key, mongoUri }) {
  if (!key) throw new Error("ENCRYPTION_KEY missing");
  encryptionKey = key;

  if (mongoUri) {
    const schema = new mongoose.Schema({
      ownerId: String,
      publicKey: String,
      secretKey: String,
    });
    walletModel = mongoose.model("Wallet", schema);
  }
}

async function createWallet({ ownerId }) {
  if (!walletModel) throw new Error("Mongo not enabled");

  const kp = Keypair.generate();
  const pub = kp.publicKey.toBase58();
  const enc = encrypt(Buffer.from(kp.secretKey).toString("base64"));

  await walletModel.create({
    ownerId,
    publicKey: pub,
    secretKey: enc,
  });

  return { publicKey: pub };
}

async function getWallet(ownerId) {
  if (!walletModel) return null;
  return await walletModel.findOne({ ownerId });
}

async function getSolBalance(pubkey) {
  const connection = new Connection(process.env.SOLANA_RPC);
  const bal = await connection.getBalance(new PublicKey(pubkey));
  return bal / 1e9;
}

module.exports = {
  init,
  createWallet,
  getWallet,
  getSolBalance,
};
