const axios = require("axios");

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const BIRDEYE_BASE = "https://public-api.birdeye.so/defi/ohlcv";

async function getChart(mint) {
  try {
    const url = `${BIRDEYE_BASE}?address=${mint}&type=1H&limit=24`;

    const res = await axios.get(url, {
      headers: {
        accept: "application/json",
        "x-api-key": BIRDEYE_API_KEY,
      },
      timeout: 8000,
    });

    if (!res.data?.data?.items?.length) return null;

    return res.data.data.items; // array of candles
  } catch (err) {
    console.log("Chart error:", err.message);
    return null;
  }
}

module.exports = { getChart };