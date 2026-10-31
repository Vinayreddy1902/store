# Security and Deployment Architecture

This repository enforces strict, fail-closed access controls for all paid digital products and in-app premium features.

## Architecture Overview

1. **Server-Side Google Play Purchase Verification (`verify-google-play-purchase`)**:
   - Google Play purchases and subscriptions are validated server-side using the Google Play Developer API (Android Publisher v3).
   - Verifies product ID, package name, purchase state (`purchaseState === 0` / active subscription), order ID, and expiry timestamp.
   - Automatically acknowledges verified purchases.
   - Grants entitlements in `public.entitlements` bound to the verified authenticated user session.

2. **Server-Side PayPal Verification (`create-paypal-order` & `capture-paypal-order`)**:
   - Order creation enforces server-controlled pricing from `public.products` (clients cannot tamper with prices).
   - Order capture validates status (`COMPLETED`), currency (`USD`), order ID, and exact amount against the catalog before granting entitlements.
   - Idempotently records entitlements in `public.entitlements` using unique provider transaction IDs.

3. **Private Product Storage & Protected Downloads (`download-product`)**:
   - Paid assets (eBooks, audio narration, code bundles, Trading Desk Suite ZIP, ClipStudio Suite ZIP) are relocated out of the public web root into private storage (`paid-products` bucket).
   - Downloads require a valid authenticated Bearer token and an active, unrevoked entitlement.
   - Delivers files via short-lived, single-use signed URLs (60-second expiration).
   - Prevents hotlinking, scraping, and unauthenticated downloads from public GitHub Pages paths.

4. **Client-Side Entitlement Resolution (`storeManager.js` & `download.html`)**:
   - No client-side `localStorage` flags (`momentum_is_pro`) or tampering can unlock features.
   - Uses Supabase JS SDK to query Row-Level Security protected `public.entitlements` for the authenticated user.
   - Fails closed on any network error, missing session, or unverified response.

5. **Secrets & Credentials Management**:
   - Zero hardcoded secrets, private keys, or API tokens in Git history.
   - Environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`) are strictly managed in the Supabase Edge Functions runtime environment.
