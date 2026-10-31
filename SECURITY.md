# Security and deployment status

This branch **fails closed** on unverified Momentum Pro purchases, restores and rewarded ads. Premium purchases will remain unavailable until a trusted server verifies payment and grants an entitlement. This is a temporary mitigation, not a complete payment implementation.

## Required before production

1. Verify Google Play purchases server-side with the Google Play Developer API, checking product, purchase state, account binding, expiry and revocation. A client `acknowledged` flag is not proof of entitlement.
2. Verify PayPal payments with server-side API/webhook signature validation and match amount, currency, product, capture status and order ID. Never trust checkout query parameters.
3. Store entitlements in a backend and enforce access on every protected download or paid API request. Use short-lived signed URLs for paid files, and remove paid files from public GitHub Pages paths.
4. Implement a genuine purchase-restore endpoint, tied to the correct account and verified purchases.
5. Keep exchange credentials out of Git and rotate any exposed secrets. Use restricted API permissions and testnet for development.
6. Review the two Momentum implementations (`momentum/index.html` and `momentum/js/app.js`) for convergence to one verified entitlement model.
7. Add automated tests for unpaid, expired, revoked, refunded and failed-payment scenarios.

## Limitations

The existing public static store and product URLs remain publicly accessible. This patch does **not** protect digital downloads, implement authentication, or verify payments. Do not claim paid content is access-controlled until the architecture above is implemented.
