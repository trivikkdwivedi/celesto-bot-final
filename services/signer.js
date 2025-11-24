// services/signer.js — sign & send Jupiter swap transactions
const { Connection, Transaction } = require("@solana/web3.js");

const walletService = require("./wallet");
const db = require("./db");

/**
 * Sign and send a serialized Jupiter transaction
 *
 * @param {string} publicKey — user's wallet public key
 * @param {string} serializedTxBase64 — base64 encoded transaction returned from Jupiter
 */
async function signAndSend({ publicKey, serializedTxBase64 }) {
  if (!publicKey) throw new Error("publicKey required");
  if (!serializedTxBase64) throw new Error("serializedTxBase64 required");

  const row = await db.getWalletByPublicKey(publicKey);

  if (!row || !row.encrypted_secret) {
    throw new Error("Wallet not found or missing encrypted secret");
  }

  // Restore user keypair
  const keypair = walletService.keypairFromEncrypted(row.encrypted_secret);

  // Decode transaction (base64 → bytes → Transaction)
  const txBytes = Buffer.from(serializedTxBase64, "base64");
  const tx = Transaction.from(txBytes);

  // Sign transaction
  tx.sign(keypair);

  // Connect to RPC and send
  const conn = new Connection(
    process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com",
    "confirmed"
  );

  const raw = tx.serialize();
  const txSig = await conn.sendRawTransaction(raw, {
    skipPreflight: false,
    maxRetries: 3,
  });

  await conn.confirmTransaction(txSig, "confirmed");

  return txSig;
}

module.exports = {
  signAndSend,
};
