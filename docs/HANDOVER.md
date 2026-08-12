# Cerosity — Session Handover

**Date**: 2026-05-28
**Last commit**: `5385832` (deployed to Railway, verified live)
**Branch**: `main` — clean, up to date with `origin/main`

---

## What Is Cerosity

AI mental performance coaching platform built on Red2Blue methodology. Target: athletes, coaches, academies, schools, clubs. Core product is **FLO** — an AI coach using Gemini for text chat and VAPI for voice coaching.

**Stack**: React + Vite (client), Express + Drizzle (server), PostgreSQL via Supabase, deployed on Railway via GitHub auto-deploy.

---

## Architecture Overview

### Server (`server/`)
| File | Purpose |
|------|---------|
| `index.ts` | Express entry, middleware, static serving |
| `routes.ts` | All API routes (~1200 lines) |
| `auth.ts` | Session auth, password hashing, Google OAuth, role middleware |
| `gemini.ts` | FLO AI chat (Gemini SDK), landing page demo chat |
| `vapi.ts` | VAPI voice webhook handler, assistant CRUD |
| `flo-prompt.ts` | FLO system prompt (Red2Blue methodology) |
| `flo-athlete-context.ts` | Per-athlete context injection for FLO |
| `storage.ts` | Database access layer (Drizzle) |
| `db.ts` | Drizzle + Neon/Supabase pool |
| `email.ts` | Resend transactional emails |
| `env.ts` | Env var validation (strict in production) |
| `deploy.ts` | Deploy utilities |

### Client (`client/src/`)
| Area | Key files |
|------|-----------|
| Landing page | `pages/landing.tsx` (~1215 lines) — public-facing, dark theme, FLO demo chat, pricing |
| Auth forms | `components/stable-signup-form.tsx`, sign-in in landing.tsx |
| Dashboard | `pages/dashboard.tsx`, `pages/free-dashboard.tsx` |
| FLO chat | `components/flo-chat.tsx` (text), `components/flo-voice-ptt.tsx` (voice/PTT) |
| Admin | `pages/admin-dashboard.tsx`, `pages/coach-dashboard.tsx` |
| HQ console | `console/` — management only, never visible to clients |

### Shared (`shared/`)
| File | Purpose |
|------|---------|
| `schema.ts` | Drizzle schema — all tables |
| `entitlements.ts` | Tier pricing, features, subscription config — **single source of truth** |

---

## Subscription Tiers

| Tier | Price | Interval |
|------|-------|----------|
| free | $0 | — |
| flo | $30 | /month |
| premium | $590 | one-time |
| ultimate | $2,290 | one-time |

All pricing from `shared/entitlements.ts`. Never hardcode in UI.

---

## Key Integrations

### FLO Text Chat (Gemini)
- Model from `GEMINI_API_KEY` env var
- Landing page demo: `POST /api/landing-chat` — rate-limited, 3 custom fallback patterns (opponent, weather, confidence)
- Authenticated: `POST /api/flo/chat` — full context, memory

### FLO Voice (VAPI)
- Assistant ID: `51d263eb-5724-4471-bc27-44341a90c038`
- STT: Deepgram Nova-2, LLM: Claude Sonnet, TTS: ElevenLabs Aria
- Webhook: `POST /api/webhooks/vapi-events` at `https://cerosity.com/api/webhooks/vapi-events`
- Tools: `suggest_technique`, `log_session_note`, `escalate_to_human`
- Client uses `VITE_VAPI_PUBLIC_KEY` (build-time) with runtime fallback to `GET /api/public-config`

### Google OAuth (SSO)
- **Code fully wired** in `server/auth.ts` and `server/routes.ts`
- Routes: `GET /api/auth/google` (redirect) → `GET /api/auth/google/callback`
- Google Cloud project: `orbital-avatar-470702-m5` (project number 1015925340235)
- **BLOCKED**: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` not yet in Railway env vars
- Mark needs to create OAuth 2.0 credentials in Google Cloud Console and add to Railway

### Stripe
- Checkout: `pages/checkout-final.tsx`
- Webhook: `POST /api/webhook/stripe`
- Keys: `STRIPE_SECRET_KEY` (server), `VITE_STRIPE_PUBLIC_KEY` (client)

### Email (Resend)
- Lead capture + admin notifications
- Key in Railway env vars

---

## Recent Session Work (commits oldest to newest)

| Commit | What |
|--------|------|
| `e7c5620` | Landing chat Gemini fallbacks, `/api/health`, `/api/public-config`, VAPI runtime config |
| `3444b40` | Health endpoint uses `RAILWAY_GIT_COMMIT_SHA`, DEPLOY_SYNC.md |
| `c4f6e70` | Bugs 10 fixes — logo transparent bg, resource cards clickable, dark theme auth forms |
| `681849e` | Google SSO OAuth flow, sign-in/sign-up buttons wired |
| `5385832` | FLO hero cutout redone from source, hands preserved, fringe cleaned |

---

## Outstanding Items

### 1. Google SSO Activation (BLOCKED on Mark)
Code complete. Mark needs to:
1. Go to Google Cloud Console, project `orbital-avatar-470702-m5`
2. Create OAuth 2.0 credentials (Web Application type)
3. Authorized redirect URI: `https://cerosity.com/api/auth/google/callback`
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Railway env vars
5. Redeploy

