// services/alerts.js
// Background poller: checks active watchlist entries and notifies users when target crossed.
// Uses: services/db.js (supabase), services/price.js (getPrice), and process.env.TELEGRAM_BOT_TOKEN to send messages.

const priceService = require("./price");
const db = require("./db");
const axios = require("axios");

const POLL_INTERVAL = Number(process.env.ALERT_POLL_INTERVAL || 60); // seconds
let _interval = null;

async function sendTelegramMessage(chatId, text) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(url, { chat_id: chatId, text, parse_mode: "Markdown" });
  } catch (err) {
    console.error("sendTelegramMessage error:", err.response?.data || err.message);
  }
}

async function checkOnce() {
  try {
    const supabase = db.supabase;
    if (!supabase) {
      console.warn("Alerts: Supabase not initialized");
      return;
    }

    // Fetch active watchlist rows
    const { data: rows, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("active", true)
      .limit(500);

    if (error) {
      console.error("Alerts: fetch watchlist error:", error);
      return;
    }

    if (!rows || rows.length === 0) return;

    // Iterate rows serially (to avoid hammering APIs)
    for (const r of rows) {
      try {
        const mint = r.mint;
        const target = Number(r.target_price);
        const dir = r.direction;
        const chat = r.telegram_id;

        const price = await priceService.getPrice(mint);
        if (price === null) continue; // cannot evaluate

        let triggered = false;
        if (dir === "above" && price >= target) triggered = true;
        if (dir === "below" && price <= target) triggered = true;

        if (!triggered) continue;

        // Send message
        const msg = `🔔 *Price Alert*\n\nToken: \`${mint}\`\nCurrent price: $${Number(price).toFixed(6)}\nTarget: ${dir} ${target}\nTriggered: ${new Date().toISOString()}`;

        await sendTelegramMessage(chat, msg);

        // Log alert and deactivate the watch (soft) to avoid duplicate alerts
        await supabase.from("alerts_log").insert({
          telegram_id: chat,
          mint,
          price,
        });

        await supabase.from("watchlist").update({ active: false }).eq("id", r.id);

      } catch (innerErr) {
        console.error("Alert row error:", innerErr);
        // continue loop
      }
    }
  } catch (err) {
    console.error("Alerts checkOnce error:", err);
  }
}

function start() {
  if (_interval) return; // already running
  // Initial run then interval
  checkOnce().catch((e) => console.error("Alerts initial run failed:", e));
  _interval = setInterval(() => {
    checkOnce().catch((e) => console.error("Alerts run failed:", e));
  }, POLL_INTERVAL * 1000);
  console.log(`Alerts started (interval ${POLL_INTERVAL}s)`);
}

function stop() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
    console.log("Alerts stopped");
  }
}

module.exports = { start, stop };
      
