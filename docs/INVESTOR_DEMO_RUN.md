# Investor Demo Run — 11 August 2026

Unattended overnight run. Every phase records evidence (curl / SQL / browser) or is marked FAIL or BLOCKED. No phase is marked PASS on reasoning alone.

**Success bar:** a stranger can (1) open cerosity.com and sign up free, (2) land immediately in the LMS at `/learn` and open a free-preview lesson, (3) talk to FLO and — after a refresh — have FLO still remember facts they disclosed.

---

## Phase table

| Phase | Goal | Status | Evidence |
|---|---|---|---|
| 0 | Hygiene + audit truth | **PASS** | [below](#phase-0--hygiene--audit-truth) |
| 2 | Ship LMS | **PASS** | [below](#phase-2--ship-the-lms-shipped-before-phase-1) |
| 1 | Free signup → /learn immediately | **PASS** | [below](#phase-1--free-signup--learn) |
| 3 | FLO durable memory | — | |
| 4 | FLO on Sonnet 5 | — | |
| 5 | Credibility | — | |
| 6 | Voice reconcile | — | |
| 7 | Stretch | — | |

---

## Phase 0 — Hygiene + audit truth

**Goal:** clean index hygiene; frosty-northcutt gone; audit on remote; staged LMS state understood.

### frosty-northcutt — removed

```
$ git worktree list
/Users/Thommo_1/Projects/Cerosity  a62aa7e [main]          ← only entry

$ git branch -D claude/frosty-northcutt-e48a21
Deleted branch claude/frosty-northcutt-e48a21 (was 34af098).

$ git ls-remote --heads origin | grep -i frosty
NO remote frosty branch

$ git grep -rniI "frosty" -- .
(no output — zero hits in tracked files)

$ git ls-files -s | awk '$1=="160000"'
(no output — no gitlink/submodule entry)
```

Safety check before removal — the worktree had no unique work:

```
$ git log --oneline origin/main..claude/frosty-northcutt-e48a21
(empty)
$ git -C .claude/worktrees/frosty-northcutt-e48a21 status --short
(empty — clean tree)
```

`.claude/worktrees/` added to `.gitignore`. Root junk PDFs (`Cerosity Bugs 10.pdf`, `Updates required V2 19 May.pdf`) unstaged and left untracked.

### Commits pushed

```
fef5565  chore: remove frosty-northcutt worktree refs + gitignore .claude/worktrees
a62aa7e  docs: add full production readiness audit
```

```
$ git push origin main
To https://github.com/TheThommo/cerosity
   56c323f..fef5565  main -> main
```

The chore commit touched exactly 2 files (`.gitignore`, `docs/PRODUCTION-READINESS-AUDIT.md`) — committed by pathspec so none of the 131 staged LMS/asset files leaked into it.

### Production health at start of run

```
$ curl -s https://cerosity.com/api/health
{"status":"ok","commit":"56c323f","geminiConfigured":true,"vapiConfigured":true,"timestamp":"2026-08-11T12:08:33.513Z"}
HTTP 200
```

Production is running `56c323f` — the pre-LMS build.

### Audit re-verification

Written up in full at [`docs/PRODUCTION-READINESS-AUDIT-ADDENDUM.md`](PRODUCTION-READINESS-AUDIT-ADDENDUM.md).

- **B1 — STILL OPEN on production.** `/api/learn/courses` returns `content-type: text/html` (SPA catch-all), not JSON. **ADDRESSED in staged work**: `shared/schema.ts:756-880`, `server/routes.ts:2536-2741`, `server/storage.ts:1930-2030`, `client/src/pages/learn.tsx`, `client/src/pages/lesson.tsx`, `client/src/App.tsx:135-138`.
- **B2 — PARTIAL.** Curriculum ships; `techniques` (0 rows) and `scenarios` (0 rows) untouched and off the demo path.
- **Database needs no migration.** Prod Supabase already matches the staged Drizzle schema column-for-column; `courses`=1, `course_modules`=3, `lessons`=23 (2 flagged `is_free_preview`). Per audit D2, `npm run db:push` must not be run.
- **Gaps upstream of the LMS** (all auth-layer): signup accepts a client-supplied tier (`server/auth.ts:216-217,265-266`); signup and login both redirect to `/` instead of `/learn`; `PATCH /api/users/:id` is unfiltered.

**Status: PASS.**

---

## Phase 2 — Ship the LMS (shipped before Phase 1)

**Goal:** an investor opens `/learn`, sees Red2Blue Foundation, and opens a free-preview lesson.

### Sequencing note

Phases 1 and 2 were swapped. `App.tsx`, `dashboard.tsx` and `free-dashboard.tsx` all carried staged LMS changes, so an auth-first commit would have dragged LMS code into it; and Phase 1's whole point is redirecting to `/learn`, which had to exist first. Shipping LMS first kept both commits clean and left no window where signup redirected to a route that did not exist.

### Commit

```
d210446  feat(lms): ship the Red2Blue curriculum — API, pages and tier gating
         12 files changed, 1387 insertions(+), 7 deletions(-)
```

Committed by pathspec. Excluded, as instructed: `server/vapi.ts`, `server/flo-routes.ts`, the `attached_assets` renames, the screenshot deletions and the root PDFs — 119 paths remained staged and untouched.

**No DDL ran.** Production Supabase already had all five tables matching the Drizzle definitions column-for-column. `npm run db:push` was not run (audit D2).

### Pre-flight

```
$ npm run check   →  162 errors   (identical to the pre-existing baseline; LMS adds none)
$ npm run build   →  dist/index.js 279.2kb, success
```

No error line falls inside the LMS ranges (`server/routes.ts:2536-2741`, `server/storage.ts:1930-2030`) or in `learn.tsx` / `lesson.tsx` / `schema.ts` / `entitlements.ts`.

### Deploy confirmed

```
$ curl -s https://cerosity.com/api/health
{"status":"ok","commit":"d210446",…}

$ curl -s -o /dev/null -w "%{http_code} %{content_type}" https://cerosity.com/api/learn/courses
401 application/json; charset=utf-8        ← was: 200 text/html (SPA shell)
```

**Audit B1 is closed on production.** The endpoint now exists and demands a session, instead of silently falling through to the SPA.

### Live E2E as a real free account (user id 3)

Course outline:

```
$ curl -b jar https://cerosity.com/api/learn/courses/red2blue-foundation

course: Red2Blue Foundation | hasAccess: False
modules: 3 | lessons: 23
progress: {'total': 23, 'completed': 0, 'percent': 0}
 - Session 1: What Is Red2Blue?
 - Session 2: How Do You Use Red2Blue?
 - Session 3: How Do You Practise Red2Blue?
unlocked: ['welcome-to-red2blue', 'the-performance-line']
locked count: 21 first locked: the-performance-triangle
```

Free-preview lesson renders real content:

```
$ curl -b jar https://cerosity.com/api/learn/lessons/welcome-to-red2blue

title: Welcome to Red2Blue | locked: False | id: 1 | status: not_started
content blocks: 5 | types: ['heading','paragraph','paragraph','keyPoints','callout']
first block: {"text": "Welcome to Red2Blue", "type": "heading"}
next: {'slug': 'the-performance-line', 'title': 'Performance Is Not All or Nothing'}
```

Locked lesson withholds it — the paywall holds at the API, not in CSS:

```
$ curl -b jar https://cerosity.com/api/learn/lessons/the-performance-triangle

title: The Performance Triangle | locked: True | content blocks: 0 | toolKey: None
```

Progress writes, and 403s on locked lessons:

```
$ curl -b jar -X POST https://cerosity.com/api/learn/lessons/1/progress -d '{"status":"completed"}'
progress row: {'id': 1, 'userId': 3, 'lessonId': 1, 'status': 'completed',
               'completedAt': '2026-08-11T12:21:33.675Z', …}
courseProgress: {'total': 23, 'completed': 1}

$ curl -b jar -X POST https://cerosity.com/api/learn/lessons/3/progress -d '{"status":"completed"}'
HTTP 403
```

Durable in Postgres, not client state — queried directly against Supabase:

```sql
select u.id, u.email, u.subscription_tier, lp.lesson_id, lp.status, lp.completed_at
from users u left join lesson_progress lp on lp.user_id = u.id where u.id = 3;

→ 3 | demo.check.…@cerosity-test.com | free | 1 | completed | 2026-08-11 12:21:33.675
```

And it survives a fresh request:

```
$ curl -b jar https://cerosity.com/api/learn/courses/red2blue-foundation
progress: {'total': 23, 'completed': 1, 'percent': 4}
lesson 1 status: ['completed']
```

`lesson_progress` went from 0 rows (its state since the table was created) to a real row written by the live product.

**Status: PASS.**

---

## Phase 1 — Free signup → /learn

**Goal:** signup creates a free user only, and lands in the LMS at once.

### Commit

```
f2135f5  fix(auth): force free signup, allowlist profile edits, land in /learn
         7 files changed, 59 insertions(+), 79 deletions(-)
```

```
$ curl -s https://cerosity.com/api/health
{"status":"ok","commit":"f2135f5",…}
```

### Proof 1 — registration cannot buy itself a tier (audit A3)

Registered against production **deliberately asking for the top tier and admin**:

```
POST https://cerosity.com/api/auth/register
{"username":"democheck…","email":"demo.check.…@cerosity-test.com","password":"…",
 "subscriptionTier":"ultimate","isSubscribed":true,"role":"admin"}

→ {"id": 3,
   "email": "demo.check.…@cerosity-test.com",
   "isSubscribed": false,        ← asked for true
   "subscriptionTier": "free",   ← asked for ultimate
   "role": "student"}            ← asked for admin
```

### Proof 2 — profile PATCH cannot escalate (audit A2)

```
PATCH https://cerosity.com/api/users/3
{"role":"admin","subscriptionTier":"ultimate","isSubscribed":true,"bio":"allowlist test"}

→ {'id': 3, 'role': 'student', 'subscriptionTier': 'free',
   'isSubscribed': False, 'bio': 'allowlist test'}
```

The allowlisted field (`bio`) was written; all three escalation fields were dropped. Confirmed in Postgres — the row reads `free` / `false` / `student` / `allowlist test`.

### Proof 3 — upgrade-tier is gone (audit A3)

```
POST https://cerosity.com/api/auth/upgrade-tier {"tier":"ultimate"}
→ HTTP 200, content-type: text/html      ← no Express handler; SPA catch-all

$ curl -b jar https://cerosity.com/api/auth/me
{'id': 3, 'subscriptionTier': 'free', 'isSubscribed': False, 'role': 'student'}
```

The route no longer exists and the tier is unchanged. Caveat worth fixing later: unmatched `/api/*` paths fall through to the SPA and answer `200 text/html` rather than a JSON 404.

### Proof 4 — the demo path resolves

```
/login                             HTTP 200 text/html
/signup                            HTTP 200 text/html
/learn                             HTTP 200 text/html
/learn/lesson/welcome-to-red2blue  HTTP 200 text/html
```

`/login` and `/signup` are new — previously sign-in existed only as local state inside the landing page (audit A5).

### Proof 5 — the deployed bundle carries the redirects

The in-app browser could not be used: `https://cerosity.com is blocked by policy`. Instead the **shipped** JS bundle was fetched from production and inspected, which proves what users actually receive:

```
$ ASSET=$(curl -s https://cerosity.com/learn | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
/assets/index-BRSIj_lw.js   (1,484,724 bytes)

signup success  → window.location.href="/learn"      ✅ present
login success   → t("/learn")  + "Taking you to your curriculum"   ✅ present
```

The three remaining `window.location.href="/"` occurrences are logout, the nav home link and a Refresh Page button — all correct.

**Not verified by browser:** the visual landing of a human signup. The API, the database and the shipped bundle all agree, but a clicked-through browser signup was not possible from this environment.

**Status: PASS.**