### 2. Trusted Company Logos (BLOCKED on assets)
- Landing page "Trusted By" section currently text-only
- Need standalone PNG/SVG files for: AWS, British Army, All Blacks, England Rugby, NHS, Lloyds Banking Group, Xerox, Sage, UPS, OpenText, Ascential, D2L, Diebold Nixdorf, Knoll
- Directory `client/public/trusted/` created but empty
- PDF extraction not viable — need original logos

### 3. Bug 4 — FLO Image Minor Cleanup
- Mark mentioned "minor cleanup on FLO left ip image" — unclear specifics
- FLO hero cutout was redone from `attached_assets/Avatars/FLO_Image_3.png` using rembg with alpha_matting
- Hands verified intact, 593 white fringe pixels cleaned

---

## Environment Variables (Railway)

### Confirmed Set
- `DATABASE_URL` — Supabase PostgreSQL
- `GEMINI_API_KEY` — FLO text chat
- `SESSION_SECRET` — express-session
- `STRIPE_SECRET_KEY` / `VITE_STRIPE_PUBLIC_KEY` — payments
- `VAPI_API_KEY` — voice webhook auth (server-only, private)
- `VAPI_WEBHOOK_SECRET` — webhook signature verification
- `VITE_VAPI_PUBLIC_KEY` — client VAPI init (public, safe)
- `VITE_VAPI_ASSISTANT_ID` — FLO assistant ID
- `RAILWAY_GIT_COMMIT_SHA` — auto-set by Railway

### Not Yet Set
- `GOOGLE_CLIENT_ID` — Google OAuth (code ready, waiting on credentials)
- `GOOGLE_CLIENT_SECRET` — Google OAuth

---

## Hard Rules (from CLAUDE.md)

1. **Never hardcode tier pricing** — use `shared/entitlements.ts`
2. **Before ANY code change**: query DB schema, grep blast radius, fix in one pass
3. **Git push protocol**: commit and push from `/Users/Thommo_1/Projects/Cerosity`, auto-deploys to Railway
4. **No Replit references** — ever
5. **HQ console never visible to clients** — stays in `client/src/console/`
6. **`npm run check` before commit** — ~100+ pre-existing TS strict errors (build passes via esbuild, not tsc strict)
7. **VITE_* vars baked at BUILD time** — changing them requires redeploy
8. **Private VAPI key server-only** — never prefix with `VITE_`

---

## Database

- **Provider**: Supabase (project `zyamllnmpdmnzglbbdff`)
- **ORM**: Drizzle
- **Schema**: `shared/schema.ts`
- **Sessions**: PostgreSQL-backed via `connect-pg-simple` (table: `sessions`)
- **Migration**: `npm run db:push` (Drizzle push)

### Security posture — PostgREST locked down (2026-07-20)

Supabase flagged 2 CRITICAL issues: RLS disabled on all 39 public tables, and
`users.password` exposed via the API. The `anon` role (anyone with the project URL +
anon key) held `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` on every table — including
`users` (password hashes), `leads` (PII), `flo_brain_documents` (founder IP), and
`courses`/`lessons` (paid curriculum).

Fixed via migration `lock_down_public_schema_rls_and_revoke_postgrest_roles`:
- `REVOKE ALL` on all public tables/sequences/functions from `anon`, `authenticated`
- `ENABLE ROW LEVEL SECURITY` on all 39 tables
- `ALTER DEFAULT PRIVILEGES` so future tables are not auto-exposed

**Why this is safe**: the app never uses `@supabase/supabase-js` or PostgREST. It
connects directly via `pg` Pool + Drizzle as the `postgres` role, which has
`rolbypassrls = true`. Verified post-migration: health OK, landing page 200,
login path 401 on bad creds (proves `users` reads still work), `anon` denied on
all sensitive tables.

Advisors now show only INFO-level "RLS enabled, no policies" — that is the
**intended** deny-all state for this architecture, not a defect.

> If you ever introduce a Supabase client (anon key) on the frontend, this deny-all
> posture will block it. You must write explicit RLS policies first — do not
> re-grant blanket `anon` privileges.

---

## Build and Deploy

```bash
# Local dev
npm run dev

# Type check (has ~100+ pre-existing strict errors, build still passes)
npm run check

# Build
npm run build

# Deploy: push to main, Railway auto-deploys via GitHub Actions
git push origin main
```

---

## Verification

```bash
# Health check
curl -s https://cerosity.com/api/health
# returns: {"status":"ok","commit":"5385832...","geminiConfigured":true,"vapiConfigured":true}

# Public config (VAPI keys for client)
curl -s https://cerosity.com/api/public-config

# Landing chat test
curl -s -X POST https://cerosity.com/api/landing-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I am nervous","messageCount":1}'
```

---

## User Context

- **Mark (Thommo)**: Non-developer business owner, MAX package
- **Never warn about cost or ask to continue**
- **Full automation authorized** — execute autonomously, evidence-based
- **Caveman mode**: terse responses, no filler
- Email: mark.e.s.thompson@gmail.com
