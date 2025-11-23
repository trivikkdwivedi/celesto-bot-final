// services/price.js - uses CoinGecko simple price API
const axios = require('axios');

const SYMBOL_MAP = {
  'SOL': 'solana',
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether'
  // add more as needed
};

async function getPrice(symbol) {
  try {
    const s = (symbol || 'SOL').toUpperCase();
    const cgId = SYMBOL_MAP[s] || s.toLowerCase(); // fallback
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(cgId)}&vs_currencies=usd`;
    const r = await axios.get(url, { timeout: 7000 });
    if (!r.data || !r.data[cgId] || !r.data[cgId].usd) return null;
    return r.data[cgId].usd;
  } catch (err) {
    console.warn('price fetch err', err?.message);
    return null;
  }
}

module.exports = { getPrice };
