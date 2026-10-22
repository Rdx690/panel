# VFX SMM PANEL setup notes

This project is served as a Vercel-style static site with serverless API handlers under `api/`.

Required server environment variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `ADMIN_PASSWORD` (strong unique password)
- `ADMIN_SESSION_SECRET` (random string with at least 32 characters)
- `SMM_PROVIDER_URL`
- `SMM_PROVIDER_KEY` (server-only)
- Optional `SMM_MARKUP_PERCENT` (0–500)

Run `sql/schema.sql` in the Supabase SQL editor before testing. This starter does not provide provider credentials, database hosting, or automatic payment verification. Keep all private keys out of frontend assets.
