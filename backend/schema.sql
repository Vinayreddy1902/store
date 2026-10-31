CREATE TABLE IF NOT EXISTS entitlements (
  subject TEXT NOT NULL,
  product TEXT NOT NULL,
  expires_at INTEGER,
  revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0, 1)),
  payment_provider TEXT NOT NULL,
  verified_payment_id TEXT NOT NULL UNIQUE,
  PRIMARY KEY (subject, product, verified_payment_id)
);
CREATE INDEX IF NOT EXISTS idx_entitlements_lookup
ON entitlements(subject, product, revoked, expires_at);
