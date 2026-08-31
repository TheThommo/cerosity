# LMS Sequential Unlock — Implementation Report

- **Merged PR:** [#8](https://github.com/TheThommo/cerosity/pull/8) — `feat(lms): sequential unlock for entitled curriculum users`
- **Merge commit on `main`:** `d35406b`
- **Production SHA (verified):** `d35406b` via `https://www.cerosity.com/api/health`
- **Run date:** 2026-08-31

---

## The lock rule, before and after

**Before:** a lesson was open if `isFreePreview || hasCurriculumEntitlement`, so every paying
user saw all 23 lessons unlocked at once and a free user who finished a preview still saw the
next paid lesson dangled as an upsell rather than as a locked step.

**After:** a free user may open only the `isFreePreview` lessons, and an entitled user opens the
first lesson in `sortOrder` plus every lesson whose predecessor they have completed — so the
curriculum is walked one step at a time and `isFreePreview` no longer skips the queue.

---

## Files changed

| File | Change |
|---|---|
| `shared/lms-access.ts` | **New.** Pure, dependency-free access rules: `hasCurriculumEntitlement`, `computeAccessibleLessonIds`, `isLessonAccessible`, `hasCompletedCourse`. |
| `shared/lms-access.test.ts` | **New.** 11 unit tests covering the free, paid, gap, legacy-history and certificate cases. |
| `server/routes.ts` | Removed the thin `lessonIsAccessible` / `userHasCurriculumAccess` pair. `GET /api/learn/courses/:slug` computes `locked` from progress; `GET /api/learn/lessons/:slug` withholds `content` and `toolKey` when locked and now returns `hasAccess`; `POST /api/learn/lessons/:id/progress` returns 403 when the lesson is not sequentially accessible; the certificate requires the whole course. |
| `client/src/pages/lesson.tsx` | A locked lesson shows upgrade copy to a free user and "Complete the previous lesson to unlock" (with a link back to that lesson, no upsell) to an entitled one. |
| `client/src/pages/learn.tsx` | Locked rows in the outline carry the same sequence hint for entitled users. |
| `docs/evidence/investor-e2e/full-site-e2e.mjs` | B4 inverted to the correct monetization assertion, B4b added, the entitled block rewritten to walk the sequence instead of demanding 23/23 unlocked. |
| `package.json` | Added `npm test` (`tsx --test shared/*.test.ts`); committed the `playwright` devDependency the E2E script needs. |

No schema change and no `db:push` — accessibility is computed from the existing `lesson_progress`
rows. No existing progress was written or wiped; Sarah (33) and Andy (2) were not touched.

**Legacy history is safe.** A lesson the user has already completed stays open even if an earlier
one is not, so completions recorded during the all-open era are never taken away, and each of
those completions still unlocks its own successor.

---

## Unit tests — `npm test`

11 passed / 0 failed.

| # | Test | Result |
|---|---|---|
| 1 | free user: only free-preview lessons are accessible | PASS |
| 2 | free user: completing a preview does not unlock the next non-preview | PASS |
| 3 | paid user with no progress: only the first lesson is unlocked | PASS |
| 4 | paid user who completed lesson 0: lesson 1 unlocks, lesson 2 stays locked | PASS |
| 5 | paid user gap: lesson 2 stays locked while lesson 1 is incomplete | PASS |
| 6 | paid user: `isFreePreview` does not bypass the sequential rule | PASS |
| 7 | paid user: a lesson already completed stays accessible even if an earlier one is not | PASS |
| 8 | unknown lesson id is never accessible | PASS |
| 9 | certificate: not earned while any course lesson is incomplete | PASS |
| 10 | certificate: earned when an entitled user has completed every lesson | PASS |
| 11 | certificate: never earned without the curriculum entitlement | PASS |

## Typecheck — `npm run check`

150 errors before the change, 150 after. **Delta 0**, and none of them are in the files touched
here. The backlog is pre-existing and deliberately left alone.

## Production E2E — `node docs/evidence/investor-e2e/full-site-e2e.mjs`

Against `https://www.cerosity.com` on commit `d35406b`. **14 passed / 1 failed.**

| Step | Result | Detail |
|---|---|---|
| 0. Health check | PASS | commit=`d35406b`, llm=anthropic/claude-sonnet-5 |
| A1. Landing shows brand + FLO | PASS | |
| A2. Google button hidden | PASS | |
| A3. Forgot password link present | PASS | |
| A4. Imogen Hall image matches her filename | PASS | `/endorsers/imogen-hall.png` |
| A5. Forgot-password page loads | PASS | |
| B1. Free signup → `/learn` | PASS | |
| B2. Only freePreview lessons unlocked | PASS | hasAccess=false, unlocked 2/23 |
| B3. Complete first unlocked free-preview | PASS | `welcome-to-red2blue` → completed |
| **B4. Free: completing a preview does NOT unlock the next non-preview** | **PASS** | `the-performance-triangle` locked=true after the preview was completed — this is the monetization assertion that previously failed |
| **B4b. Free: POST progress on a locked lesson is refused** | **PASS** | HTTP 403 — proves the gate is in the API, not the UI |
| B5. Locked lesson API withholds content | PASS | contentLen=0 |
| B6. Human coaching gated for free | PASS | POST /message HTTP 403 |
| **C. Entitled sequential path** | **PASS** (re-run on `124b2cf`) | See the entitled section below — this was blocked on the first run and has since been proven on production |
| D1. daily-mood route returns 401/403/200 | PASS | anon=401 |

---

## Entitled sequential path — proven on production

The first run could not exercise this: `SARAH_PW` was absent, the stored session cookie had
expired, and minting an entitled user needs admin credentials. That blocker is now closed. The
demo athlete's sign-in was rotated (see the credentials note below) and the suite was re-run
against `https://www.cerosity.com` on commit `124b2cf` — **22 passed / 1 failed**.

| Step | Result | Detail |
|---|---|---|
| C1. Entitled login (iPhone 13) → `/learn` | PASS | |
| **C2. Lock flags follow the sequential rule** | **PASS** | `hasAccess=true`, open 9/23, completed 8, **violations=none** — the server's own `locked` flags match the rule for every one of the 23 lessons given this user's real history |
| **C2b. Locked-ahead lesson withheld and refuses progress** | **PASS** | `control-of-attention-rituals` locked, `contentLen=0`, POST progress HTTP 403 |
| **C3. Completing a lesson unlocks the next one** | **PASS** | 3 successive unlocks observed: `tool-recognition-radar→control-of-attention-rituals: locked→open`, `control-of-attention-rituals→where-pressure-comes-from: locked→open`, `where-pressure-comes-from→spotting-the-loop: locked→open`. Completed 8→11, 35%→48% |
| C4. Lesson API exposes prev/next | PASS | |
| C5–C8. FLO memory, bubble, human coaching | PASS | Unchanged by this work |

Existing progress survived the rotation intact: the account still held its 8 prior completions
before the walk began, and the 9 open lessons were exactly those 8 plus the next one in sequence.

The remaining failure, **D1 (`daily-mood` route, anon=401 authed=404)**, is pre-existing — it
failed the same way on the original pre-change run and is unrelated to lesson access.

---

## Residual risk

**1. Ordering assumption.** The sequence follows `getLessonsForCourse`, which sorts by `sortOrder`
ASC across the whole course. The outline groups those lessons by module, so if `sortOrder` were
ever scoped per-module instead of per-course, the API's order and the displayed order could
diverge. It holds for the current 23-lesson course; worth pinning if modules are ever reordered.

**2. Users mid-course keep more open than a clean sequential start would give them.** Preserving
historical completions is deliberate — it avoids taking away lessons people have already done —
but it means anyone with scattered completions from the all-open era sees each of those
completions unlock its own successor. New users get a strictly sequential experience.

**3. The demo athlete's sign-in address is case-sensitive.** `storage.getUserByEmail` matches with
`eq(users.email, email)`, so the address must be typed with exactly the capitalisation stored in
the row. The demo account was rotated to `Sarah.guerra1981@gmail.com` (capital **S**) and the
E2E script now uses that address; an all-lowercase attempt returns 401. Worth normalising to
lower-case on both write and lookup if real athletes ever self-register, but that is a separate
change and out of scope here. No credential is stored in this repository.
