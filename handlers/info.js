// handlers/info.js — improved, card-style token info with action buttons
const tokenService = require("../services/token");
const priceService = require("../services/price");
const infoService = require("../services/info"); // should expose getInfo(mint) => metadata
const { Markup } = require("telegraf");

function fmtNum(v, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "N/A";
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return Number(v).toFixed(digits);
}

function shortText(s, n = 300) {
  if (!s) return null;
  return s.length > n ? s.slice(0, n).trim() + "…" : s;
}

async function infoCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1) || [];
    if (parts.length === 0) return ctx.reply("ℹ️ Usage: /info <token>");

    const query = parts.join(" ").trim();
    const token = await tokenService.resolve(query);

    if (!token || !token.address) {
      return ctx.reply(`❌ Unknown token: <code>${query}</code>`, { parse_mode: "HTML" });
    }

    const mint = token.address;
    const symbol = token.symbol || query.toUpperCase();
    const name = token.name || symbol;

    // Price (primary)
    const price = await priceService.getPrice(mint);

    // Extra info (market data, socials) — infoService should return a unified object
    // expected fields (best-effort): priceChange24h, volume24h, marketCap, liquidity, holders, website, twitter, description
    let info = null;
    try {
      info = await infoService.getInfo(mint);
      // normalize some common key variations
      info = info || {};
    } catch (e) {
      console.warn("infoService.getInfo error:", e?.message || e);
      info = {};
    }

    const change = info.priceChange24h ?? info.change24h ?? null;
    const vol = info.volume24h ?? info.v24h ?? null;
    const mcap = info.marketCap ?? info.mc ?? null;
    const liquidity = info.liquidity ?? null;
    const holders = info.holders ?? null;
    const website = info.website ?? info.website_url ?? null;
    const twitter = info.twitter ?? info.twitter_url ?? null;
    const description = shortText(info.description || info.desc || token.description, 360);

    const changeEmoji = change > 0 ? "📈" : (change < 0 ? "📉" : "➖");
    const changeStr = (change === null || change === undefined) ? "N/A" : `${Number(change).toFixed(2)}%`;

    // Build card-style HTML message
    let html = `<pre>━━━━━━━━━━━━━━━━━━━━</pre>\n`;
    html += `<b>💎 ${name} <code>(${symbol})</code></b>\n\n`;

    html += `<b>💰 Price:</b> ${price !== null ? `<code>$${Number(price).toFixed(6)}</code>` : "<i>N/A</i>"}\n`;

    if (change !== null && change !== undefined) {
      html += `${changeEmoji} <b>24h Change:</b> <code>${changeStr}</code>\n`;
    }

    if (vol !== null && vol !== undefined) {
      html += `🔄 <b>Volume (24h):</b> <code>$${fmtNum(vol)}</code>\n`;
    }

    if (mcap !== null && mcap !== undefined) {
      html += `🏦 <b>Market Cap:</b> <code>$${fmtNum(mcap)}</code>\n`;
    }

    if (liquidity !== null && liquidity !== undefined) {
      html += `💧 <b>Liquidity:</b> <code>$${fmtNum(liquidity)}</code>\n`;
    }

    if (holders !== null && holders !== undefined) {
      html += `👥 <b>Holders:</b> <code>${fmtNum(holders, 0)}</code>\n`;
    }

    if (description) {
      html += `\n<b>📝 Description:</b>\n${description}\n`;
    }

    // footer with site/twitter
    let links = [];
    if (website) links.push(`<a href="${website}">Website</a>`);
    if (twitter) links.push(`<a href="${twitter}">Twitter</a>`);

    if (links.length) {
      html += `\n${links.join(" • ")}\n`;
    }

    html += `<pre>━━━━━━━━━━━━━━━━━━━━</pre>`;

    // Inline buttons: Price, Chart, Buy, Sell, Refresh
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("💲 Price", `price_refresh|${mint}`),
        Markup.button.callback("📊 Chart", `chart|${mint}`),
      ],
      [
        Markup.button.callback("🛒 Buy", `buy|${mint}`),
        Markup.button.callback("🧾 Sell", `sell|${mint}`),
      ],
      [
        Markup.button.callback("🔁 Refresh Info", `info_refresh|${mint}`),
      ],
    ]);

    // send as HTML to allow links and bold
    return ctx.replyWithHTML(html, keyboard);
  } catch (err) {
    console.error("/info error:", err);
    return ctx.reply("⚠️ Failed to load token info. Try again later.");
  }
}

module.exports = infoCommand; 