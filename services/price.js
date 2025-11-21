const axios = require("axios");

async function getPrice(symbol = "SOL") {
  const src = process.env.PRICE_SOURCE || "coingecko";

  if (src === "coingecko") {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`;

    const r = await axios.get(url);
    return r.data[symbol.toLowerCase()]?.usd;
  }

  return null;
}

module.exports = { getPrice };
