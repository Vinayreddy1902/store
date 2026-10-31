"""Fail-closed, OIDC-authenticated entitlement and private-download API.

Requires a trusted OpenID Connect issuer and privately hosted product files.
Payments must be verified separately before an entitlement is provisioned.
"""
import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import jwt
from jwt import PyJWKClient
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse

ISSUER = os.environ.get("OIDC_ISSUER", "").rstrip("/")
AUDIENCE = os.environ.get("OIDC_AUDIENCE", "")
JWKS_URL = os.environ.get("OIDC_JWKS_URL", "")
DATABASE = os.environ.get("ENTITLEMENTS_DB", "/var/lib/store/entitlements.sqlite3")
PRIVATE_DIR = Path(os.environ.get("PRIVATE_DOWNLOAD_DIR", "/var/lib/store/private")).resolve()
ALLOWED_PRODUCTS = {"ai_automation_blueprint"}
ALLOWED_FILES = {
    "ai_automation_blueprint": {
        "ebook": "eBook_Reader_Printable.html",
        "source": "eBook_AI_Automation_YouTube_Blueprint.md",
        "audio": "chapter1_preview.mp3",
    }
}

app = FastAPI(title="Store entitlement API", docs_url=None, redoc_url=None)
jwks_client = PyJWKClient(JWKS_URL) if JWKS_URL.startswith("https://") else None


def authenticated_user(authorization: str | None = Header(default=None)) -> str:
    if not (ISSUER.startswith("https://") and AUDIENCE and jwks_client):
        raise HTTPException(503, "Authentication provider not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Bearer token required", headers={"WWW-Authenticate": "Bearer"})
    token = authorization[7:]
    try:
        key = jwks_client.get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token, key, algorithms=["RS256"], issuer=ISSUER,
            audience=AUDIENCE, options={"require": ["exp", "iss", "aud", "sub"]}
        )
        subject = claims["sub"]
        if not isinstance(subject, str) or not subject or len(subject) > 255:
            raise ValueError("Invalid subject")
        return subject
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(401, "Invalid or expired token")


def has_entitlement(subject: str, product: str) -> bool:
    if product not in ALLOWED_PRODUCTS:
        return False
    try:
        with sqlite3.connect(DATABASE) as db:
            row = db.execute(
                """SELECT 1 FROM entitlements
                   WHERE subject = ? AND product = ? AND revoked = 0
                     AND (expires_at IS NULL OR expires_at > ?)
                   LIMIT 1""",
                (subject, product, int(datetime.now(timezone.utc).timestamp()))
            ).fetchone()
            return bool(row)
    except sqlite3.Error:
        # Missing DB or unavailable schema never grants access.
        return False


@app.get("/api/me/entitlements")
def entitlements(subject: str = Depends(authenticated_user)):
    return {"pro": has_entitlement(subject, "ai_automation_blueprint")}


@app.get("/api/download/{product}/{file_id}")
def download(product: str, file_id: str, subject: str = Depends(authenticated_user)):
    if not has_entitlement(subject, product):
        raise HTTPException(403, "No active entitlement")
    filename = ALLOWED_FILES.get(product, {}).get(file_id)
    if not filename:
        raise HTTPException(404, "Unknown file")
    path = (PRIVATE_DIR / product / filename).resolve()
    if not path.is_relative_to(PRIVATE_DIR) or not path.is_file():
        raise HTTPException(404, "File unavailable")
    return FileResponse(
        path, filename=filename,
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}
    )


@app.get("/health")
def health():
    return {"status": "ok"}
