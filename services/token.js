// services/token.js — Resolve CA / symbol / name into mint metadata
const axios = require("axios");
const cache = require("./cache");

const BIRDEYE_LIST_URL = "https://public-api.birdeye.so/public/tokenlist";

async function loadTokenList() {
  // Check cache (10 min)
  const cached = cache.get("tokenlist");
  if (cached) return cached;

  try {
    const res = await axios.get(BIRDEYE_LIST_URL, {
      headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY },
    });

    const list = res.data?.data?.tokens || [];

    // Cache for 10 minutes
    cache.set("tokenlist", list, 600);

    return list;
  } catch (err) {
    console.error("Token list load error:", err.message);
    return [];
  }
}

/**
 * Resolve CA / symbol / name → token object
 */
async function resolve(query) {
  if (!query) return null;

  const q = query.trim().toLowerCase();
  const list = await loadTokenList();

  if (!list.length) return null;

  // CA exact match
  const exactCA = list.find((t) => t.address?.toLowerCase() === q);
  if (exactCA) {
    return {
      address: exactCA.address,
      symbol: exactCA.symbol,
      name: exactCA.name,
    };
  }

  // Symbol exact match
  const symExact = list.find((t) => t.symbol?.toLowerCase() === q);
  if (symExact) {
    return {
      address: symExact.address,
      symbol: symExact.symbol,
      name: symExact.name,
    };
  }

  // Name exact match
  const nameExact = list.find((t) => t.name?.toLowerCase() === q);
  if (nameExact) {
    return {
      address: nameExact.address,
      symbol: nameExact.symbol,
      name: nameExact.name,
    };
  }

  // Partial symbol match
  const symPartial = list.find((t) =>
    t.symbol?.toLowerCase().includes(q)
  );
  if (symPartial) {
    return {
      address: symPartial.address,
      symbol: symPartial.symbol,
      name: symPartial.name,
    };
  }

  // Partial name match
  const namePartial = list.find((t) =>
    t.name?.toLowerCase().includes(q)
  );
  if (namePartial) {
    return {
      address: namePartial.address,
      symbol: namePartial.symbol,
      name: namePartial.name,
    };
  }

  return null;
}

module.exports = {
  resolve,
  loadTokenList,
};