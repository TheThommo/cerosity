# Production Readiness Audit — Addendum

| | |
|---|---|
| **Date** | 11 August 2026 |
| **Parent** | `docs/PRODUCTION-READINESS-AUDIT.md` (written against `origin/main` = `56c323f`) |
| **Purpose** | Re-verify findings **B1** and **B2** against the LMS work that was sitting **staged but uncommitted** in the working tree, and state exactly what still blocks *sign up → land in the LMS → open a lesson*. |
| **Production at time of writing** | `GET https://cerosity.com/api/health` → `{"status":"ok","commit":"56c323f","geminiConfigured":true,"vapiConfigured":true,"timestamp":"2026-08-11T12:08:33.513Z"}` |
| **Method** | Staged diff review (`git diff --cached`), direct queries against Supabase `zyamllnmpdmnzglbbdff`, live curls against production |

---

## Summary

The audit's largest finding — **B1, "the entire curriculum is in the database with no way to reach it"** — was accurate for `origin/main` and is **still accurate for production right now**. But the missing half is no longer missing work: a complete LMS slice (schema, storage layer, five API routes, two pages, router entries, nav, entitlement) exists **staged in the working tree**. It has never been committed, so production has never run it.

**The gap between the audit and reality is a deploy, not a build.**

| Finding | On production (`56c323f`) | In the staged work |
|---|---|---|
| B1 — curriculum unreachable | **STILL OPEN** | **ADDRESSED** |
| B2 — paywalled pages empty | **STILL OPEN** | **PARTIAL** — curriculum ships; `techniques` / `scenarios` remain 0 rows |

---

## B1 — The entire curriculum is in the database with no way to reach it

### Status on production: STILL OPEN — verified by live curl

The LMS endpoints do not exist on the deployed build. They fall through to the SPA catch-all, which returns the index document with HTTP 200 — so a naive status-code check looks like success:

```
GET https://cerosity.com/api/learn/courses
→ HTTP 200
→ content-type: text/html; charset=UTF-8
→ <!DOCTYPE html><html lang="en"> …            ← SPA shell, not JSON
```

`/learn` likewise returns the SPA shell (HTTP 200) and renders the client's not-found route, because `56c323f` has no `/learn` entry in the router.

### Status in staged work: ADDRESSED

Every element the audit listed as missing now exists:

| Audit's "Fix:" item | Where it now lives |
|---|---|
| `courses` / `course_modules` / `lessons` / `lesson_progress` / `course_certificates` in `shared/schema.ts` | `shared/schema.ts:756-880` — five `pgTable` definitions, insert schemas, inferred types, plus a `LessonBlock` union describing the `lessons.content` jsonb |
| Tier-gated API routes | `server/routes.ts:2536-2741` — five routes (below) |
| Storage layer | `server/storage.ts:1930-2030` — `getPublishedCourses`, `getCourseBySlug`, `getCourseById`, `getModulesForCourse`, `getLessonsForCourse`, `getLessonBySlug`, `getLessonById`, `getLessonProgressForUser`, `getLessonProgressForCourse`, `upsertLessonProgress`, `getCertificate`, `getCertificatesForUser`, `issueCertificate` |
| A lesson page | `client/src/pages/lesson.tsx` (316 lines) — renders the `LessonBlock` union, prev/next nav, mark-complete |
| Progress tracking | `client/src/pages/lesson.tsx:176-198` — auto-marks `in_progress` on open, explicit mark-complete mutation |
| Router entry | `client/src/App.tsx:135-138` — `/learn` and `/learn/lesson/:slug` |

**Routes shipped** (all `requireAuth`, all in `server/routes.ts`):

```
GET  /api/learn/courses                    :2547   list + per-course % complete
GET  /api/learn/courses/:slug              :2568   outline: modules → lessons, per-lesson locked/status
GET  /api/learn/lessons/:slug              :2621   single lesson; content withheld when locked
POST /api/learn/lessons/:id/progress       :2670   in_progress | completed, auto-issues certificate
GET  /api/learn/me                         :2718   cross-course progress + certificates
```

**Gating is config-driven** (CLAUDE.md Rule 1 — no inline tier literals). A new `curriculum` feature key was added to `shared/entitlements.ts:90,116` at `premium`, and the routes resolve access through `hasFeatureAccess(...)` at `server/routes.ts:2541`, never by comparing tier strings. Per-lesson unlock is `lesson.isFreePreview || hasCurriculumAccess` (`server/routes.ts:2545`).

**Content is genuinely withheld, not merely hidden.** `GET /api/learn/lessons/:slug` returns `content: []` and `toolKey: null` when locked (`server/routes.ts:2648-2649`), so a locked lesson's body never reaches the browser. `POST …/progress` returns 403 for a locked lesson (`server/routes.ts:2679`).

### Database — already correct, no migration required

Production Supabase already carries the LMS tables **and they match the staged Drizzle definitions column-for-column**. Verified against `information_schema.columns`:

