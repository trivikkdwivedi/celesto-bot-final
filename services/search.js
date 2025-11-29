const axios = require("axios");

async function searchTokens(query) {
  try {
    const url = `https://public-api.birdeye.so/defi/v3/search?query=${encodeURIComponent(query)}`;

    const res = await axios.get(url, {
      headers: {
        Accept: "application/json",
        "X-API-KEY": process.env.BIRDEYE_API_KEY
      },
      timeout: 5000
    });

    return res.data?.data?.tokens || [];
  } catch (err) {
    console.error("Token search error:", err.message);
    return [];
  }
}

module.exports = { searchTokens };
