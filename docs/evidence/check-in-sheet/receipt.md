# Slice 2 — check-in UI writes the API — receipt

- **PR:** [TheThommo/cerosity#15](https://github.com/TheThommo/cerosity/pull/15), merged → `main` at **`e15957c`**
- **Production SHA verified:** `e15957c` via `https://www.cerosity.com/api/health`
- **Done-when:** CheckInSheet (shadcn Sheet, Slider, Button) saves and closes; refresh still shows the entry; the fake `calculateMoodFactors` path in `mood-indicator.tsx` is gone; under 5 entries the dashboard lists them and says keep logging — no "strongest factor" insight.

## What shipped

| Piece | Where |
|---|---|
| `CheckInSheet`: five sliders pre-filled from the last entry or 50; contexts Pre-round / Practice / Post-round / Check-in; 44px targets; closes only after a successful save; failed save shows an alert and the button becomes Retry | `client/src/components/check-in-sheet.tsx` |
| Dashboard "Performance Mood" card reads `/api/mood-entries`; `calculateMoodFactors`, local-only history and the Strongest Factor / Area to Focus card removed; list + "Keep logging — N of 5" under 5 entries | `client/src/components/mood-indicator.tsx` |
| Threshold `MOOD_ENTRIES_FOR_TREND = 5` | `shared/mood-entry.ts` |

No Recharts added. Not touched: the separate, older daily-mood tracker on the dashboard ("How do you feel today?", writes `daily_moods`).

## Verification commands

| Command | Result |
|---|---|
| `npm test` | 54 / 54 |
| `npm run check` | 150 errors, (file, code) multiset delta 0 |
| `npm run build` | OK |
| spec-reviewer | **SPEC-COMPLIANT** (open point: the shared shadcn Sheet's close ✕ is 16px; overlay tap and Escape also close) |

## Smoke

### Local at 390 × 844 — real dev server, scratch Postgres, throwaway local user (tier set to premium in the scratch DB so the dashboard renders)

| Step | Result | Screenshot |
|---|---|---|
| Empty dashboard card | "No check-ins yet…" + four context buttons | — |
| Tap Pre-round | Sheet opens, all sliders 50, Pre-round selected | `1-sheet-390.jpg` |
| Set 80 / 66 / 34 / 19 / 89 → Save check-in | Sheet closes; card shows those five numbers | `2-saved-390.jpg` |
| Full page reload | Same five numbers; "Keep logging — 1 of 5 check-ins so far" | `3-after-reload-390.jpg` |
| Reopen (Check-in) | Sliders pre-filled 80 / 66 / 34 / 19 / 89 | `5-prefilled-from-last-390.jpg` |
| POST forced to 500 | Red alert "Not saved — Failed to save check-in. Your ratings are still here; tap Retry."; sheet stays open; button reads Retry | `4-save-failed-retry-390.jpg` |
| Network restored → Retry | Saved and closed; 2 entries listed | — |
| 5 entries | Keep-logging line gone; 5 rows listed; no "Strongest Factor" text on the page | — |
| Measured heights | 4 context buttons, 5 slider rows and Save all 44px | — |

### Production — `https://www.cerosity.com` on `e15957c`

| Check | Result |
|---|---|
| `/api/health` commit | `e15957c` |
| Shipped bundle `/assets/index-DW-S6bh3.js` contains "How are you right now?", "Save check-in", "Keep logging", `/api/mood-entries/` | 1, 1, 1, 2 occurrences |
| Shipped bundle contains "Strongest Factor" / "Area to Focus" | **0 / 0** |

**Not run on production: signing in at 390px, saving a check-in and reloading.** Claude may not create accounts or enter passwords on a live site, and the in-app browser is not permitted to open `cerosity.com`. The whole flow was run on localhost against the same code. Mark — to close it: on a phone, sign in as a premium/admin athlete, Dashboard → Performance Mood → Pre-round, move a slider, Save, pull to refresh; the numbers should stay.
