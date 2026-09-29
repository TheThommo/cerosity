-- Mood check-ins: five separately-rated factors per entry.
--
-- Applied to production via the Supabase migration API on 2026-09-29 under the
-- name add_mood_entries; kept here so the repo records the schema.
--
-- Additive only. daily_moods is left exactly as it was.
CREATE TABLE IF NOT EXISTS "mood_entries" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  "context" text NOT NULL
    CHECK ("context" IN ('practice', 'pre_event', 'post_event', 'check_in')),
  "confidence" integer NOT NULL CHECK ("confidence" BETWEEN 0 AND 100),
  "focus" integer NOT NULL CHECK ("focus" BETWEEN 0 AND 100),
  "energy" integer NOT NULL CHECK ("energy" BETWEEN 0 AND 100),
  "stress" integer NOT NULL CHECK ("stress" BETWEEN 0 AND 100),
  "motivation" integer NOT NULL CHECK ("motivation" BETWEEN 0 AND 100),
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Every read is "this athlete's entries, newest first".
CREATE INDEX IF NOT EXISTS "mood_entries_user_occurred_idx"
  ON "mood_entries" ("user_id", "occurred_at" DESC);

-- Same deny-all posture as every other public table: RLS on, no policies, and
-- nothing granted to the browser roles. The app connects as postgres.
ALTER TABLE "mood_entries" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "mood_entries" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "mood_entries_id_seq" FROM anon, authenticated;
