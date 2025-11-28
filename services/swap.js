const axios = require("axios");
const { Connection, VersionedTransaction, Keypair } = require("@solana/web3.js");
const walletService = require("./wallet");

const JUP_AGGREGATOR = "https://quote-api.jup.ag/v6";

module.exports = {
  /**
   * Executes a Jupiter swap
   * @param {object} params
   * @returns {object} { signature }
   */
  async executeSwap({ wallet, inputMint, outputMint, amountIn }) {
    try {
      const connection = walletService.connection;
      const keypair = walletService.keypairFromEncrypted(wallet.encryptedSecret);

      // Get quote
      const quoteURL =
        `${JUP_AGGREGATOR}/quote` +
        `?inputMint=${inputMint}` +
        `&outputMint=${outputMint}` +
        `&amount=${Math.floor(amountIn * 1e6)}` + // assume 6 decimals (SOL, most SPL)
        `&slippageBps=100`; // 1% slippage

      const quote = await axios.get(quoteURL);
      if (!quote.data) return null;

      // Get swap transaction
      const { data: swapTx } = await axios.post(`${JUP_AGGREGATOR}/swap`, {
        quote: quote.data,
        userPublicKey: wallet.publicKey,
      });

      const txBuf = Buffer.from(swapTx.swapTransaction, "base64");
      const tx = VersionedTransaction.deserialize(txBuf);

      tx.sign([keypair]);

      const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });

      return { signature: sig };
    } catch (err) {
      console.error("swap execute error:", err);
      return null;
    }
  },
};