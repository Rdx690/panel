# VFX SMM PANEL

VFX SMM PANEL is a social media marketing panel starter supporting Vercel, Netlify, and PHP shared hosting. It includes login/signup pages, a dashboard, services page, admin tools, API routes, and a Supabase schema.

## Setup

1. Create a Supabase project and run `sql/schema.sql` in the Supabase SQL editor.
2. Configure environment variables on your host: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `SMM_PROVIDER_URL`, and `SMM_PROVIDER_KEY`.
3. Use a strong, unique admin password and a random session secret (at least 32 characters).
4. Add your SMM provider's actual API credentials only to server-side environment settings. Never place service-role keys or provider keys in frontend code.
5. Test signup, login, deposits, order creation, and refunds in a private deployment before public launch.

## Hosting

- Vercel: see `vercel.json` and the `api/` folder.
- Netlify: see `netlify.toml` and `netlify/functions/`.
- PHP hosting: see `php-api/`; configure `php-api/config.php` with your own values before deploying there.

The included configuration values are placeholders. You must supply your own Supabase project and provider account. Manual payment submissions require human verification; the repository does not automatically verify transfers.
