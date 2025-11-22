const axios = require('axios');

async function getPrice(symbol = "SOL") {
  try {
    const idMap = {
      SOL: "solana",
      BTC: "bitcoin",
      ETH: "ethereum",
      USDT: "tether"
    };

    const id = idMap[symbol.toUpperCase()];
    if (!id) return null;

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;

    const response = await axios.get(url);
    return response.data[id]?.usd || null;

  } catch (err) {
    console.error("Price error:", err);
    return null;
  }
}

module.exports = { getPrice };
