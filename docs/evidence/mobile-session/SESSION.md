# Mobile FLO session — handback (2026-09-29, unattended)

**Session goal:** on a phone, a signed-in athlete opens FLO in one tap and saves a check-in that survives refresh, and FLO's next reply can see that check-in.
**Result:** slices 1–4 are merged and running on production. Slice 5 was **not started**; the reason is below.

| Slice | Merged | Prod health SHA | Local smoke (signed in) | Prod smoke | Receipt |
|---|---|---|---|---|---|
| 1 — mood entries persist | [#13](https://github.com/TheThommo/cerosity/pull/13) → main `1de2688` | `1de2688` | **PASS** — POST 201, GET returns the same five factors, other user 403/403, out-of-range 400, anonymous 401 | **PASS (anonymous half)** — route went from SPA 200 to 401 JSON; prod table created, RLS on, 0 browser grants, `daily_moods` still 2 rows. Signed-in half **not run** | `docs/evidence/mood-entries/` |
| 2 — check-in UI writes the API | [#15](https://github.com/TheThommo/cerosity/pull/15) → main `e15957c` | `e15957c` | **PASS** at 390px — save closes; reload keeps 80/66/34/19/89; prefill from last entry; forced 500 shows error + Retry; keep-logging under 5; no "Strongest Factor" | **PASS (bundle)** — shipped JS contains the sheet, has 0 "Strongest Factor". Signed-in tap-through **not run** | `docs/evidence/check-in-sheet/` |
| 3 — one FLO surface on the phone | [#17](https://github.com/TheThommo/cerosity/pull/17) → main `27acc84` | `27acc84` | **PASS** at 390px — bar is Curriculum / Ask FLO / Check-in; Ask FLO opens the bubble's panel with no route change; bubble opens the same panel; Check-in opens the sheet; Curriculum → `/learn`; 0 chat composers on 8 athlete pages until the panel opens | **PASS (bundle)** — new panel code shipped; the free dashboard's second chat is gone from the bundle. Signed-in tap-through **not run** | `docs/evidence/flo-sheet/` |
| 4 — FLO sees the latest check-in | [#20](https://github.com/TheThommo/cerosity/pull/20) → main `63edc32` | `63edc32` | **PASS** — the real pack builder, for a user with one row, contains all five numbers; a user with no rows gets no block | **PASS (boot)** — health on `63edc32`, `/api/chat` answers 401 anonymous. Prod has 0 mood rows, so no live pack contains the block yet | `docs/evidence/flo-mood-context/` |
| 5 — progression maths | **not started** | — | — | — | — |

Receipt PRs: #14, #16, #18 + #19, and the one carrying this file.

## Why every prod smoke is only half done

The brief said to smoke with a throwaway signup. Claude's safety rules don't allow it to **create accounts or enter passwords on a live site**, even when asked. So the signed-in half of every slice was run on **localhost**: the real dev server, a scratch Postgres (PGlite) with the same migration SQL, and throwaway local users. On production Claude checked everything that needs no login: deployed SHA, anonymous status codes, shipped bundle contents, and DB state through the Supabase MCP. The in-app browser also isn't allowed to open `cerosity.com`.

**Why slice 5 did not start.** Its gate reads "only if slices 1–4 each smoked green on prod", and none has a signed-in prod smoke. Its own rule — "if you cannot prove it, do not merge" — has the same problem. This is a blocked check, not a failed one. Claude stopped rather than stretch the gate.

**Mark — about 3 minutes on a phone closes all four:**
1. Sign in (or sign up a throwaway) on `www.cerosity.com`.
2. Tap **Check-in** in the bottom bar. Move sliders, save, pull to refresh. The numbers stay (slices 1 and 2).
3. Tap **Ask FLO**. The chat panel opens and the URL doesn't change. Close it, tap the bubble, and the same panel opens (slice 3).
4. Ask FLO "how did my last check-in look?" It should quote your five numbers (slice 4).
5. For the 403: DevTools console, `await fetch('/api/mood-entries/1').then(r=>r.status)` → 403 unless you're the admin.

If all of that passes, slice 5 can run as briefed.

## Orphans left behind (not deleted)

- `client/src/components/bulletproof-ai-chat.tsx` — no importers after slice 3
- `client/src/components/landing-chat-stable-v2.tsx` — no importers after slice 3
- The `data-chat-button` attribute in `client/src/components/stable-chat.tsx` — its only consumer was removed

## Things found and left for Mark

- **Crash class (flagged as a separate task, not fixed):** Express 4 doesn't catch rejected async handlers, and there's no `unhandledRejection` handler. So any throw outside a `try` in any route takes the Node process down. The new mood route was fixed. The rest of `routes.ts` wasn't audited.
- **Tier gate:** `/api/mood-entries` has auth and owner checks only, as briefed. `shared/entitlements.ts` has `dailyMood: "flo"`. Decide whether check-ins should follow it.
- **Two mood surfaces on the premium dashboard:** the old "How do you feel today?" slider (writes `daily_moods`) still sits above the new Performance Mood card.
- **Home page suggestion buttons** ("Ask Flo About…") never actually sent. They set `.value` on a React-controlled input. They now open the FLO panel.
- The shared shadcn Sheet's close ✕ is 16px. Everything this session added is 44px.

## Hard rules

Additive migration only (`add_mood_entries`), applied through Supabase MCP and recorded in `migrations/0002_add_mood_entries.sql`. No `db:push` against production. Entitlements untouched. No prices. Nothing under `client/src/console/` touched. No Replit. Every commit used explicit pathspecs. `npm test` went from 24 to 60, all green. `tsc` stayed at 150 errors with (file, code) delta 0 after every slice. No passwords were changed or committed. Mark, Andy and Sarah weren't touched.
