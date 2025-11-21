// utils/encrypt.js
import crypto from "crypto";

const KEY = process.env.ENCRYPTION_KEY || "";
if (KEY.length < 32) {
  // only log once
  // console.warn("ENCRYPTION_KEY is not set or < 32 chars — encryption weak");
}

const ALGO = "aes-256-gcm";

function keyBuffer() {
  // use first 32 bytes of provided key (utf-8)
  return Buffer.from(KEY, "utf8").slice(0, 32);
}

export function encryptText(plain) {
  if (!KEY) throw new Error("Encryption key not set");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, keyBuffer(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptText(enc) {
  if (!KEY) throw new Error("Encryption key not set");
  const data = Buffer.from(enc, "base64");
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const cipherText = data.slice(28);
  const decipher = crypto.createDecipheriv(ALGO, keyBuffer(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return plain.toString("utf8");
}
