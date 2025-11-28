const axios = require("axios");
const cache = require("./cache");

const BIRDEYE_TOKEN_URL = "https://public-api.birdeye.so/defi/tokenlist";
const JUPITER_TOKENLIST_URL = "https://tokens.jup.ag/tokens";

/**
 * Load & cache token lists from Birdeye + Jupiter
 */
async function loadTokenList() {
  const cached = cache.get("tokenlist");
  if (cached) return cached;

  try {
    // Fetch Birdeye list
    const birdeye = await axios.get(BIRDEYE_TOKEN_URL, {
      headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY },
      timeout: 10000,
    });

    let birdTokens = birdeye?.data?.data || [];

    // Fetch Jupiter list as fallback
    const jup = await axios.get(JUPITER_TOKENLIST_URL, { timeout: 10000 });

    let jupTokens = jup?.data || [];

    // Merge lists (remove duplicates)
    const map = new Map();

    for (const t of [...birdTokens, ...jupTokens]) {
      if (!t?.address) continue;
      map.set(t.address, {
        address: t.address,
        symbol: t.symbol || t.symbol,
        name: t.name || t.name,
        decimals: t.decimals || 9,
      });
    }

    const finalList = [...map.values()];

    cache.set("tokenlist", finalList, 300); // 5 minutes
    return finalList;
  } catch (err) {
    console.error("Token list load error:", err.message);
    return [];
  }
}

/**
 * Resolve user query (symbol / CA / name) into a token object
 */
async function resolve(query) {
  const tokens = await loadTokenList();
  if (!tokens.length) return null;

  const q = query.trim().toLowerCase();

  // 1️⃣ Direct mint address match
  const byAddress = tokens.find((t) => t.address.toLowerCase() === q);
  if (byAddress) return byAddress;

  // 2️⃣ Symbol match
  const bySymbol = tokens.find((t) => t.symbol?.toLowerCase() === q);
  if (bySymbol) return bySymbol;

  // 3️⃣ Name match
  const byName = tokens.find((t) => t.name?.toLowerCase() === q);
  if (byName) return byName;

  // 4️⃣ Fuzzy search (contains)
  const fuzzy = tokens.find(
    (t) =>
      t.symbol?.toLowerCase().includes(q) ||
      t.name?.toLowerCase().includes(q)
  );
  if (fuzzy) return fuzzy;

  return null;
}

module.exports = { resolve, loadTokenList };