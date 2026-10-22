# VFX SMM PANEL

VFX SMM PANEL is a social media marketing panel starter for Vercel and Netlify. This repository contains VFX-branded landing, login, signup, services, dashboard, admin review, and password-reset pages, serverless API handlers, a Neon-style theme, and a Supabase SQL schema.

## Important setup before use
1. Create a Supabase project.
2. Run the entire `sql/schema.sql` in the Supabase SQL Editor.
3. Add these server-side environment variables to your deployment: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `SMM_PROVIDER_URL`, and `SMM_PROVIDER_KEY`. Optionally set `SMM_MARKUP_PERCENT` (0–500).
4. `ADMIN_PASSWORD` must be a new, unique strong password; `ADMIN_SESSION_SECRET` must be randomly generated and at least 32 characters.
5. Never put the service-role key, admin password, session secret, or SMM provider key into frontend code or a public repository.
6. Test login, deposits, order charging, provider rejection/refunds, and admin approvals on a private deployment before launching.

## Hosting
- **Vercel:** `vercel.json` and root `api/` functions.
- **Netlify:** `netlify.toml` and `netlify/functions/api.js` adapter.
- **PHP shared hosting:** The source ZIP includes an alternative PHP API adapter; review and configure its private settings locally before uploading it to a PHP host. Never commit real credentials.

## Limitations
- Supabase and SMM provider accounts/credentials are not included.
- Manual deposits require an administrator to verify the actual payment before approving it. Automatic payment verification is not included.
- Provider order status refresh is not automatic in this starter.
- Social platform rules and provider terms must be followed.
