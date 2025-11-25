// handlers/info.js — production-ready token overview (Birdeye primary, cached)
const axios = require("axios");
const tokenService = require("../services/token");
const priceService = require("../services/price");
const cache = require("../services/cache");
const { Markup } = require("telegraf");

const API_KEY = process.env.BIRDEYE_API_KEY;
const BASE = process.env.BIRDEYE_BASE_URL || "https://public-api.birdeye.so";

// --------------- helpers ---------------
function fmtNumber(n, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "N/A";
  if (Math.abs(n) >= 1) return Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n);
  // small numbers show more precision
  return Number(n).toFixed(6);
}
function money(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "N/A";
  // use compact for big numbers
  if (Math.abs(n) >= 1_000_000_000) {
    return `$${(n / 1_000_000_000).toFixed(2)}B`;
  } else if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2)}M`;
  } else if (Math.abs(n) >= 1_000) {
    return `$${(n / 1_000).toFixed(2)}K`;
  }
  return `$${Number(n).toFixed(2)}`;
}

function buildKeyboard(mint) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📈 Chart", `chart|${mint}|1D`),
      Markup.button.callback("🔁 Refresh Info", `info_refresh|${mint}`)
    ],
    [
      Markup.button.callback("🛒 Buy", `buy|${mint}`),
      Markup.button.callback("📤 Sell", `sell|${mint}`)
    ],
    [
      Markup.button.url("🔎 Solscan", `https://solscan.io/token/${mint}`),
      Markup.button.url("📊 DexScreener", `https://dexscreener.com/solana/${mint}`)
    ]
  ]);
}

// --------------- handler ---------------
module.exports = async function infoCommand(ctx) {
  try {
    const parts = ctx.message?.text?.split(/\s+/).slice(1) || [];
    const rawQuery = parts.join(" ").trim();
    if (!rawQuery) return ctx.reply("ℹ️ Usage: /info <token-symbol|name|mint>");

    // cache key for resolved token metadata + market overview
    const searchKey = `info:${rawQuery.toLowerCase()}`;
    const cached = cache.get(searchKey);
    if (cached) {
      // send cached result (still attach keyboard)
      return ctx.reply(cached.text, { parse_mode: "Markdown", ...buildKeyboard(cached.mint) });
    }

    // Resolve token (symbol | name | mint)
    const token = await tokenService.resolve(rawQuery);
    if (!token || !token.address) {
      // If rawQuery looks like a pubkey, still try to use it as mint
      return ctx.reply(`❌ Could not resolve token: "${rawQuery}"`);
    }

    const mint = token.address;
    const symbol = token.symbol || token.name || rawQuery.toUpperCase();
    const name = token.name || symbol;

    // Get price (Birdeye primary, DexScreener fallback inside priceService)
    const price = await priceService.getPrice(mint);

    // Fetch Birdeye token_overview (market data)
    let overview = null;
    try {
      const url = `${BASE}/defi/token_overview?address=${encodeURIComponent(mint)}`;
      const res = await axios.get(url, {
        headers: { "X-API-KEY": API_KEY, accept: "application/json" },
        timeout: 8000,
      });
      overview = res.data?.data || null;
    } catch (err) {
      // log, but continue with whatever we have
      console.warn("Birdeye token_overview error:", err.message || err);
    }

    // Compose fields with safe fallbacks
    const priceStr = price ? `$${Number(price).toFixed(6)}` : "N/A";
    const marketCap = overview?.marketCap ?? overview?.market_cap ?? null;
    const fdv = overview?.fdv ?? null;
    const liquidity = overview?.liquidity ?? overview?.liquidity_usd ?? null;
    const volume24 = overview?.volume24h ?? overview?.volume_24h ?? null;
    const change24 = (overview?.priceChange24h ?? overview?.price_change_24h ?? null);

    const holders = overview?.holderCount ?? overview?.holders ?? null;
    const totalSupply = overview?.totalSupply ?? overview?.supply ?? null;

    const lines = [];
    lines.push(`📊 *${name}* — *${symbol}*`);
    lines.push("");
    lines.push(`📌 *Mint:* \`${mint}\``);
    lines.push("");
    lines.push(`💵 *Price:* ${priceStr}`);
    lines.push(`📉 *24h:* ${change24 !== null && change24 !== undefined ? (change24 >= 0 ? "🟢 " : "🔴 ") + `${Number(change24).toFixed(2)}%` : "N/A"}`);
    lines.push(`💰 *Market Cap:* ${marketCap ? money(Number(marketCap)) : "N/A"}`);
    lines.push(`🏦 *FDV:* ${fdv ? money(Number(fdv)) : "N/A"}`);
    lines.push(`🧪 *Liquidity:* ${liquidity ? money(Number(liquidity)) : "N/A"}`);
    lines.push(`📈 *24h Volume:* ${volume24 ? money(Number(volume24)) : "N/A"}`);
    lines.push(`👥 *Holders:* ${holders ? fmtNumber(holders, 0) : "N/A"}`);
    if (totalSupply) lines.push(`🔢 *Total Supply:* ${fmtNumber(totalSupply, 0)}`);
    lines.push("");
    // optional links from token metadata (extensions)
    const website = token.extensions?.website || token.extensions?.homepage || null;
    const twitter = token.extensions?.twitter || (token.extensions?.socials?.twitter) || null;
    const cg = token.extensions?.coingeckoId || null;

    const linkParts = [];
    linkParts.push(`[Birdeye](https://birdeye.so/token/${mint}?chain=solana)`);
    linkParts.push(`[DexScreener](https://dexscreener.com/solana/${mint})`);
    linkParts.push(`[Solscan](https://solscan.io/token/${mint})`);
    if (website) linkParts.push(`[Website](${website})`);
    if (twitter) linkParts.push(`[Twitter](${twitter})`);
    if (cg) linkParts.push(`[Coingecko](${`https://www.coingecko.com/en/coins/${encodeURIComponent(cg)}`})`);

    lines.push(`🔗 *Links:* ${linkParts.join(" | ")}`);

    const text = lines.join("\n");

    // cache result for 30 seconds
    cache.set(searchKey, { text, mint }, 30);

    // reply with inline keyboard
    return ctx.reply(text, { parse_mode: "Markdown", ...buildKeyboard(mint) });
  } catch (err) {
    console.error("infoCommand error:", err);
    return ctx.reply("⚠️ Failed to fetch token info. Try again in a bit.");
  }
};