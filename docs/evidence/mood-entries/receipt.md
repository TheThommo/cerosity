# Slice 1 — mood entries persist — receipt

- **PR:** [TheThommo/cerosity#13](https://github.com/TheThommo/cerosity/pull/13), merged → `main` at **`1de2688`**
- **Production SHA verified:** `1de2688` via `https://www.cerosity.com/api/health` (first seen 06:11 local, 2026-09-29)
- **Done-when:** POST then GET returns the same five factors after a new request; a second user gets 403 on the first user's rows; `daily_moods` is not dropped.

## What shipped

| Piece | Where |
|---|---|
| `mood_entries` table: `user_id`, `occurred_at`, `context` ∈ practice / pre_event / post_event / check_in, five factors as integers 0–100 with CHECKs, nullable `note` | `shared/schema.ts`, `migrations/0002_add_mood_entries.sql` |
| `POST /api/mood-entries/:userId`, `GET /api/mood-entries/:userId?limit=` | `server/routes.ts` — `requireAuth` + `requireOwnUserOrAdmin('userId')` |
| Input validation (tests written first, 30 tests) | `shared/mood-entry.ts`, `shared/mood-entry.test.ts` |

The route takes `:userId` because `requireOwnUserOrAdmin` needs an id to compare with the session; that is what makes the 403 rule testable. POST answers **201 Created**, not 200. No tier gate — the brief asked for auth + owner only. Note that `shared/entitlements.ts` lists `dailyMood: "flo"`; Mark may want the same gate on check-ins later.

## Database (Supabase MCP, production project `zyamllnmpdmnzglbbdff`)

Read before any DDL: `daily_moods` = 6 columns, 2 rows, RLS on, no browser grants. `users.id` = integer. `mood_entries` did not exist.

Applied as migration `add_mood_entries`. After:

| Check | Result |
|---|---|
| `mood_entries` columns | 11 |
| RLS on `mood_entries` | `true` (no policies — same deny-all posture as every public table) |
| Grants to `anon` / `authenticated` | 0 |
| `daily_moods` rows | **2** — not dropped, not altered |

The same SQL was first applied to a local scratch Postgres (PGlite) to prove it runs.

## Verification commands

| Command | Result |
|---|---|
| `npm test` | 54 / 54 pass (24 existing + 30 new) |
| `npm run check` | 150 errors; multiset by (file, error code) identical to the `bd240cf` baseline — delta 0 |
| `npm run build` | OK |

## Security review

One finding, fixed before merge: `new Date(occurredAt)` ran before the type check, and a JSON object with `toString: null, valueOf: null` makes it throw. The parse ran outside the handler's `try`, and Express 4 does not catch a rejected async handler, so one signed-in request could crash the Node process. Fix: type check first, regression test, and parsing moved inside the `try`. The wider "any async handler can crash the process" risk is flagged as a separate task, not fixed here.

Checked clean: `:userId` quirks (`5abc`, `05`) parse identically in the guard and the handler; body `userId` is dropped; Drizzle parameterises every query; `limit` is clamped 1–100; 500s are generic.

## Smoke

### Local — real server (`npm run dev`) against a scratch Postgres on localhost, two throwaway local users

| Step | HTTP |
|---|---|
| Register A, register B | 200, 200 |
| A `POST /api/mood-entries/A` (body also carries `userId: B`) | **201**, row saved with `userId = A` |
| A `GET /api/mood-entries/A` (new request) | **200**, factors `[71, 62, 58, 33, 84]` — identical to what was posted |
| B `GET /api/mood-entries/A` | **403** |
| B `POST /api/mood-entries/A` | **403** |
| A POST with `stress: 101` | 400 |
| A POST with `context: "pre_round"` | 400 |
| Anonymous GET | 401 |
| B `GET /api/mood-entries/B` | 200, 0 rows — the smuggled `userId` wrote nothing to B |
| A POST with hostile `occurredAt` object | 400, server still answering `/api/health` 200 |
| Rows from the first run still present after a server restart | yes |

### Production — `https://www.cerosity.com` on `1de2688`

| Step | Before deploy (`bd240cf`) | After deploy (`1de2688`) |
|---|---|---|
| Anonymous `GET /api/mood-entries/1` | 200 (SPA fallback HTML — no route) | **401** `{"message":"Authentication required"}` |
| Anonymous `POST /api/mood-entries/1` | — | **401** |
| `/api/health` | `bd240cf` | `1de2688` |

**Not run on production: the signed-in POST / GET / 403 with a throwaway account.** Claude's safety rules do not allow it to create accounts or enter passwords on a live, non-local site, even when asked, so the authenticated half was proven on localhost against the same code and the same migration SQL. Mark — to close it on prod in about a minute: sign up a throwaway on `www`, open DevTools on any page and run

```js
const me = await (await fetch('/api/auth/me')).json();
await fetch(`/api/mood-entries/${me.id}`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({context:'check_in',confidence:70,focus:60,energy:55,stress:30,motivation:80})}).then(r=>r.status); // 201
await (await fetch(`/api/mood-entries/${me.id}`)).json(); // your row
await fetch('/api/mood-entries/1').then(r=>r.status); // 403 (unless you are the admin)
```

then delete the throwaway in HQ.
