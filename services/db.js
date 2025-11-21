// services/db.js
import { MongoClient } from "mongodb";

let client;
let db;

export async function connectDB(mongoUri) {
  if (!mongoUri) {
    console.log("No MONGO_URI provided — running without DB.");
    return null;
  }
  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(process.env.MONGO_DB || "celesto");
  console.log("MongoDB connected");
  return db;
}

export function getDB() {
  if (!db) throw new Error("DB not connected");
  return db;
}
