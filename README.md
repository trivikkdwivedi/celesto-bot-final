# Celesto Bot (Supabase + Railway)

## Setup (local / Railway / Supabase)
1. Create a Supabase project.
2. Create the `users` and `wallets` tables (run the SQL above).
3. In Supabase → API, copy your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. Create a Railway project and add the repo.
5. Add environment variables in Railway:
   - TELEGRAM_BOT_TOKEN
   - ADMIN_TELEGRAM_ID
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - ENCRYPTION_KEY (recommended 32+ chars)
   - SOLANA_RPC (optional; default devnet)
6. Deploy. Railway will run `npm install` and `npm start`.

## Notes
- Private keys are encrypted with ENCRYPTION_KEY before storing in Supabase.
- `SUPABASE_ANON_KEY` is used here; do not use `service_role` on client side.
- For production, tighten Supabase policies and consider using a server key stored securely.


