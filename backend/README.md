# Private download and entitlement API

This is a **fail-closed foundation**, not an automatic payment processor. It does not grant entitlements from browser input, PayPal redirect URLs, or client-side billing flags.

## Setup

1. Deploy behind HTTPS to a private server (not GitHub Pages).
2. Install `pip install -r requirements.txt`.
3. Set `OIDC_ISSUER`, `OIDC_AUDIENCE`, and `OIDC_JWKS_URL` to the values for your trusted identity provider. The JWKS URL must be HTTPS and under your control/trust. This implementation accepts **RS256 only**.
4. Set `ENTITLEMENTS_DB` to a writable database path and `PRIVATE_DOWNLOAD_DIR` to a directory **outside** any public web root.
5. Initialize the database: `sqlite3 "$ENTITLEMENTS_DB" < backend/schema.sql`.
6. Copy paid product files into `$PRIVATE_DOWNLOAD_DIR/ai_automation_blueprint/`. **Remove their publicly served copies before claiming they are protected.**
7. Run `uvicorn backend.app:app --host 127.0.0.1 --port 8000` behind an HTTPS reverse proxy.
8. Connect your login provider to obtain a short-lived access token with the configured audience; pass it via `Authorization: Bearer <token>`. Do not persist access tokens in localStorage.

## Payment verification (not yet implemented)

Only a trusted server-side payment verification job may write entitlement records after independently verifying payment provider authenticity, payment status, product, amount, currency, account identity, and expiry/revocation. Do not expose an endpoint that accepts client assertions of payment. The `verified_payment_id` column prevents duplicate payment IDs.

For Google Play, use the Google Play Developer API. For PayPal, validate webhooks or capture IDs with PayPal server-side APIs. Account linking, refunds, renewals, and cancellations must update entitlements.

## Limitations

The public Git history may still contain digital assets even after deleting their latest versions. Move products to private infrastructure, evaluate repository visibility and asset rotation, and verify that the deployed site is no longer exposing old paths. A backend is only useful once deployed and connected to a real login and payment provider.
