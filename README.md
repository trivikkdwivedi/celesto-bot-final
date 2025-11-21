# Celesto Bot

Celesto Bot — development-ready Telegram trading bot skeleton for Solana.  
This repo is designed to be run in GitHub Codespaces for development and Railway for production hosting.

> IMPORTANT: This is a development skeleton. Do not use real funds until you replace placeholder trade implementations with audited DEX calls and secure key management.

## Features
- Telegram commands (start, createwallet, mywallet, price, buy, sell)
- Devnet-ready wallet generation (Keypair)
- Price fetcher (Coingecko default)
- Placeholder trade service (demo)
- Optional MongoDB support for user storage
- AES-256-based encryption helper (configurable via ENCRYPTION_KEY)

## Folder Structure
## Quick start (Codespaces / Local)
1. Copy .env.example → .env and fill values.
2. npm install
3. npm start

### Railway deployment
1. Push repo to GitHub.
2. Create Railway project → Deploy from GitHub → select celesto-bot.
3. In Railway Project → Environment → add .env keys (TELEGRAM_BOT_TOKEN, etc).
4. Set Start Command: node index.js
5. Deploy and check logs.

## Commands
- /start - welcome
- /createwallet - create devnet wallet (secret returned; **do not use with real funds**)
- /mywallet - show public key
- /price - get SOL price
- /buy <usd> - simulated buy
- /sell <amount> - simulated sell
- /admin <cmd> - admin commands (only ADMIN_TELEGRAM_ID)

## Next steps
- Integrate Jupiter or Raydium swaps for real trading
- Replace simple wallet storage with encrypted DB or secrets manager
- Add rate-limiting, monitoring, and safety checks

---

Local reference image path (uploaded earlier):
/mnt/data/IMG_701AE3E8-A362-44C7-BBD5-1519170BA69F.jpeg
