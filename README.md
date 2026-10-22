# VFX SMM PANEL

VFX SMM PANEL is a Vercel-hosted starter using Firebase Authentication and Firebase Realtime Database.

## Firebase setup
1. In Firebase Console for project `sourajit-vfx`, enable **Authentication → Sign-in method → Email/Password**.
2. Create/enable the Realtime Database at `https://sourajit-vfx-default-rtdb.firebaseio.com`.
3. In Google Cloud Console, revoke any service-account key previously shared in chat and create a replacement key.
4. In Vercel → Project → Settings → Environment Variables, add:
   - `FIREBASE_DATABASE_URL` = `https://sourajit-vfx-default-rtdb.firebaseio.com`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = the full JSON contents of the new service account key (keep private; never commit it)
   - `ADMIN_PASSWORD` = a unique strong admin password
   - `ADMIN_SESSION_SECRET` = a randomly generated secret of at least 32 characters
   - `SMM_PROVIDER_URL` and `SMM_PROVIDER_KEY` = your SMM provider API settings (only if placing real orders)
   - `SMM_MARKUP_PERCENT` = optional, 0–500
5. Set Firebase Realtime Database rules so clients cannot read or write the wallet/deposit/order records directly. The server uses the Admin SDK, which bypasses client rules. For example, start with:
   ```json
   { "rules": { ".read": false, ".write": false } }
   ```
6. Redeploy after setting environment variables. Configure Firebase Authentication authorized domains to include the deployed Vercel domain.

## Data layout
- `users/{uid}` can hold user profile metadata.
- `wallets/{uid}` holds wallet balance.
- `deposits/{depositId}` holds manual deposit requests.
- `orders/{orderId}` holds orders.
- `walletTransactions/{transactionId}` records wallet activity.
- `transactionIds/{base64url(transactionId)}` prevents reusing a submitted payment reference.

## Important behavior
- Deposits are manual. An administrator must independently verify a payment before approval.
- Order creation reserves wallet funds; a provider rejection refunds the reserved amount.
- Provider order-status refresh and automatic payment verification are not included.
- Never store Firebase service-account keys, admin passwords, session secrets, or SMM provider keys in frontend code or a public repository.
- This repository no longer uses Supabase for its Vercel login, deposit, order, and admin APIs.
