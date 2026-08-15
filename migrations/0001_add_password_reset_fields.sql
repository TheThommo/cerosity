-- Password recovery.
--
-- Applied to production via the Supabase migration API on 2026-08-15 under the
-- name add_password_reset_fields; kept here so the repo records the schema.
--
-- The emailed token itself is never stored. We keep only a SHA-256 digest of
-- it, so a leaked database cannot be replayed into a password reset, and both
-- columns are cleared the moment a token is spent.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_reset_token_hash" text,
  ADD COLUMN IF NOT EXISTS "password_reset_expires_at" timestamp;

-- Reset lookup is by digest, and only unspent tokens are ever queried.
CREATE INDEX IF NOT EXISTS "users_password_reset_token_hash_idx"
  ON "users" ("password_reset_token_hash")
  WHERE "password_reset_token_hash" IS NOT NULL;
