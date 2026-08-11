# Environment Variables

This document lists environment variables used by the Red2Blue platform. In **production**, the server will refuse to start if any required variable is missing (see `server/env.ts`).

---

## Required (production)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon, Supabase, or any Postgres). Used by Drizzle and the session store. |
| `ANTHROPIC_API_KEY` | Anthropic API key. This is FLO's brain — Claude Sonnet 5 answers every coaching surface (landing chat, `/api/chat`, and the VAPI voice bridge). |
| `GEMINI_API_KEY` | Google Gemini key. Fallback only for FLO coaching; still the primary engine for assessment analysis and AI profile generation. |
| `SESSION_SECRET` | Secret used to sign session cookies. Must be set (no default). Use a long random string. |
| Stripe secret | At least one of: `STRIPE_SECRET_KEY` or `TESTING_VITE_STRIPE_PUBLIC_KEY` (if keys are swapped in your setup). Used for payments and checkout. |
| Stripe publishable | At least one of: `VITE_STRIPE_PUBLIC_KEY`, `VITE_TESTING_STRIPE_PUBLIC_KEY`, or `TESTING_STRIPE_SECRET_KEY`. Exposed to the client for Stripe.js. |

---

## Optional

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production`. Affects Vite vs static serving, diagnostics endpoint, demo routes, and env validation. |
| `FLO_LLM_PROVIDER` | `anthropic` or `gemini` — forces which provider FLO tries first. Unset means Anthropic whenever `ANTHROPIC_API_KEY` is present, Gemini otherwise. |
| `ANTHROPIC_MODEL` | Overrides the Claude model FLO uses. Defaults to `claude-sonnet-5`. `FLO_MODEL` is accepted as an alias. |
| `GEMINI_MODEL` | Overrides the Gemini model. Defaults to `gemini-2.0-flash`. |
| `ASSETS_PATH` or `PDF_ASSETS_PATH` | Base path for PDF downloads (e.g. `/path/to/pdfs` or Replit path). If unset, download endpoints return 503. |
| `STRIPE_WEBHOOK_SECRET` | Required if you use Stripe webhooks (`/api/webhook/stripe`). Signing secret from Stripe dashboard. |
| `OPENAI_API_KEY` | Used by `server/openai.ts` if you switch from Gemini to OpenAI for Flo. |
| `PORT` | Server port (default 5000). Not read by default in current code; set in deployment or change `server/index.ts`. |

---

## Client (Vite)

Variables prefixed with `VITE_` are exposed to the client. Do not put secrets in `VITE_*` variables.

- `VITE_STRIPE_PUBLIC_KEY` – Stripe publishable key for checkout.
- `VITE_TESTING_STRIPE_PUBLIC_KEY` – Alternative publishable key (e.g. test mode).

---

## Local development

Create a `.env` file in the project root with at least:

```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
SESSION_SECRET=your-dev-secret-at-least-32-chars
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

Run `npm run db:push` after schema changes so the database matches `shared/schema.ts`.
