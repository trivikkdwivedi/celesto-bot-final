// services/token.js - token resolver for Jupiter
const axios = require('axios');

const TOKEN_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours
let cache = { ts: 0, tokens: null };

// Fetch Jupiter token list with fallback
async function fetchTokens() {
  const now = Date.now();
  if (cache.tokens && (now - cache.ts) < TOKEN_CACHE_TTL) return cache.tokens;

  const urls = [
    'https://cache.jup.ag/tokens',
    'https://tokens.jup.ag/tokens',
  ];

  let lastErr = null;
  for (const url of urls) {
    try {
      const r = await axios.get(url, { timeout: 8000 });
      if (r && r.data) {
        const list = Array.isArray(r.data)
          ? r.data
          : (r.data.tokens || r.data);

        if (Array.isArray(list) && list.length) {
          cache = { ts: now, tokens: list };
          return list;
        }
      }
    } catch (err) {
      lastErr = err;
    }
  }

  console.warn("fetchTokens failed:", lastErr?.message);
  return [];
}

// Resolve symbol/name/mint → token object
async function resolve(query) {
  if (!query) return null;
  const q = String(query).trim();

  // Mint check (base58)
  if (q.length >= 32 && q.length <= 44) {
    const tokens = await fetchTokens();
    const found = tokens.find(
      (t) => t.address === q || t.mint === q || t.id === q
    );
    if (found) return normalize(found);
    return { address: q, symbol: null, name: null, decimals: 9 };
  }

  const tokens = await fetchTokens();
  const up = q.toUpperCase();

  let found = tokens.find((t) => t.symbol?.toUpperCase() === up);
  if (found) return normalize(found);

  found = tokens.find((t) => t.name?.toUpperCase() === up);
  if (found) return normalize(found);

  found = tokens.find(
    (t) =>
      t.symbol?.toUpperCase().includes(up) ||
      t.name?.toUpperCase().includes(up)
  );
  if (found) return normalize(found);

  return null;
}

// Normalize token object shape
function normalize(t) {
  return {
    address: t.address || t.id || t.mint,
    symbol: t.symbol || t.tokenSymbol || null,
    name: t.name || t.tokenName || null,
    decimals: t.decimals || t.tokenDecimals || 9,
  };
}

module.exports = {
  fetchTokens,
  resolve,
};
