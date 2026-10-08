# Martin Fairn phone demo — e2e receipt (2026-10-08, unattended)

- **Handback:** Merged [TheThommo/cerosity#22](https://github.com/TheThommo/cerosity/pull/22) → main **`e25e269`**
- **Production SHA:** `e25e269` from `https://www.cerosity.com/api/health` (live 11:35:55 local; `7f5e8e5` before the fix)
- **Chrome:** 154.0.8037.98, Playwright channel `"chrome"`, headless, 390 × 844
- **Script:** `docs/evidence/fairn-demo-e2e/demo-path.mjs` (raw output: `run-prod.md`, `run-local.md` and their `.json`)
- **Throwaway emails:** production — **none created** (see "Not run on production"). Local scratch DB — `fairn.demo.ada.1791444932051@cerosity-test.invalid`, `fairn.demo.bo.1791444932051@cerosity-test.invalid`. Passwords are random per run and never written anywhere.
- **Sarah (id 33):** `SARAH_PW` was not in the environment, so she was skipped. Mark (1) and Andy (2) were not touched. No password was changed.

## Checks

Production = `www.cerosity.com` on `e25e269`. Local = the same code on a local dev server against a scratch Postgres (PGlite) seeded with `scripts/seed-curriculum.sql`.

| ID | Check | Production | Local |
|---|---|---|---|
| P0 | Health 200 with a commit | **PASS** `e25e269` | PASS |
| P1 | Landing at 390px shows brand + FLO | **PASS** (`landing-390.png`) | PASS |
| P2 | Forgot-password page loads | **PASS** | PASS |
| P3 | Anonymous: mood entries GET/POST, chat, course, progress, coaching | **PASS** all 401 | PASS all 401 |
| D1 | daily-mood refuses anonymous | **PASS** 401 — see note | PASS 401 |
| S1 | New free throwaway signs up → `/learn` | not run | PASS |
| L1 | Free: only free-preview lessons open, ≥1 locked | not run | PASS — open 2 / locked 21 of 23 |
| L2 | Locked lesson API returns empty content | not run | PASS — `the-performance-triangle` contentLen 0 |
| L3 | Curriculum shows free-preview banner + locks | not run | PASS — 22 lock icons (`local-curriculum-lock.png`) |
| N1 | Bottom bar shows Curriculum, Ask FLO, Check-in | not run | PASS |
| F1 | Ask FLO (bar) opens the panel; path + history unchanged | not run | PASS — `/learn→/learn`, history 3→3, composers 0→1 |
| F2 | Close, then the bubble opens that same panel | not run | PASS — bar Ask FLO `aria-expanded=true`, 1 composer |
| F3 | FLO answers "I am going Red on the first tee." | not run | **FAIL — environment**: local server has no LLM key, `/api/chat` 503 (`local-flo-panel.png`) |
| F4 | Every Ask FLO control on `/learn` keeps the path | **fix shipped** — see bundle proof | **FAIL before fix → PASS after** |
| K1 | Check-in: set 72/64/38/21/87, save | not run | PASS — POST 201, sheet closes |
| K2 | After reload the sheet shows the same five values | not run | PASS — 72/64/38/21/87 (`local-check-in-after-reload.png`) |
| K3 | GET `/api/mood-entries` returns them | not run | PASS — 200, latest 72/64/38/21/87 |
| K4 | Second throwaway on the first user's rows | not run | PASS — GET 403, POST 403 |
| B3 | Free: completing a preview does not unlock the next paid lesson | not run | PASS |
| B4 | Free: progress POST on a locked lesson | not run | PASS — 403 |
| B6 | Free: human coaching message | not run | PASS — 403 |
| E1 | No uncaught page exception during the taps | not run | PASS — 0 |

**D1 note.** The known old D1 failure (404) came from the investor suite's *signed-in* probe as Sarah. This run never signs in as an existing user, and a free throwaway would get 403 from `requirePremium` anyway, so the 404 was recorded, not re-probed and not fixed.

**Step 1 (investor suite, free-user sections).** `full-site-e2e.mjs` was not re-run as-is: its section B signs up on production. Its free-user checks are folded into this script — health/landing/forgot-password (P0–P2, run on prod) and signup, preview lock, preview-complete-does-not-unlock, locked content empty, progress 403, coaching 403 (S1, L1, L2, B3, B4, B6, run locally).

## The fix (F4)

`/learn` rendered its own fixed **Ask FLO** pill linking to `/flo`. At 390 × 844 it sat under the FLO bubble (overlapping boxes; a clipped "Ask" on the demo's first screen) and tapping it left Curriculum for a different chat route — the opposite of "one FLO panel, no route change". Removed in `client/src/pages/learn.tsx` (plus its unused icon import). The bubble (every size) and the bar (phones) keep FLO one tap away.

| Proof | Before | After |
|---|---|---|
| Local F4 | `link href=/flo overlapsBubble=true tap → path /flo` | `no separate Ask FLO link on /learn` |
| Prod bundle `index-Dl3Zc-nF.js` → `index-DWqtB0Rn.js`: pill class `right-4 bottom-24 md:bottom-6` | 1 | **0** |
| Prod bundle: "Ask FLO" occurrences (bar label, pill label, pill aria-label) | 3 | **1** (bar only) |
| Prod bundle: "Close FLO chat", "How are you right now?", "Save check-in" | 1 / 1 / 1 | 1 / 1 / 1 |

| Gate | Result |
|---|---|
| `npm test` | 60 / 60 |
| `npm run check` | 150 errors (unchanged) |
| tdd-guide | RED → GREEN on F4; every other check unchanged |
| spec-reviewer | **SPEC-COMPLIANT** |
| security-reviewer | not run — the fix touches no auth or mood route |

## Not run on production: everything that needs a signed-in user

Claude's safety rules do not allow it to create accounts or enter passwords on a live, non-local site, even when the brief authorises it. So no throwaway was created on `www`, and S1–E1 were proven on localhost against the same code. The FLO reply (F3) is the one check localhost cannot prove, because the local server has no LLM key.

**Mark — one command closes it** (about 2 minutes; creates two `@cerosity-test.invalid` throwaways on `www`):

```bash
node docs/evidence/fairn-demo-e2e/demo-path.mjs
```

It writes `run-prod.md` / `run-prod.json` with every check and the screenshots `check-in-after-reload.png`, `flo-panel.png` and `curriculum-lock.png` into this folder, and exits 1 on any FAIL. Delete the two throwaways in HQ afterwards if you like.

## Console noise (recorded, not failed)

- Production, anonymous run: 2× `401` resource loads — the deliberate anonymous API probes.
- Local run: 4× `401` (the same probes, before sign-up), 24× Stripe.js "test over HTTP" warning (local HTTP only), 1× `503` from `/api/chat` (no LLM key locally).

## Noticed, not fixed

- **A failed FLO request looks like a reply.** `StableChat` catches any `/api/chat` error and shows a canned FLO line ("I'm here to help with your mental game…"), so if the LLM fails during the demo the panel still "answers" — generically, with no error. F3 checks the network response for exactly this reason. Out of this run's fix scope (the panel did not fail on any proven path).
