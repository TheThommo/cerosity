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
| **C. Entitled sequential path** | **FAIL (blocked)** | `SARAH_PW` not present in the environment — see below |
| D1. daily-mood route returns 401/403/200 | PASS | anon=401 |

---

## Residual risk

**1. The entitled path is proven by unit test, not on production.** This is the brief's documented
stop condition and it was hit. `SARAH_PW` is not set in this environment, the stored session
cookie in `.tmp_sarah_jar` has expired (401), and the only way to mint a fresh entitled user is
`POST /api/admin/users`, which needs admin credentials. Rather than mutate or guess any of
Mark's, Andy's or Sarah's passwords, section C was left to fail loudly.

The paid rules are covered by tests 3–7 above and by the same `computeAccessibleLessonIds` call
that B4/B4b exercised live, so the code path itself is running in production — only the entitled
branch of it is unwitnessed there.

**To close this:** re-run with the password in the environment. The script now has the assertions
ready — C2 checks the server's own lock flags against the sequential rule given whatever history
the user already has, C2b proves a locked-ahead lesson is withheld and refuses progress with 403,
and C3 completes the current lesson and watches its successor flip from locked to open.

```bash
SARAH_PW='…' node docs/evidence/investor-e2e/full-site-e2e.mjs
```

**2. Ordering assumption.** The sequence follows `getLessonsForCourse`, which sorts by `sortOrder`
ASC across the whole course. The outline groups those lessons by module, so if `sortOrder` were
ever scoped per-module instead of per-course, the API's order and the displayed order could
diverge. It holds for the current 23-lesson course; worth pinning if modules are ever reordered.

**3. Users mid-course keep more open than a clean sequential start would give them.** Preserving
historical completions is deliberate — it avoids taking away lessons people have already done —
but it means anyone with scattered completions from the all-open era sees each of those
completions unlock its own successor. New users get a strictly sequential experience.
