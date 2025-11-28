// handlers/watchlist.js
// Commands:
// /watch add <mint|symbol> <above|below> <price>
// /watch list
// /watch remove <id>

const tokenService = require("../services/token");
const priceService = require("../services/price");
const db = require("../services/db"); // uses db.supabase

function parseFloatSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

module.exports = async function watchHandler(ctx) {
  try {
    const text = ctx.message?.text || "";
    const parts = text.split(/\s+/).slice(1);
    if (!parts || parts.length === 0) {
      return ctx.reply(
        "📌 Watchlist usage:\n" +
        "/watch add <token> <above|below> <price>\n" +
        "/watch list\n" +
        "/watch remove <id>"
      );
    }

    const sub = parts[0]?.toLowerCase();

    // ---- ADD ----
    if (sub === "add") {
      if (parts.length < 4) {
        return ctx.reply("Usage: /watch add <token> <above|below> <price>");
      }

      const [, tokenQuery, dirRaw, priceRaw] = ["", parts[1], parts[2], parts[3]]; // shift
      const direction = dirRaw?.toLowerCase();
      if (!["above", "below"].includes(direction)) {
        return ctx.reply("Direction must be `above` or `below`.");
      }
      const target = parseFloatSafe(priceRaw);
      if (target === null) return ctx.reply("Invalid price.");

      // Resolve token to mint
      const tok = await tokenService.resolve(tokenQuery);
      if (!tok || !tok.address) {
        return ctx.reply(`❌ Could not resolve token: ${tokenQuery}`);
      }

      // Insert into Supabase watchlist
      const supabase = db.supabase;
      if (!supabase) return ctx.reply("DB not configured on server.");

      const telegramId = String(ctx.from.id);

      const { data, error } = await supabase
        .from("watchlist")
        .insert({
          telegram_id: telegramId,
          mint: tok.address,
          target_price: target,
          direction,
          active: true,
        });

      if (error) {
        console.error("watchlist insert error:", error);
        return ctx.reply("❌ Failed to add watchlist entry.");
      }

      const id = data?.[0]?.id || "unknown";

      return ctx.reply(
        `✅ Watch added (id: ${id})\nToken: ${tok.symbol || tok.address}\nDirection: ${direction}\nTarget: ${target}`
      );
    }

    // ---- LIST ----
    if (sub === "list") {
      const supabase = db.supabase;
      if (!supabase) return ctx.reply("DB not configured on server.");
      const telegramId = String(ctx.from.id);

      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .eq("telegram_id", telegramId)
        .order("id", { ascending: false })
        .limit(200);

      if (error) {
        console.error("watchlist list error:", error);
        return ctx.reply("❌ Failed to fetch watchlist.");
      }

      if (!data || data.length === 0) {
        return ctx.reply("You have no watchlist entries.");
      }

      const lines = data.map((r) => {
        return `• id:${r.id} ${r.mint} — ${r.direction} ${r.target_price} — active:${r.active ? "yes" : "no"}`;
      });

      return ctx.reply(`📋 Your watchlist:\n\n${lines.join("\n")}`);
    }

    // ---- REMOVE ----
    if (sub === "remove") {
      if (parts.length < 2) return ctx.reply("Usage: /watch remove <id>");
      const id = Number(parts[1]);
      if (!Number.isInteger(id)) return ctx.reply("Invalid id.");

      const supabase = db.supabase;
      if (!supabase) return ctx.reply("DB not configured on server.");

      const telegramId = String(ctx.from.id);

      // Soft-deactivate (safer)
      const { data, error } = await supabase
        .from("watchlist")
        .update({ active: false })
        .eq("id", id)
        .eq("telegram_id", telegramId);

      if (error) {
        console.error("watchlist remove error:", error);
        return ctx.reply("❌ Failed to remove watchlist entry.");
      }

      if (!data || data.length === 0) {
        return ctx.reply("No matching entry found or you are not the owner.");
      }

      return ctx.reply(`✅ Watchlist entry ${id} deactivated.`);
    }

    return ctx.reply("Unknown /watch subcommand.");
  } catch (err) {
    console.error("/watch error:", err);
    return ctx.reply("⚠️ Watchlist command failed.");
  }
};
        
