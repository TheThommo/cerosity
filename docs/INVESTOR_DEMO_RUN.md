# Investor Demo Run — 11 August 2026

Unattended overnight run. Every phase records evidence (curl / SQL / browser) or is marked FAIL or BLOCKED. No phase is marked PASS on reasoning alone.

**Success bar:** a stranger can (1) open cerosity.com and sign up free, (2) land immediately in the LMS at `/learn` and open a free-preview lesson, (3) talk to FLO and — after a refresh — have FLO still remember facts they disclosed.

---

## Phase table

| Phase | Goal | Status | Evidence |
|---|---|---|---|
| 0 | Hygiene + audit truth | **PASS** | [below](#phase-0--hygiene--audit-truth) |
| 1 | Free signup → /learn immediately | — | |
| 2 | Ship LMS | — | |
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
