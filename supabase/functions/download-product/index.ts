import { admin, currentUser, response, cors } from "../_shared/core.ts";

const files: Record<string, Record<string, string>> = {
  ai_automation_blueprint: {
    ebook: "ai_automation_blueprint/eBook_Reader_Printable.html",
    source: "ai_automation_blueprint/eBook_AI_Automation_YouTube_Blueprint.md",
    audio: "ai_automation_blueprint/chapter1_preview.mp3",
    bundle: "ai_automation_blueprint/2026_AI_Automation_YouTube_Blueprint_Bundle.zip"
  },
  ai_trading_bot_team: {
    bundle: "ai_trading_bot_team/6_Agent_AI_Trading_Desk_Suite.zip"
  },
  ai_clipstudio_suite: {
    bundle: "ai_clipstudio_suite/Apex_ClipStudio_AI_Suite_Bundle.zip"
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return response(req, { error: "Method not allowed" }, 405);

  try {
    const user = await currentUser(req);
    if (!user) return response(req, { error: "Sign in required" }, 401);

    const { product_id, file_id } = await req.json();
    if (typeof product_id !== "string" || typeof file_id !== "string") {
      return response(req, { error: "Invalid request" }, 400);
    }

    const path = files[product_id]?.[file_id];
    if (!path) return response(req, { error: "Unknown product file" }, 404);

    const db = admin();
    const { data, error } = await db
      .from("entitlements")
      .select("provider_transaction_id")
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .is("revoked_at", null)
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .limit(1);

    if (error || !data?.length) {
      return response(req, { error: "No verified entitlement" }, 403);
    }

    const { data: signed, error: signError } = await db.storage
      .from("paid-products")
      .createSignedUrl(path, 60);

    if (signError || !signed?.signedUrl) {
      return response(req, { error: "Download unavailable" }, 503);
    }

    return response(req, { url: signed.signedUrl, expires_in: 60 });
  } catch (e) {
    console.error("Download denied", e);
    return response(req, { error: "Download unavailable" }, 503);
  }
});
