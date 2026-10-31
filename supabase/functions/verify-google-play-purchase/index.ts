import { admin, currentUser, env, response, cors } from "../_shared/core.ts";

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

// Generates an OAuth2 access token for Google APIs using RSA-SHA256 JWT
async function getGoogleAccessToken(sa: GoogleServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsignedToken = `${enc(header)}.${enc(claimSet)}`;

  // Parse RSA private key (PEM PKCS#8)
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const tokenData = await res.json();
  return tokenData.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return response(req, { error: "Method not allowed" }, 405);

  try {
    const user = await currentUser(req);
    if (!user) return response(req, { error: "Sign in required" }, 401);

    const body = await req.json();
    const { package_name, product_id, purchase_token, is_subscription } = body;

    if (!package_name || !product_id || !purchase_token) {
      return response(req, { error: "Missing purchase details" }, 400);
    }

    const saJson = env("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
    const sa: GoogleServiceAccount = JSON.parse(saJson);
    const googleToken = await getGoogleAccessToken(sa);

    let verified = false;
    let expiresAt: string | null = null;
    let transactionId = purchase_token;

    if (is_subscription) {
      // Validate subscription via androidpublisher v3
      const subUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
        package_name
      )}/purchases/subscriptions/${encodeURIComponent(
        product_id
      )}/tokens/${encodeURIComponent(purchase_token)}`;

      const subRes = await fetch(subUrl, {
        headers: { Authorization: `Bearer ${googleToken}` },
      });

      if (!subRes.ok) {
        return response(req, { error: "Subscription verification failed" }, 400);
      }

      const subData = await subRes.json();
      // expiryTimeMillis must be in the future
      const expiryMillis = parseInt(subData.expiryTimeMillis || "0", 10);
      if (expiryMillis > Date.now()) {
        verified = true;
        expiresAt = new Date(expiryMillis).toISOString();
        transactionId = subData.orderId || purchase_token;
      }
    } else {
      // Validate one-time in-app product purchase
      const prodUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
        package_name
      )}/purchases/products/${encodeURIComponent(
        product_id
      )}/tokens/${encodeURIComponent(purchase_token)}`;

      const prodRes = await fetch(prodUrl, {
        headers: { Authorization: `Bearer ${googleToken}` },
      });

      if (!prodRes.ok) {
        return response(req, { error: "Product purchase verification failed" }, 400);
      }

      const prodData = await prodRes.json();
      // purchaseState === 0 means PURCHASED (1 = CANCELED, 2 = PENDING)
      if (prodData.purchaseState === 0) {
        verified = true;
        transactionId = prodData.orderId || purchase_token;

        // Acknowledge the purchase if unacknowledged
        if (prodData.acknowledgementState === 0) {
          await fetch(`${prodUrl}:acknowledge`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${googleToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ developerPayload: user.id }),
          });
        }
      }
    }

    if (!verified) {
      return response(req, { error: "Purchase is invalid or expired" }, 403);
    }

    const db = admin();
    const { error: insertError } = await db.from("entitlements").upsert(
      {
        user_id: user.id,
        product_id: product_id,
        provider: "google_play",
        provider_transaction_id: transactionId,
        expires_at: expiresAt,
      },
      { onConflict: "provider_transaction_id", ignoreDuplicates: false }
    );

    if (insertError) {
      console.error("Failed to grant entitlement:", insertError);
      throw insertError;
    }

    return response(req, { ok: true, product_id, expires_at: expiresAt });
  } catch (err) {
    console.error("Google Play verification error:", err);
    return response(req, { error: "Purchase verification service unavailable" }, 503);
  }
});
