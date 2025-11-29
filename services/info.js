const axios = require("axios");

async function getTokenOverview(mint) {
  try {
    const url = `https://public-api.birdeye.so/defi/token_overview?address=${mint}`;
    const res = await axios.get(url, {
      headers: {
        "X-API-KEY": process.env.BIRDEYE_API_KEY,
        Accept: "application/json",
      },
      timeout: 8000,
    });

    return res.data?.data || null;
  } catch (err) {
    console.error("Birdeye info error:", err.message);
    return null;
  }
}

module.exports = { getTokenOverview };