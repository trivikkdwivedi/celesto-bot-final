const { Markup } = require("telegraf");

// MAIN MENU
function mainMenu() {
  return Markup.keyboard([
    ["📊 Price", "ℹ️ Info"],
    ["💱 Swap", "📈 Chart"],
    ["👛 Wallet", "🧰 Tools"]
  ]).resize().persistent();
}

// SWAP MENU
function swapMenu() {
  return Markup.keyboard([
    ["🛒 Buy", "💱 Sell"],
    ["🔁 Quick Buy"],
    ["⬅️ Back"]
  ]).resize();
}

// WALLET MENU
function walletMenu() {
  return Markup.keyboard([
    ["👛 Create Wallet"],
    ["🔑 My Wallet"],
    ["💰 Balance"],
    ["📈 Portfolio"],
    ["⬅️ Back"]
  ]).resize();
}

// TOOLS MENU
function toolsMenu() {
  return Markup.keyboard([
    ["📢 Alerts"],
    ["👀 Watchlist"],
    ["🧮 Calculator"],
    ["⬅️ Back"]
  ]).resize();
}

module.exports = {
  mainMenu,
  swapMenu,
  walletMenu,
  toolsMenu
};