| Table | Rows | Schema match |
|---|---|---|
| `courses` | 1 | ✅ id, slug, title, subtitle, description, required_tier, sport, sort_order, is_published, created_at, updated_at |
| `course_modules` | 3 | ✅ id, course_id, slug, title, subtitle, summary, sort_order, is_published, created_at, updated_at |
| `lessons` | 23 | ✅ id, module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content(jsonb), tool_key, is_free_preview, sort_order, is_published, created_at, updated_at |
| `lesson_progress` | 0 | ✅ id, user_id, lesson_id, status, completed_at, created_at, updated_at |
| `course_certificates` | 0 | ✅ id, user_id, course_id, certificate_code, issued_at, created_at |

```sql
select c.slug, c.required_tier,
       (select count(*) from lessons l where l.course_id=c.id and l.is_published)     as published,
       (select count(*) from lessons l where l.course_id=c.id and l.is_free_preview)  as free_preview
from courses c;

→ red2blue-foundation | premium | 23 | 2
```

**Deploying the staged code requires no DDL.** `scripts/seed-curriculum.sql` has already been applied to production. Per audit finding **D2**, `npm run db:push` must *not* be run — it would offer to drop the tables that exist in Postgres but not in `shared/schema.ts`.

---

## B2 — The two content pages behind the paywall are empty

### Status: PARTIAL

B2 covered two distinct claims. The staged work resolves one and leaves the other untouched.

**Resolved — the curriculum now has a delivery path.** The 23 lessons the audit found stranded in Postgres are reachable through `/learn`, and two of them are flagged `is_free_preview` so a free account has something real to open.

**Still open — `techniques` and `scenarios` remain empty.**

```sql
techniques  → 0 rows
scenarios   → 0 rows
```

Nothing in the staged diff touches `client/src/pages/techniques.tsx`, `client/src/pages/scenarios.tsx`, or the dead `MemStorage` seed data at `server/storage.ts:146-1219`. A premium account opening Techniques or Scenarios still sees an empty list.

**Assessment for the investor demo:** out of scope and not on the demo path. The demo route is `/learn`, which is populated. Techniques/Scenarios remain a genuine pre-launch defect and stay on the backlog.

---

## What still blocks *free signup → /learn* (gaps beyond B1/B2)

The LMS slice is sound, but three defects sit **upstream of it** on the demo path. All three are auth-layer, none are LMS.

### G1 — Signup does not force the free tier (audit A3, unchanged)

`server/auth.ts:216-217` accepts `subscriptionTier` and `isSubscribed` from the request body, and `server/auth.ts:265-266` writes them straight to the new row:

```ts
isSubscribed:     userData.isSubscribed     || false,
subscriptionTier: userData.subscriptionTier || 'free'
```

A crafted `POST /api/auth/register` with `{"subscriptionTier":"ultimate","isSubscribed":true}` mints a free ultimate account. With the LMS deployed this becomes a *content* leak, not just a flag: that account passes `hasFeatureAccess(…, "curriculum")` and unlocks all 23 lessons.

### G2 — Signup and login both land on `/`, not `/learn`

- `client/src/components/stable-signup-form.tsx:77` → `window.location.href = '/'`
- `client/src/pages/landing.tsx:1119` → `setLocation('/')`

`/` renders the tier-branching home page the audit criticises in **B4** ("the logged-in home page runs the anonymous landing FLO") and **C2** (randomly generated progress numbers). A brand-new free account therefore lands on the weakest surface in the product rather than on the curriculum.

### G3 — Profile PATCH is still privilege-escalating (audit A2, unchanged)

`PATCH /api/users/:id` accepts an unfiltered body. With `curriculum` now a tier-gated entitlement, self-service `subscriptionTier` editing is a direct content bypass.

---

## Investor checklist — free signup → /learn → free-preview lesson → progress saves

| # | Step | Blocked by | Verifies |
|---|---|---|---|
| 1 | `POST /api/auth/register` with a tier field in the body → row must come back `free` / `isSubscribed:false` | G1 | Audit A3 closed; entitlement gate is trustworthy |
| 2 | Browser signup → lands on `/learn`, not `/` | G2 | Demo path avoids the B4/C2 home page |
| 3 | `GET /api/learn/courses/red2blue-foundation` returns JSON with 3 modules / 23 lessons | deploy only | B1 closed on production |
| 4 | Free account opens a `is_free_preview` lesson → content blocks render | deploy only | Free tier has something real to read |
| 5 | Free account opens a locked lesson → `content: []`, upgrade CTA shown | deploy only | Paywall holds; content never reaches the client |
| 6 | `POST /api/learn/lessons/:id/progress` `{status:"completed"}` → `lesson_progress` row appears in Supabase | deploy only | Progress is durable, not client state |
| 7 | Refresh `/learn` → completed lesson still ticked, % complete moved off 0 | deploy only | Round-trips from the database |

Steps 3–7 need only a deploy. Steps 1–2 need the auth fixes.

---

## Corrections to the parent audit

- **B1's `grep` evidence is now historical.** `grep -rn "courses|lessons|course_modules|lesson_progress" server/ shared/ → 0 matches` was true of `56c323f` and is false of the working tree. B1's *conclusion* about production stands.
- **B1's "largest piece of genuine missing work" no longer reads correctly.** The work exists; it is unshipped. The largest genuine gap on the demo path is now the auth layer (A2/A3), not the LMS.
- The parent audit's branch-state note referenced a stale worktree that has since been deleted; that note has been rewritten and the worktree removed from the repository.
