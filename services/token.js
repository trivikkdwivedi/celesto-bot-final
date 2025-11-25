// services/token.js
const axios = require("axios");
const cache = require("./cache");

const TOKENLIST_URL =
  process.env.JUPITER_TOKENLIST_URL ||
  "https://raw.githubusercontent.com/jup-ag/token-list/main/src/tokens/solana.tokenlist.json";

const CACHE_KEY = "tokenlist";
const CACHE_TTL = 60 * 10; // 10 minutes

async function loadTokenList() {
  const cached = cache.get(CACHE_KEY);
  if (cached) return cached;

  try {
    const res = await axios.get(TOKENLIST_URL, { timeout: 8000 });
    const json = res.data;
    const list = Array.isArray(json.tokens) ? json.tokens : json;
    cache.set(CACHE_KEY, list, CACHE_TTL);
    return list;
  } catch (err) {
    console.warn("Token list load error:", err.message || err);
    cache.set(CACHE_KEY, [], 30);
    return [];
  }
}

function looksLikePubkey(s) {
  if (!s || typeof s !== "string") return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,60}$/.test(s);
}

function norm(s) {
  return (s || "").toString().trim().toUpperCase();
}

async function resolve(query) {
  if (!query) return null;
  const q = query.toString().trim();
  if (!q) return null;

  if (norm(q) === "SOL" || norm(q) === "SOLANA") {
    return {
      address: "SOL",
      symbol: "SOL",
      name: "Solana",
      decimals: 9,
      extensions: { coingeckoId: "solana" },
    };
  }

  if (looksLikePubkey(q)) {
    return {
      address: q,
      symbol: null,
      name: null,
      decimals: null,
      extensions: {},
    };
  }

  const list = await loadTokenList();
  if (!list || list.length === 0) return null;

  const nq = norm(q);

  const bySymbol = list.find((t) => norm(t.symbol) === nq);
  if (bySymbol)
    return {
      address: bySymbol.address,
      symbol: bySymbol.symbol,
      name: bySymbol.name,
      decimals: bySymbol.decimals,
      extensions: bySymbol.extensions || {},
    };

  const byName = list.find((t) => norm(t.name) === nq);
  if (byName)
    return {
      address: byName.address,
      symbol: byName.symbol,
      name: byName.name,
      decimals: byName.decimals,
      extensions: byName.extensions || {},
    };

  const byNamePartial = list.find((t) =>
    (t.name || "").toLowerCase().includes(q.toLowerCase())
  );
  if (byNamePartial)
    return {
      address: byNamePartial.address,
      symbol: byNamePartial.symbol,
      name: byNamePartial.name,
      decimals: byNamePartial.decimals,
      extensions: byNamePartial.extensions || {},
    };

  return null;
}

async function getByMint(mint) {
  if (!mint) return null;
  const list = await loadTokenList();
  return list.find((t) => t.address === mint) || null;
}

module.exports = {
  resolve,
  getByMint,
  loadTokenList,
};