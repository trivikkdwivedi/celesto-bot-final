// tests/run-tests.js — simple sanity test for Jupiter services

const token = require("../services/token");
const price = require("../services/price");

async function run() {
  try {
    console.log("=== Celesto Bot Sanity Test ===\n");

    console.log("Resolving SOL token...");
    const sol = await token.resolve("SOL");
    console.log("Token:", sol);

    if (!sol || !sol.address) {
      console.error("❌ Token resolve failed.");
      process.exit(1);
    }

    console.log("\nFetching SOL price from Jupiter...");
    const p = await price.getPrice(sol.address);
    console.log("Price:", p);

    if (!p || isNaN(p)) {
      console.error("❌ Failed to fetch Jupiter price.");
      process.exit(1);
    }

    console.log("\n✔️ SUCCESS — Jupiter price + token resolver working!\n");
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  }
}

run();
