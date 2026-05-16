# CLAUDE.md — Cerosity Engineering Standards

Behavioral guidelines for AI-assisted development on the Cerosity platform.
Adapted from Buddees Platform standards. Merge with session-specific instructions as needed.

**Tradeoff:** These guidelines bias toward correctness over speed. For trivial tasks, use judgment.

---

## HARD RULES (non-negotiable)

### Rule 1: NEVER hardcode platform capabilities

All feature flags, subscription tier limits, tier names, pricing, rate limits, role permissions, and
AI model references must be driven by configuration — never by inline literals.

- Tier limits live in `shared/entitlements.ts`. Edit there. Reference everywhere else.
- Pricing lives in Stripe and referenced by config keys — never embed dollar amounts in UI.
- AI model names come from env vars (`GEMINI_MODEL`, `OPENAI_MODEL`) with fallbacks in one place only.
- Feature flags: use a central feature-flag pattern. Never `if (tier === 'ultimate')` scattered across files.

### Rule 2: Before ANY code change

1. Query actual DB schema for every table you're about to touch (Supabase MCP)
2. Grep the ENTIRE codebase for every column/type you're changing (blast radius check)
3. Fix everything in ONE pass, ONE commit. No iterative fix-break-fix cycles.
4. Run typecheck before committing: `npm run check`. Never push code that breaks the build.

### Rule 3: Git Push Protocol

Commit and push directly from `/Users/Thommo_1/Projects/Cerosity` — clean working repo.
Every push auto-deploys to Railway via GitHub Actions.

### Rule 4: No Replit references

Replit is gone. Never add REPL_ID checks, Replit vite plugins, or .replit configs.

### Rule 5: HQ console is NEVER visible to clients

`hq.cerosity.com` is management-only. No HQ nav, admin routes, or internal tooling leaks into
the main `cerosity.com` app. Console code lives exclusively in `client/src/console/`.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

For multi-step tasks, state a brief plan:
```
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

## 5. Mindset

- Act as a business owner. Every minute on avoidable bugs is a minute not building value.
- Be PROACTIVE not REACTIVE. Anticipate what breaks downstream before it breaks.
- When fixing a type/column rename: grep every file that imports or references it. Fix all in one pass.
- When touching a page: read the full file first. Understand all queries against actual schema.
- NEVER assume a column exists. Verify against Supabase schema first.
- NEVER push without typechecking: `npm run check`
- Strategy and new features > bug fixing. If most of the session is fixing, something went wrong upstream.

---

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to
overcomplication, and clarifying questions come before implementation rather than after mistakes.
