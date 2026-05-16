# Cerosity Platform - Critical Context

## Architecture
- Client app: cerosity.com (main user-facing platform)
- HQ Management Console: hq.cerosity.com (separate host; never visible to clients)
- Console code is isolated in `client/src/console/` — never imported by main app

## Infrastructure
- Railway: auto-deploys from `TheThommo/cerosity` main branch pushes
- Supabase: project `zyamllnmpdmnzglbbdff` (ap-northeast-1, PostgreSQL 17) — all DB ops via MCP
- Git Push Protocol: commit and push directly from `/Users/Thommo_1/Projects/Cerosity`

## Domain & Branding
- App domain: cerosity.com
- HQ console: hq.cerosity.com
- Brand: Cerosity (formerly Red2Blue coaching)
- AI Coach: FLO (Gemini-powered, personality TBD)

## Subscription Tiers
- free: 5 FLO chats/month, basic assessment, limited tools
- premium: $490/yr — unlimited FLO, full tools, detailed analytics
- ultimate: $2190/yr — premium + 1-on-1 coach sessions, business certification

All tier limits/capabilities in `shared/entitlements.ts`. NEVER hardcode tier logic elsewhere.

## Roles
- student (default), coach, admin
- HQ console adds: owner, support, read_only console roles

## Red2Blue Coaching Methodology
5 core tools (in order):
1. Control Circles (beginner)
2. Recognition Assessment (beginner)
3. What Ifs (intermediate)
4. Screw Up Cascade (intermediate)
5. Priority Planner (advanced)
Certification path: beginner -> intermediate -> advanced -> certified

## Tech Stack
- Frontend: React 18, TypeScript strict, Wouter (router), TanStack Query, shadcn/ui + Radix UI, Tailwind CSS 3, Framer Motion
- Backend: Node.js 20, Express, Drizzle ORM + pg, Passport.js (session auth), bcrypt
- AI: Google Gemini (primary via server/gemini.ts), OpenAI (fallback via server/openai.ts)
- Payments: Stripe (checkout, subscriptions, webhooks)
- Build: Vite (client) + esbuild (server) -> dist/

## DB Tables (Supabase zyamllnmpdmnzglbbdff)
users, assessments, mental_skills_x_checks, recognition_assessments, control_circles,
what_if_planning, screw_up_cascade, priority_planning, pre_shot_routines,
certification_progress, chat_sessions, user_coaching_profiles, ai_recommendations,
coaching_insights, user_engagement_metrics, user_progress, daily_moods, daily_check_ins,
user_goals, notifications, flo_subscriptions, techniques, scenarios, technique_progress,
calendar_reminders

## Known Constraints
- Session auth (not JWT) — cookie-based with PostgreSQL session store (connect-pg-simple)
- Wouter routing: use Switch + Route, not React Router syntax
- shadcn/ui components in client/src/components/ui/
- Shared types via shared/ directory with @shared/* alias
- client/src/ alias is @/*
- No test suite — typecheck via npm run check

## HQ Console Boundary
HQ is read-heavy against Supabase. Any migration that drops/renames columns used by HQ
must be flagged before execution — PostgREST returns silent empty results on missing columns.

## Operating Principles
See CLAUDE.md. Key: NEVER hardcode tier limits, capabilities, pricing, or model names.
All config must be environment-driven or centralised in entitlements/config files.
