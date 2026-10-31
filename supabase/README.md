# Supabase security integration — deployment checklist

**Not live until deployed and configured.** This branch adds email/password Supabase Auth UI, RLS tables, private storage, an authenticated PayPal order creation/capture API, and signed downloads.

1. Create a Supabase project and apply `supabase/migrations/20261031_secure_commerce.sql`. Set the site's auth redirect and permitted origins in Supabase.
2. Deploy functions with the Supabase CLI. Set Edge Function secrets: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com` (switch to live only after testing), and `STOREFRONT_ORIGIN`. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Never expose service-role secrets to browsers.
3. Copy `store-config.example.js` to `store-config.js`, add your public Supabase URL and publishable key, and deploy the storefront. This file is intentionally untracked. Do not commit private keys.
4. Upload paid assets to the **private** `paid-products` bucket using paths in `download-product/index.ts`. Confirm public GitHub Pages URLs and Git history no longer expose the content.
5. Set up PayPal JavaScript SDK approval flow. After buyer approval call `capture-paypal-order` using the PayPal order ID; only verified capture grants access. **The sample UI only creates orders and is not a completed checkout.**
6. Implement PayPal webhook handling for refunds, reversals and disputes, and revoke entitlements. Configure subscriptions separately if selling recurring plans.
7. **Google Play verification is not yet implemented.** Keep all Google Play premium unlock paths disabled. Verify purchase tokens with Google Play Developer API from a trusted backend before granting subscription entitlements.
8. Test authenticated, unauthenticated, expired, refunded, duplicate-capture and cross-account scenarios in sandbox before going live. Enable rate limiting and monitoring.

Security model: browser sends a Supabase access token; Edge Functions validate it via Supabase Auth, check server-owned entitlements, and return 60-second signed download URLs. Users cannot directly write entitlements. Browser flags never grant access.

**Known remaining risks:** Payment refund/reversal handling and Google Play integration are outstanding; browser sample checkout needs PayPal SDK approval; paid assets may remain in public Git history and deployed copies. The prior FastAPI backend is an alternative prototype and is not connected to this Supabase flow.
