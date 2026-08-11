# Cerosity — Production Readiness Audit

| | |
|---|---|
| **Date** | 11 August 2026 |
| **Target** | cerosity.com (production), commit `56c323f` = `origin/main` |
| **Sources** | Live HTTP requests to production · direct queries against Supabase `zyamllnmpdmnzglbbdff` · source review of `origin/main` · `npx tsc --noEmit` |
| **Scope** | Full site: commercial funnel, auth, payments, entitlements, FLO agent, content delivery, UI/UX, security, build/deploy, database |
| **Changes made** | None. Report only. |

---

## Verdict

**The platform is built. The business is not connected.**

Cerosity has a real methodology, a real curriculum, a real brand and a working deploy pipeline. What it does not have is a single unbroken path from a stranger's first visit to a paid athlete being coached. Every link in that chain is severed somewhere, and each break is individually small.

| Metric | Value |
|---|---|
| Purchases that would grant access | **0** |
| Ways to obtain paid tiers for free | **5** |
| Lessons written / deliverable | **23 / 0** |
| TypeScript errors (`npm run check`) | **162** |
| Endorsers showing the wrong person's face | **7 of 9** |
| Real users in production | **2** (both `ultimate`, 0 paying customers) |

### Timing is the good news

Production has two user accounts, two captured leads and zero paying customers. Every finding below is a **pre-launch defect, not an incident**. Fix them now and no customer ever experiences them. Launch first and most become refunds, chargebacks, or a public correction to a named person.

### Process note — branch state

This worktree (`claude/frosty-northcutt-e48a21`) is **9 commits behind `origin/main`**, which is what production runs. Missing here: Google SSO, the VAPI webhook handler, `server/vapi.ts`, `server/flo-routes.ts` and schema changes.

Every CRITICAL finding below was verified against `origin/main` and/or the live site, so the report is accurate to production. **Start any work from a fresh branch off `main`, not from this worktree.**

```
git log --oneline HEAD..origin/main
56c323f  feat(flo): voice on Cerosity custom-LLM brain - remove dual intelligence
5385832  fix(assets): redo FLO hero cutout — hands preserved, fringe cleaned
681849e  feat(auth): Google SSO — OAuth flow, sign-in/sign-up buttons wired
c4f6e70  fix: Bugs 10 — logo transparent bg, resource cards clickable, dark theme auth forms
3444b40  fix: health endpoint use RAILWAY_GIT_COMMIT_SHA, add DEPLOY_SYNC.md
e7c5620  feat: landing chat fallbacks, /api/health, /api/public-config, VAPI runtime config
fa429c3  chore: rebuild to bake VITE_VAPI env vars into client bundle
cf30aa5  feat(voice): VAPI webhook handler, DB schema, assistant CRUD, FLO tools
121a6ff  fix(assets): FLO hero transparent cutout — isnet model, hands preserved
```

---

# A. The money chain is severed in five places

A purchase was traced end to end against the code running in production. A customer can reach Stripe and be charged. **Nothing that happens after that grants them anything.**

## A1 — CRITICAL — The Stripe webhook cannot ever fire successfully

**Verified in production code.**

`express.json()` is mounted globally at `server/index.ts:11`, before routes are registered at `server/index.ts:57`. By the time the webhook handler calls `stripe.webhooks.constructEvent(req.body, sig, secret)`, `req.body` is a parsed JavaScript object, not the raw `Buffer` that signature verification requires. There is no `express.raw()` mount anywhere in the codebase.

**Every webhook delivery fails signature verification and returns 400.**

```
server/index.ts:11    app.use(express.json());          ← runs first, globally
server/index.ts:57    registerRoutes(app)               ← webhook registered here
server/routes.ts      constructEvent(req.body, …)       ← needs raw Buffer
grep -rn "express.raw"  →  NONE
```

Two further faults sit behind it:

1. The handler only listens for `checkout.session.completed`. The live checkout page (`CheckoutFinal`) uses **PaymentIntents**, which emit `payment_intent.succeeded` — an event with no handler at all.
2. `handlePaymentSuccess` reads `session.metadata.userId`:
   ```ts
   async function handlePaymentSuccess(session: any) {
     const userId = parseInt(session.metadata.userId);
     const tier = session.metadata.tier;
     if (userId && tier) { await storage.updateUser(userId, {...}); }
   }
   ```
   The checkout session creator sets `metadata: { tier, product }` — **never `userId`**. `parseInt(undefined)` is `NaN`, so the guard fails and `updateUser` never runs.

Three independent breaks in one path. `handlePaymentSuccess` — the only code that legitimately writes subscription state from a verified payment — is dead code.

**Files:** `server/index.ts:11`, `server/routes.ts` (`/api/webhook/stripe`, `handlePaymentSuccess`, `/api/create-checkout-session` metadata block)

**Fix:** Mount `express.raw({type:'application/json'})` on `/api/webhook/stripe` **before** `express.json()`. Add `STRIPE_WEBHOOK_SECRET` to required env in `server/env.ts`. Handle `payment_intent.succeeded`. Write `userId` into metadata. Make the webhook the **only** writer of `subscriptionTier` / `isSubscribed`.

---

## A2 — CRITICAL — Any logged-in user can make themselves an admin

**Verified in production code.** `server/routes.ts` — `PATCH /api/users/:id`:

```ts
app.patch("/api/users/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = parseInt(req.params.id);
  const updateData = req.body;

  // Ensure user can only update their own profile
  if (req.session.userId !== userId) {
    return res.status(403).json({ message: "Cannot update another user's profile" });
  }

  // Remove sensitive fields that shouldn't be updated via this endpoint
  const { password, stripeCustomerId, stripeSubscriptionId, ...safeUpdateData } = updateData;

  const updatedUser = await storage.updateUser(userId, safeUpdateData);
  ...
});
```

The self-edit check is correct. The field filter is a **denylist** — it strips `password`, `stripeCustomerId` and `stripeSubscriptionId`, but **not `role`, `subscriptionTier` or `isSubscribed`**. `storage.updateUser` performs an unfiltered `db.update(users).set(updates)`.

One request against your own account:

```
PATCH /api/users/<own-id>
{"role":"admin","subscriptionTier":"ultimate","isSubscribed":true}
```

This defeats every `requireAdmin`, `requirePremium` and `requireUltimate` check in the system, including all 22 HQ console data endpoints.

**Fix:** Replace the denylist with an explicit **allowlist** of editable profile fields (`username`, `bio`, `goals`, `dateOfBirth`, `dexterity`, `gender`, `sportExperience`, `profileImageUrl`).

---

## A3 — CRITICAL — Four more routes hand out paid tiers for free

**Verified in production code.**

| Path | Why it grants access |
|---|---|
| `POST /api/auth/upgrade-tier` | Commented "Demo route" but has **no production guard**, unlike `/api/demo/upgrade` and `/api/demo/reset` which correctly 404 when `NODE_ENV === 'production'`. Requires only a session, validates only that the tier string is in `['free','premium','ultimate']`, then writes it. |
| `POST /api/auth/register` | Passes `req.body` straight into `registerUser`. `server/auth.ts:216-217` declares `subscriptionTier?` and `isSubscribed?` on the input type; `server/auth.ts:265-266` writes them verbatim into `createUser`. No zod validation on the register body at all. |
| `/signup-after-payment?tier=` | Public route in the unauthenticated table, **no payment proof required**. Tier comes from the query string, is passed to `StableSignUpForm`, and is sent in the register payload. Navigate directly, sign up, receive `ultimate`. No `payment_intent`, `session_id` or token is validated. |
| `POST /api/create-payment-intent` | **Unauthenticated**, and `amount` is read from the request body with no cross-check against `TIER_PRICING`. Pay $1 for the $2,290 tier. |

The `create-payment-intent` handler in production:

```ts
app.post("/api/create-payment-intent", async (req, res) => {
  const { amount, tier, description } = req.body;
  if (!amount || !tier) return res.status(400).json({...});
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),   // ← client-supplied
    currency: "usd",
    metadata: { tier: tier, product: 'cerosity_access' }
  });
  ...
});
```

`upgrade-tier` in production:

```ts
app.post("/api/auth/upgrade-tier", async (req: AuthRequest, res) => {
  if (!req.session.userId) return res.status(401).json({...});
  const { tier } = req.body;
  if (!['free', 'premium', 'ultimate'].includes(tier)) return res.status(400).json({...});
  const updatedUser = await storage.updateUser(req.session.userId, {
    subscriptionTier: tier,
    isSubscribed: tier !== 'free'
  });
  ...
});
```

The signup form itself sends the tier — `client/src/components/stable-signup-form.tsx` posts `subscriptionTier: selectedTier, isSubscribed: selectedTier !== 'free'`.

**This is not an edge case. Client-declared entitlement is the designed flow.**

**Fix:** Delete `upgrade-tier`. Force `subscriptionTier: 'free'` / `isSubscribed: false` in `registerUser` and ignore those keys from the request body. Remove them from `stable-signup-form.tsx`. Derive `amount` server-side from `TIER_PRICING` in both payment endpoints. Require a Stripe-verified `session_id` at `/signup-after-payment`.

---

## A4 — CRITICAL — The $30/mo FLO subscription does not exist after purchase

**Verified in production code.**

`shared/entitlements.ts:6` defines four tiers:

```ts
export type SubscriptionTier = "free" | "flo" | "premium" | "ultimate";
```

`client/src/lib/permissions.ts` handles only `free`, `premium` and `ultimate`, falling through to `FREE_TIER_FEATURES` for anything else. Grep for `'flo'` in that file returns nothing.

Consequences for a subscriber who has just paid $30/mo:

- `canAccessDashboard(user)` returns false → `/` and `/dashboard` render `FreeDashboard`
- `/techniques`, `/tools`, `/goals`, `/scenarios`, `/community`, `/recommendations` are **not registered as routes at all** → `NotFound`
- Navigation renders **zero items** — Dashboard is skipped because tier isn't premium+, and Help is skipped because its condition `(!user?.isSubscribed || tier === 'free')` is false for a FLO user
- They are shown a prompt to upgrade to Premium for **$490** — a price that no longer exists

Separately, `shared/entitlements.ts:101` sets `unlimitedChat: "premium"` in `FEATURE_MIN_TIER`, while `TIER_ORDER` puts `flo` at 1 and `premium` at 2. **The headline feature the FLO tier is sold on ("Unlimited FLO conversations", `entitlements.ts:35`) is gated above the FLO tier.** Same for `dailyMood`, also advertised as a FLO-tier feature.

**Fix:** Add a `flo` case to `permissions.ts` and `navigation.tsx`. Re-map `FEATURE_MIN_TIER` so FLO-tier features are set to `"flo"`.

---

## A5 — CRITICAL — Existing users cannot buy, and cannot log in by URL

`client/src/App.tsx` maintains **two disjoint route tables**, switched on `!user`.

**`/checkout` is registered only in the unauthenticated table.** Every in-app upgrade link — including the ones in `bulletproof-ai-chat.tsx`, which is the chat component actually mounted on `/dashboard` — points to `/checkout?tier=premium`. A logged-in free user who clicks Upgrade falls through to `<Route component={NotFound} />`.

**There is no `/login` route.** Sign-in exists only as a local `SignInForm` component inside `client/src/pages/landing.tsx`, reachable exclusively by clicking "Sign In" in the landing nav. This means:

- No bookmarkable login URL
- No target for password-reset or transactional email
- No session-expiry redirect — a returning user who bookmarked `/dashboard` silently gets the marketing landing page via the catch-all route
- Post-logout, `navigation.tsx` sends the user to `/`, where they must re-find the nav button

**There is no password reset flow in the codebase at all.** No `/api/auth/forgot-password`, no reset token table in `shared/schema.ts`, no change-password endpoint. Users who forget passwords require manual DB intervention.

On the sign-in screen, **both "← Back" and "Sign up" call the same `onBack` handler** — there is no path from sign-in to sign-up.

There is also no `/signup` URL — signup is `showSignUp` local state in `landing.tsx`, so it cannot be linked from an ad campaign or email.

The Google SSO button is fully styled with a four-colour brand SVG and fires a toast saying "Google SSO is being configured."

**Fix:** Add real `/login`, `/signup` and `/reset-password` routes. Register `/checkout` in the authenticated table.

---

## A6 — HIGH — The upgrade button that does work undercharges by $100

`client/src/pages/free-dashboard.tsx` hardcodes:

```ts
const amount = tier === 'premium' ? 490 : 2190;
```

and posts it to `/api/create-checkout-session`, which honours the client's amount (see A3). Live prices from `TIER_PRICING` are **$590** and **$2,290**.

Every premium sale through that button loses **$100** — then delivers nothing, because of A1. It redirects to `/dashboard?upgrade=success` where nothing has changed.

---

# B. What you are selling does not ship

Assuming payment worked, this is what the customer would actually receive.

## B1 — CRITICAL — The entire curriculum is in the database with no way to reach it

**Verified against production Supabase.**

Production contains **1 course, 3 modules and 23 lessons** — "Red2Blue Foundation", structured exactly as the three founder sessions:

```
courses (1)
  └── Red2Blue Foundation

course_modules (3)
  ├── Session 1: What Is Red2Blue?
  ├── Session 2: How Do You Use Red2Blue?
  └── Session 3: How Do You Practise Red2Blue?

lessons (23)
   1  Welcome to Red2Blue               13  Tool: What Ifs
   2  Performance Is Not All or Nothing 14  Tool: Screw Up Cascade
   3  The Performance Triangle          15  Practice: The Penalty
   4  Mindset Is a Skill                16  Practice: The Audition
   5  Red Head, Blue Head               17  Pressure Is Personal
   6  Recognise, Accept, Choose         18  Your Myths and Triggers
   7  The Gazing Principle              19  The Performance Timeline
   8  Tool: Control Circles             20  Tool: Priority Planner
   9  Tool: Recognition Radar           21  Tool: Mental Skills X-Check
  10  Control of Attention: Rituals…    22  More Control of Attention Exercises
  11  Where Pressure Comes From         23  Putting It All Together
  12  Spotting the Loop
```

This is the digitised IP described in `docs/PRODUCT-AND-VISION-CONTEXT.md`. It is the product.

**There is no code that reads it.**

```
grep -rn "courses|lessons|course_modules|lesson_progress" server/ shared/   →  0 matches
grep -n "= pgTable("  shared/schema.ts                                     →  29 tables, none of them these
grep -n "api/course|api/lesson"  server/routes.ts                          →  0 matches
ls client/src/pages/ | grep -i "course\|lesson"                            →  none
```

No table in `shared/schema.ts`. No API route. No page. No router entry. Row counts confirm nothing has ever written to `lesson_progress` (0) or `course_certificates` (0).

**The "access all the files behind guardrails" product does not exist yet.** This is the largest piece of genuine missing work in the audit.

**Fix:** Add `courses` / `course_modules` / `lessons` / `lesson_progress` / `course_certificates` to `shared/schema.ts`, generate a migration, add tier-gated API routes, build a lesson page and progress tracking.

---

## B2 — CRITICAL — The two content pages behind the paywall are empty

**Verified against production Supabase.**

```
techniques   0 rows
scenarios    0 rows
```

Both pages (`client/src/pages/techniques.tsx`, `client/src/pages/scenarios.tsx`) are gated at premium and both read from those tables. A customer who pays $590 and opens Techniques sees an empty list.

The seed data for both exists — but only inside `MemStorage` (`server/storage.ts:146-1219`), a 1,074-line in-memory class. `server/storage.ts:1927` exports `DatabaseStorage`, so `MemStorage` is **dead code and never runs**. `seedData()` at `server/storage.ts:194` — including its default techniques, scenarios and pre-performance routines — is unreachable.

Full production row counts:

| Table | Rows | | Table | Rows |
|---|---|---|---|---|
| `flo_brain_documents` | 67 | | `techniques` | **0** |
| `lessons` | 23 | | `scenarios` | **0** |
| `feature_flags` | 4 | | `chat_sessions` | 0 |
| `course_modules` | 3 | | `assessments` | 0 |
| `leads` | 2 | | `athlete_profiles` | 0 |
| `users` | 2 | | `flo_subscriptions` | 0 |
| `courses` | 1 | | all other tables | 0 |
| `flo_sport_contexts` | 1 | | | |

**Fix:** Extract the seed data from `MemStorage` into a proper seed script against `DatabaseStorage`, and run it. Then delete `MemStorage`.

---

## B3 — CRITICAL — FLO is not answering with AI on the live site

**Verified by live request to production.**

Three unrelated prompts were sent to `POST /api/landing-chat`. All three returned **byte-identical text**:

```
POST /api/landing-chat  (production, three distinct prompts, messageCount: 1)

  "what is the capital of France"   → "Every athlete faces moments that test them…"
  "explain quantum entanglement"    → "Every athlete faces moments that test them…"
  "my dog is called Rex…"           → "Every athlete faces moments that test them…"
```

That string is the catch-all return of `generateFallbackResponse()` in `server/gemini.ts:219-228`. The function is a keyword matcher:

```ts
function generateFallbackResponse(userMessage: string): CoachingResponse {
  const message = userMessage.toLowerCase();
  if (message.includes("control circles")) { return {...}; }
  if (message.includes("breathing"))       { return {...}; }
  if (message.includes("nervous") || message.includes("anxiety") || message.includes("pressure")) { return {...}; }
  if (message.includes("mistake"))         { return {...}; }
  if (message.includes("putt"))            { return {...}; }
  if (/^(hi|hello|hey|yo|sup|hiya)\b/i.test(message.trim())) { return {...}; }
  if (message.includes("opponent") || …)   { return {...}; }
  if (message.includes("weather") || …)    { return {...}; }
  if (message.includes("confidence") || …) { return {...}; }
  return { message: "Every athlete faces moments that test them…", … };   // ← what production returns
}
```

`/api/health` reports `geminiConfigured: true`, so the key is present. **The Gemini call is failing and being silently swallowed.**

```json
GET /api/health →
{"status":"ok","commit":"56c323f","geminiConfigured":true,"vapiConfigured":true,"timestamp":"…"}
```

Compounding this: every failure path in the chat returns an in-character FLO message at HTTP 200. **A total AI outage is indistinguishable from FLO working**, to users and to you. There is no error-rate telemetry on the LLM call beyond a `console.error`.

Note also that the fallback text violates the landing prompt's own rules — `server/flo-prompt.ts` explicitly bans the generic default reply in `forLanding` mode.

**Fix:** Log the actual Gemini error. Return a distinguishable state instead of an in-character fallback. Add an error-rate metric. Investigate whether the failure is quota, model name, safety filter, or the 12s timeout.

---

## B4 — HIGH — FLO's memory and knowledge base are wired but disconnected

### Athlete context is fetched then dropped

`server/routes.ts` (`POST /api/chat`) calls `formatAthleteContextForPrompt` (`server/flo-athlete-context.ts:3-58`), which builds an ATHLETE / SPORT / BIO / ACHIEVEMENTS / CHALLENGES / GOALS block, and passes it to `buildFloPrompt` as `opts.athleteContext`. `BuildFloPromptOpts` declares the field at `server/flo-prompt.ts:94`.

**`buildFloPrompt` never reads it.** Tracing `server/flo-prompt.ts:117-186`, it consumes `visitorName`, `sport`, `forLanding`, `assessmentContext`, `salesDirective` and `forChatApi` — never `athleteContext`. A database round-trip per message for data the model never sees.

`assessmentContext` *is* used (`flo-prompt.ts:151-153`), so X-Check scores do reach the prompt.

### The knowledge base has no retrieval

`server/flo-prompt.ts:63-73`:

```ts
const docs = await db.select({...}).from(floBrainDocuments)
  .where(eq(floBrainDocuments.isActive, true));
const combined = docs.map(d => `[${d.category.toUpperCase()}] ${d.title}:\n${d.contentText}`).join("\n\n---\n\n");
const trimmed = combined.slice(0, 8000);
```

No `ORDER BY`. No `LIMIT`. No relevance filter. No per-sport filter. Then a blind `.slice(0, 8000)` on the concatenation. Postgres returns rows unordered, so **which 8KB of your IP reaches FLO changes between requests**. `scripts/import-sport-t0-seed.ts:88` sets `MAX_CONTENT_CHARS = 8000`, so a single document can consume the entire budget, and a mid-document cut leaves a truncated fragment as FLO's only additional knowledge.

Zero embeddings — grep for `embedding|vector|pgvector|cosine` across `server/`, `shared/`, `scripts/`, `package.json` returns nothing. There are 67 documents in `flo_brain_documents`.

Cache is per-process, 5 minutes (`flo-prompt.ts:54-55`) — not shared across Railway replicas.

### The logged-in home page runs the anonymous landing FLO

`client/src/pages/home.tsx` renders `<StableChat />` for authenticated premium/ultimate users. `client/src/components/stable-chat.tsx` posts to `/api/landing-chat` with **only** `{ message }` — no `messageCount`, no `conversationHistory`.

Result, for a paying customer, on every message:

- Server defaults `count = 1`, so `buildLandingSalesDirective` always returns the "**this is the visitor's FIRST message**" branch
- `forLanding: true` injects "You are FLO on the public website. The visitor gets exactly 6 free text exchanges" into a paid coaching session
- **Zero conversation history** — every reply is a cold start, no memory within the same conversation
- No athlete profile, goals or X-Check data (those only load on `/api/chat`)

`client/src/pages/free-dashboard.tsx` → `LandingChatStableV2` has the identical defect, plus its own client-only 5-credit counter held in React state that resets on page refresh.

The product's core promise is memory — the gate message literally says *"I'll remember everything we've talked about."* On the logged-in home page it does not exist.

### Per-sport context is dead

`flo_sport_contexts` holds a 5,731-character `flo_sport_context_summary` written by `scripts/import-sport-t0-seed.ts:170`. It is **never read at runtime** — the only reader is the HQ admin list endpoint. `clearSportContextCache()` is an explicit no-op stub (`server/flo-prompt.ts:85-87`, `// No-op — sport context is now inline`), and the seed script writes those rows with `isActive: false`.

All sport awareness FLO receives is one line: `ATHLETE CONTEXT: Primary sport is ${sport}.`

### "AI Recommendations" contain no AI

`server/recommendationEngine.ts:2` imports `getCoachingResponse` and `generatePersonalizedPlan` from `./gemini` — **and never calls either**. The engine is keyword matching: `containsPracticeRequest`, `containsStressPattern`, `extractTechnique` (with the comment *"Simple extraction - in production would use more sophisticated NLP"*), and hardcoded golf-specific action steps. User-facing strings are pre-written templates.

---

## B5 — HIGH — Anonymous visitors can burn unlimited AI spend

**Verified by live request to production.**

The six-message preview gate **is** enforced server-side — good:

```
POST /api/landing-chat  {"message":"…","messageCount":99}
→ {"message":"You've had a taste of what FLO can do…","showSignupCta":true,"previewEnded":true}
```

But the count comes from `req.body.messageCount`, supplied by the browser:

```
POST /api/landing-chat  {"message":"tell me about handling pressure in golf","messageCount":1}   ×4
→ served all four times
```

There is no session, no IP counter, no fingerprint and **no server-side state whatsoever** for anonymous chat.

Additional exposure:

- **No rate limiting anywhere in the application.** No `express-rate-limit` in `package.json`, no custom limiter in `server/`. Exposed: `/api/auth/login` (unlimited credential stuffing against bcrypt rounds=10), `/api/auth/register`, `/api/landing-chat`, `/api/capture-lead` (each triggering two Resend emails), `/api/client-error`.
- **Token amplification.** `message` is capped at 500 chars, but `conversationHistory` is only `slice(-12)` with **no per-item or total size validation**. `express.json()` is mounted with no `limit` option, defaulting to 100KB — so ~100KB of caller-controlled text can reach Gemini per request.
- **No CAPTCHA, no Turnstile, no origin check.**
- Output is capped at `maxOutputTokens: 800` (`server/gemini.ts:49`) — the only cost control that exists, and it bounds only the output side.
- **VAPI voice is entirely ungated.** The mic sits on the public landing page, starts a call with no auth, no minute cap and no tie to the text gate. Voice (STT + GPT-4o + ElevenLabs TTS) is the most expensive unit of compute in the product. There is **no call logging** — `voice_calls`, `voice_sessions` and `voice_call_transcripts` all have 0 rows, and none of those tables are in `shared/schema.ts`. Cost is invisible until the bill arrives.

**Worst case:** a single laptop running concurrent requests drives Gemini and VAPI spend limited only by Railway throughput and API quota. No circuit breaker, no daily cap, no spend alarm, no anonymous usage table to detect it after the fact.

---

# C. Things live on the site that damage credibility

## C1 — CRITICAL — Seven of nine endorsers show the wrong person's photograph

**Verified live on cerosity.com.** `client/src/pages/landing.tsx:301-309` on `origin/main`:

| Name shown | Photo actually rendered | Correct? |
|---|---|---|
| Brian Ashton | `brian-ashton.png` | ✅ |
| Ashley Giles MBE | `adrian-larsson.png` | ❌ |
| Alice Powell | `ashley-giles.png` | ❌ |
| Vicki Anstey | `alice-powell.png` | ❌ |
| Imogen Hall | `kerry-inscker.png` | ❌ |
| James Newman | `vicki-anstey.png` | ❌ |
| Kerry Inscker | `imogen-hall.png` | ❌ |
| Stuart Lancaster | `stuart-lancaster.png` | ✅ |
| Adrian Larsson | `darren-cassidy.png` | ❌ |

These are real, named, identifiable public figures paired with other people's faces, on the section whose entire purpose is credibility.

**Every correct image already exists** in `client/public/endorsers/`:

```
adrian-larsson.png   alice-powell.png     ashley-giles.png   brian-ashton.png
darren-cassidy.png   imogen-hall.png      james-newman.png   kerry-inscker.png
stuart-lancaster.png vicki-anstey.png
```

`james-newman.png` is sitting unused while James Newman displays Vicki Anstey's photo.

**This is a nine-line mapping fix and should be done first.**

---

## C2 — CRITICAL — Athletes are shown randomly generated numbers as their own progress

| Location | Code | Rendered as |
|---|---|---|
| `client/src/pages/home.tsx:312` | `` `+${Math.round(Math.random() * 15 + 5)}%` `` | "Weekly Progress" — re-rolls every render |
| `client/src/pages/home.tsx:395` | hardcoded `"+12% improvement"` / `"vs last week"` | performance trend |
| `client/src/components/progress-chart.tsx:56` | hardcoded `"+15% improvement this week"` | chart caption |
| `client/src/components/mood-indicator.tsx:58-62` | `moodScore + (Math.random() - 0.5) * N` | confidence, focus, energy, stress, motivation scores |
| `client/src/console/pages/CoachingData.tsx:100` | `Math.floor(40 + Math.random() * 50)` | a table cell in the internal management console |
| `client/src/pages/terms-of-service.tsx:196` | `"99.9% uptime"` | legal document |

On a mental-performance product sold to elite athletes, presenting invented numbers as measured performance is the most serious trust problem in the codebase — and it is a consumer-protection exposure rather than a design flaw.

**Fix:** Every instance must be real data or an empty state.

---

## C3 — HIGH — Three different price lists are live simultaneously

`shared/entitlements.ts:16-67` is the correct source of truth:

| Tier | Price | Interval |
|---|---|---|
| `free` | $0 | month |
| `flo` | $30 | month |
| `premium` | $590 | one-time |
| `ultimate` | $2,290 | one-time |

Three files honour it: `checkout-final.tsx`, `checkout-simple.tsx`, `signup-after-payment.tsx`. **Everywhere else is hardcoded, and mostly stale.** Direct violation of CLAUDE.md Rule 1.

| File | Values | Status |
|---|---|---|
| `client/src/pages/landing.tsx` | $0, $30, $25/mo, $590, $99/yr, $2,290 | correct values, hardcoded in JSX; `$25/mo annual` and `$99/yr renewal` exist nowhere in config |
| `client/src/pages/free-dashboard.tsx:91` | `490 / 2190` | **stale — undercharges $100 (see A6)** |
| `client/src/pages/free-dashboard.tsx:429,452` | $490, $2190 | stale |
| `client/src/pages/features.tsx:167,181,195` | $0, $490, $2190 | stale; also an unanchored "(75% savings)" claim |
| `client/src/lib/permissions.ts:143,147` | $490, $2190 | stale — in upgrade-prompt copy |
| `client/src/pages/terms-of-service.tsx:91,92,210` | $490, $2190, $2,190 | **stale in a legal document** |
| `client/src/pages/refund-policy.tsx:32` | $490, $2190 | **stale in a legal document** |
| `client/src/pages/help.tsx:69,153,160` | $590, $2,290 | correct, hardcoded |
| `client/src/components/bulletproof-ai-chat.tsx:372` | $590, $2290 | correct, hardcoded (live on `/dashboard`) |
| `client/src/components/landing-chat.tsx:135,246,252` | $690, $1590, $490, $2190 | four prices, none ever correct; file is dead |
| `server/routes.ts:312-323` | `prod_SR3rZuRQG7JnqR`, `prod_SR3txKbR55uws2`, `59000`, `229000` | hardcoded Stripe product IDs and cents |
| `server/storage.ts:1656,1731` | `(premiumUsers * 490) + (ultimateUsers * 2190)` | admin revenue figures computed with stale literals |

Nothing is pulled from Stripe. Server-side price comes from the request body, so Stripe is not authoritative either.

**Legal exposure:** Terms of Service and Refund Policy state prices that differ from what is charged.

---

## C4 — HIGH — Marketing promises things the product cannot deliver

- **Four free downloads** are offered on the landing page to drive signup. Only three endpoints exist (`master-your-moment`, `ability-to-focus`, `mental-toughness`), and two of the four named files — "Pre-Shot Routine" and "Motivation & Inspiration" — have no endpoint. Half the stated reason to create an account is undeliverable.
- **Mental Skills X-Check** and **Control Circles** are marketed as features on `features.tsx`. Both components (`client/src/components/mental-skills-xcheck.tsx`, `client/src/components/control-circles.tsx`) are orphaned — imported by nothing, wired to no route.
- All four CTAs on `features.tsx` (`:322-328`, `:385-391`) have **no `onClick` and no `href`**.
- The "Sign in with Google" button is fully styled with a four-colour brand SVG and fires a toast saying SSO is being configured.
- `human-coaching.tsx:83-85` — the "Upgrade to Ultimate" button on the tier gate screen has **no `onClick`**. Dead end. Its three mutations have **no `onError`** — a failed send silently does nothing.
- **Sport mismatch.** The landing page sells to golf, tennis, running, football, rugby, cricket, academies and schools. The app assumes golf exclusively: `features.tsx` says "designed for elite golfers", "correlates with your golf performance", "on the golf course"; the signup form asks every user for a **golf handicap** and golf experience as the only sport fields; `DEFAULT_SPORT = "golf"` in `server/gemini.ts:25`. Only golf has knowledge-base content — `docs/kb/sports/{cricket,rugby,soccer,tennis}/` contain only a `README.md`.
- **Free-tier message limit is stated three ways:** `entitlements.ts:24` says "6 messages with FLO per session", `free-dashboard.tsx:308` says "5 Messages/Day", `server/storage.ts:1763` hardcodes `chatLimit = 5` lifetime.

---

# D. Security and data

**Good news first.** Session handling is genuinely sound — `connect-pg-simple` Postgres-backed store (not memorystore), mandatory `SESSION_SECRET` that throws if absent, `httpOnly: true`, `secure: isProduction`, `resave: false`, `saveUninitialized: false`, and `app.set('trust proxy', 1)` correct for Railway. bcrypt at 10 rounds. Server-side tier gating **exists and is correct** — `requirePremium` guards 44 endpoints, `requireUltimate` guards 3, `requireAdmin` guards all 22 `/api/admin/*` and `/api/hq/*` endpoints, `requireCoach` guards 2. The HQ console is protected server-side, not just by a client route guard.

The failures are around that, not in it.

## D1 — CRITICAL — A live Google API key is permanently in git history

**Verified in git history.**

```
git log --all --oneline -S"AIzaSy" -- server/gemini.ts
704441c  feat: P2+P2b lead capture, FLO Brain knowledge system, HQ doc manager   ← removed
cd065ef  chore: remove all Replit references — fully on Railway + Claude Code    ← added
```

A complete, unredacted Google Generative AI key beginning `AIzaSyCHAD3JiP…` was committed as a hardcoded fallback in `server/gemini.ts` and later removed. The working tree is clean (`gemini.ts:6` now falls back to `""`), but **the key remains readable in git history and on GitHub**.

**Rotate it in Google Cloud immediately.** Rotation is what matters; history scrubbing (`git filter-repo` / BFG) is secondary and requires force-pushing every branch. This key also fronts the unmetered anonymous chat endpoint in B5, so it is a live billing surface.

Also still in the working tree: `deployment-env-fix.md:34` contains a truncated second Gemini key prefix, and `:33` a partially-redacted Neon connection string. The `sk_live_...` / `pk_live_...` strings in `deployment-checklist.md`, `deployment-debug.md`, `deployment-setup-guide.md`, `add-missing-secrets.md` and `docs/ENV-VARS.md` are placeholders — but they are exactly the noise that makes a real leak easy to miss.

No `.env` file is tracked. `.gitignore` correctly blocks `.env*` with a `!.env.example` exception.

---

## D2 — CRITICAL — Running `npm run db:push` could delete the curriculum

**Verified against production Supabase.**

Production has **38 tables**. `shared/schema.ts` defines **29**.

**Ten orphan tables exist in production and are invisible to the schema:**

```
courses              course_modules       lessons
lesson_progress      course_certificates  feature_flags
admin_audit_log      voice_calls          voice_sessions
voice_call_transcripts
```

Plus `sessions`, created at runtime by `connect-pg-simple` (`createTableIfMissing: true`) and never in `schema.ts` at all — the auth backing store is invisible to both schema and migration history.

**Migration coverage:** `migrations/meta/_journal.json` has **one entry**. `migrations/0000_add_flo_subscriptions.sql` contains 25 `CREATE TABLE`. Four tables in `schema.ts` (`leads`, `flo_brain_documents`, `flo_sport_contexts`, `athlete_profiles`) have no migration either — they were added by `push`.

`drizzle.config.ts:11` points straight at `process.env.DATABASE_URL` with **no environment guard**, and `docs/ENV-VARS.md:52` instructs: *"Run `npm run db:push` after schema changes so the database matches `shared/schema.ts`."*

**Drizzle push proposes dropping tables it does not know about. One routine command against the wrong environment takes the 23 lessons with it.** There is no migration history, no rollback and no review of destructive DDL.

**Fix, in this order:** (1) add a production guard to `db:push`; (2) `drizzle-kit generate` the ten orphan tables plus `sessions` into a real migration; (3) move the deploy path to `migrate`, not `push`.

---

## D3 — HIGH — Anyone authenticated can read anyone else's coaching conversations

`POST /api/chat` (`server/routes.ts:1717`) is guarded by `requireAuth` **only**. Line 1719 takes `userId` from `req.body` and never compares it to `req.userId`.

Impact — any authenticated free user posting `{"userId": <victim_id>}`:

1. Bypasses their own 5-chat cap entirely
2. Burns the victim's `floChatsUsed` counter instead
3. **Receives the victim's full stored chat history** in the response (`routes.ts:1817`)
4. Leaks the victim's assessment scores into the prompt context

`sessionId` is equally unchecked — `storage.getChatSession(sessionId)` at `routes.ts:1739` has no ownership check, so private coaching conversations are readable by iterating integers.

**The project already has the right guard.** `requireOwnUserOrAdmin` (`server/auth.ts:167-181`) supports body params (`req.params[paramName] ?? req.body?.[paramName]`) and is correctly used on 24 other routes. It was simply not applied here.

Other endpoints missing ownership checks:

| Endpoint | Problem |
|---|---|
| `POST /api/daily-mood` | `userId` from parsed body, never compared to `req.userId` |
| `PUT /api/daily-mood/:id` | no ownership check on `:id` |
| `POST /api/insights/:id/acknowledge` | no ownership check on `:id` |
| `POST /api/recommendations/:id/feedback` | no ownership check on `:id` |
| `GET /api/chat/:sessionId/followup` | `sessionId` not validated against session user |
| `PATCH /api/hq/flo-brain/:id` | admin-only, but unfiltered `req.body` into update |
| `PATCH /api/admin/users/:userId` | admin-only, unfiltered `req.body` — CSRF-reachable |

---

## D4 — HIGH — No CSRF protection, and cookies are set `sameSite: 'none'`

`server/auth.ts:54` sets `sameSite: isProduction ? 'none' : 'lax'`, commented "Allow cross-site in iframe".

There is **no CSRF token scheme** anywhere — no `csurf`, no double-submit token, verified absent from `package.json` and all of `server/`. There is also no `helmet` (so no CSP, `X-Frame-Options`, `X-Content-Type-Options`, HSTS or `Referrer-Policy`), no `cors` package and no origin allowlist.

Combined with D2's admin-escalation route, **a single forged request from any page a logged-in user visits is a full platform takeover**. Absent `X-Frame-Options` plus `SameSite=None` also makes the app clickjackable with an authenticated session.

**Session fixation:** `req.session.userId` is assigned onto the pre-existing session ID at both register and login. There is no `req.session.regenerate()` anywhere in the codebase.

**Credential logging:**
- `server/routes.ts` register handler: `console.log('Registration data:', req.body)` — logs the **plaintext password**
- `server/index.ts:62-69` error handler: logs full `req.headers` (including the `Cookie` header with a live session ID) and full `req.body`
- `server/index.ts:18-33` monkey-patches `res.json` to log every API response body (truncated at 80 chars)
- `server/auth.ts:262-283` logs email, username and password-verification outcome on every login attempt

**SQL injection — one real instance.** `server/routes.ts:2423-2431`, the admin DB explorer:

```ts
const sortCol = req.query.sortCol as string | undefined;
const sortDir = (req.query.sortDir as string) === 'desc' ? 'DESC' : 'ASC';
const orderClause = sortCol ? `ORDER BY "${sortCol}" ${sortDir}` : 'ORDER BY id DESC';
await pool.query(`SELECT * FROM "${table}" ${orderClause} LIMIT $1 OFFSET $2`, [limit, offset]);
```

`table` is allowlisted and `sortDir` normalised, but **`sortCol` is interpolated unvalidated**. A `"` breaks out of the identifier quoting, and `pool.query` with a single string permits multi-statement execution. Admin-authenticated — but chained with D2 (any user → admin) and D4 (no CSRF), it is reachable by an anonymous attacker.

**Input validation** is applied on only ~6 of ~100 endpoints. Notably absent from register (no email format check, **no password policy at all**), login, `create-payment-intent` (`Math.round(amount*100)` on a non-number yields `NaN`), and `POST /api/mental-skills-xcheck` / `POST /api/control-circles`, which **silently substitute fabricated default scores `[75,80,85]`** when fields are absent — writing fake data to the database.

**Other:** `/api/client-error` destructures `diagnostic.message` with no guard — an empty body throws, routing to the error handler that dumps headers and body. Unauthenticated log-flood.

---

## D5 — HIGH — Zero foreign keys and zero indexes across 29 tables

```
grep -c "references("  shared/schema.ts                                     → 0
grep -c "index("       shared/schema.ts                                     → 0
grep -cE "FOREIGN KEY|REFERENCES"  migrations/0000_add_flo_subscriptions.sql → 0
```

**23 `integer("user_id")` columns, none declared as a foreign key.** No `ON DELETE CASCADE` anywhere — deleting a user orphans rows in 23 tables. No unique constraint tying `flo_subscriptions.userId` to one row.

**Missing indexes on hot paths** (every one is a sequential scan today):

- `user_id` on all 23 child tables — every dashboard and profile query filters on it
- `users.email`, `users.username` — hit on every login
- `daily_moods (user_id, date)`, `daily_check_ins (user_id, date)`, `user_engagement_metrics (user_id, date)` — should be composite unique
- `assessments (user_id, created_at DESC)` — `getLatestAssessment` currently sorts in JavaScript at `server/storage.ts:587` rather than in SQL
- `chat_sessions.user_id`, `notifications (user_id, is_read)`, `ai_recommendations (user_id, is_active)`
- `leads.email` — no uniqueness, duplicate lead capture unguarded
- `sessions.expire` — `connect-pg-simple`'s reaper full-scans without it

**NOT NULL / defaults:** every score column in `assessments` is nullable, which is the direct cause of the 23 `TS18047` errors in E1. `created_at` / `updated_at` are `defaultNow()` **without** `.notNull()`, so they infer `Date | null` and every sort on them is a type error. `users.role` is nullable with no default — permission checks read a possibly-`null` role.

**RLS:** enabled on every production table with **no policies defined**. This is safe today because the Express server connects with a privileged role that bypasses RLS — but it means the database itself provides no defence if a connection string or anon key ever leaks. At minimum `athlete_profiles`, `daily_moods`, `chat_sessions`, `assessments` and `leads` warrant real policies.

---

# E. Engineering health

The build ships and the deploy pipeline works. Underneath it, the codebase has accumulated enough duplication that changing FLO means guessing which of seventeen chat components matters.

## E1 — HIGH — `npm run check` fails with 162 errors

**Verified by running it.** `tsc` with `strict: true`.

```
npx tsc --noEmit 2>&1 | grep -c "error TS"   →  162
```

**By file:**

```
 60  server/storage.ts                10  client/src/pages/home.tsx
 12  server/routes.ts                  9  client/src/pages/coaching-tools.tsx
 11  server/recommendationEngine.ts    7  client/src/pages/goals.tsx
  1  server/vite.ts                    6  client/src/components/ai-recommendations.tsx
  1  server/index.ts                   5  visual-progress-tracker, pre-shot-routine-builder,
                                          control-circles, community-leaderboard
                                       3  profile-new, pre-shot-routine, mood-tracker,
                                          mental-skills-xcheck, landing-chat
                                       2  techniques-old, floating-chat
                                       1  techniques, dashboard, resilience-game,
                                          optimized-ai-chat, bulletproof-ai-chat, ai-chat
```

Split: **85 server, 77 client**. By code: `TS2339` ×35, `TS2304` ×34, `TS2322` ×24, `TS18047` ×23, `TS18046` ×21.

This violates CLAUDE.md Rule 2 ("Run typecheck before committing: `npm run check`. Never push code that breaks the build."). `docs/OVERNIGHT_RUN_REPORT.md:81` acknowledges "Pre-existing TS errors in storage.ts/vite.ts not touched (out of scope)."

**Two clusters are real bugs, not type noise:**

**Group A — 34 missing type imports in `server/storage.ts`.** Lines 744-909 reference `RecognitionAssessment`, `InsertRecognitionAssessment`, `WhatIfPlanning`, `InsertWhatIfPlanning`, `ScrewUpCascade`, `InsertScrewUpCascade`, `PriorityPlanning`, `InsertPriorityPlanning`, `CertificationProgress` — all exported from `shared/schema.ts:389-394` but never imported. **The entire coaching-tools persistence layer is accidentally typed `any`.** One import line clears 34 errors.

**Group C — 23 nullable score columns dereferenced without guards.**

```
server/routes.ts(1333,31): 'latestAssessment.intensityScore' is possibly 'null'   (+1334, 1400-1403)
server/routes.ts(1344,28): 'recent' is possibly 'null'
server/recommendationEngine.ts(345-355): current/previous/weakest .score, .intensityScore possibly 'null'
server/storage.ts(587,100): 'b.createdAt' is possibly 'null'
```

Every score column in `assessments` is nullable in the schema and treated as `number` at runtime — a **live `TypeError` waiting** in the recommendation engine and dashboard endpoints.

**Group B — genuine schema divergence.** `sportExperience` and `assessments.updatedAt` are written by code and **absent from `shared/schema.ts`**.

**Group D — config type mismatches.** `server/auth.ts:54` `sameSite` widens to `string`, needs `as const`. `server/vite.ts:42` `serverOptions`. `server/index.ts:80` log level literal.

**Group E — ~60 untyped `useQuery` calls** returning `{}` / `unknown`, so every `.map`, `.length`, `.totalScore` fails. One shared typed query wrapper clears most of this block.

**9 of the 162 errors come from files that are already dead** (`techniques-old`, `landing-chat`, `floating-chat`, `ai-chat`, `optimized-ai-chat`). Deleting dead code is free error reduction.

---

## E2 — HIGH — Three operational faults that will bite in production

**The health check lies.** `server/index.ts:83-109` runs a `SELECT 1` probe but **always returns `status: 'healthy'` and HTTP 200** — a failed probe only sets `checks.database = false` and logs a warning. `railway.json:6` uses `/api/health` as the healthcheck path. **Railway will route production traffic to an instance with a dead database.**

**No graceful shutdown, no crash handlers.**

```
grep -rn "unhandledRejection|uncaughtException|SIGTERM|SIGINT|server.close|pool.end" server/ scripts/
→ scripts/import-sport-t0-seed.ts:227:  await pool.end();      (only match)
```

Zero handlers in `server/`. On Railway's SIGTERM the process dies immediately — in-flight requests dropped, `pg` pool connections not drained, session writes lost. Node 20 defaults to `--unhandled-rejections=throw`, so any un-awaited rejection **terminates the process with no log line, no stack trace and no alert**. Railway restarts silently up to 10 times (`railway.json:8-9`) and then stops.

**Unknown `/api/*` paths return the HTML shell, not a 404.** Verified live:

```
GET /api/auth/user       → 200  <!DOCTYPE html>…
GET /api/users           → 200  <!DOCTYPE html>…
GET /api/console/users   → 200  <!DOCTYPE html>…
GET /api/techniques      → 401  {"message":"Authentication required"}   ← real route, correct
```

`server/vite.ts:85-87` mounts `app.use("*", …)` which correctly serves the SPA for client routes but also swallows unmatched `/api/*`. Any API regression surfaces to the client as `Unexpected token '<'` and looks like a frontend bug. Needs an `/api/*` 404 guard before the catch-all.

**`pdfParse` runtime crash.** `server/routes.ts:16` does `import * as pdfParse from "pdf-parse"` and `:975` calls `pdfParse(req.file.buffer)`. esbuild warns at every build:

```
▲ [WARNING] Calling "pdfParse" will crash at run-time because it's an import
   namespace object, not a function [call-import-namespace]
```

`esModuleInterop` is on, so `import pdfParse from "pdf-parse"` is the fix. The first FLO Brain PDF upload will throw.

---

## E3 — HIGH — Roughly 3,300 lines of duplicated chat code

Seventeen chat components exist. **Four are live** — and they are four independent implementations of the same widget on four different pages, which is exactly why the landing chat and the logged-in chat behave differently (see B4).

| Component | Imported by | Endpoint | Status |
|---|---|---|---|
| `flo-chat.tsx` | `pages/landing.tsx` | `/api/landing-chat` | **LIVE** — canonical public FLO |
| `bulletproof-ai-chat.tsx` | `pages/dashboard.tsx` | `/api/chat` | **LIVE** — canonical authenticated FLO |
| `stable-chat.tsx` | `pages/home.tsx` | `/api/landing-chat` | **LIVE but wrong** (B4) |
| `landing-chat-stable-v2.tsx` | `pages/free-dashboard.tsx` | `/api/landing-chat` | **LIVE but wrong** (B4) |
| `flo-avatar.tsx` | 5 files | — | LIVE (shared) |
| `flo-voice-ptt.tsx` | `flo-chat.tsx` | VAPI SDK | LIVE |
| `landing-chat.tsx` | — | | **DEAD** — 299 LOC |
| `landing-chat-final.tsx` | — | | **DEAD** — 308 LOC |
| `landing-chat-fixed.tsx` | — | | **DEAD** — 326 LOC |
| `landing-chat-robust.tsx` | — | | **DEAD** — 316 LOC |
| `landing-chat-stable.tsx` | — | | **DEAD** — 293 LOC |
| `ai-chat.tsx` | — | | **DEAD** — 281 LOC |
| `optimized-ai-chat.tsx` | — | | **DEAD** — 483 LOC |
| `optimized-flo-chat.tsx` | — | | **DEAD** — 376 LOC |
| `bulletproof-flo-chat.tsx` | — | | **DEAD** — 379 LOC |
| `flo-chat-widget.tsx` | — | | **DEAD** — 383 LOC |
| `floating-chat.tsx` | — | | **DEAD** — 239 LOC |

`client/src/console/pages/FloChat.tsx` is a **different thing** — an HQ admin usage-stats table. Keep it.

**Other dead code:**

| Item | Note |
|---|---|
| `pages/checkout.tsx` | imported by `landing.tsx` but `setShowCheckout` is never called — unreachable. Carries its own stale price table. |
| `pages/payment-success.tsx` | not imported by `App.tsx` at all |
| `pages/profile.tsx` | `App.tsx` imports `profile-new` instead — 12KB duplicate |
| `pages/techniques-old.tsx` | 23KB, dead |
| `pages/DeploymentDebug.tsx` | 17KB, dead |
| `landing.tsx:619-1005` | ~390 lines of a second, richer `SignUpForm`/`SignUpFormFields` never rendered — and the only light-mode surface in an otherwise dark file |
| `MemStorage` (`server/storage.ts:146-1219`) | 1,074 lines, never instantiated |
| `server/openai.ts` | 317 LOC, entirely dead — its only importer's call site is commented out at `server/auth.ts:224-237` |
| `free-dashboard.tsx:57-86` | `upgradeUser()` defined, never called |
| Root junk | `redirect-home.html`, `production-test.js`, `deployment-fix.js`, `deployment-troubleshoot.js`, `GITHUB_UPLOAD_READY.txt`, `generated-icon.png` (241KB), `deployment-checklist.md`, `deployment-debug.md`, `deployment-env-fix.md`, `deployment-setup-guide.md`, `download-instructions.txt` — 11 files, all zero inbound references, all Replit-era, three containing example secret values |
| `scripts/` | `deployment-diagnostics.js`, `test-deployment.js`, `verify-deployment.js` — unreferenced by any npm script |

**Repo weight:** `attached_assets/` is 42MB across 114 tracked files — essentially the entire 43.6MB git pack. It is `.dockerignore`d so it never reaches the image, but every clone and CI checkout pays for it. Contents include a 7.2MB PDF, five 1.2MB Replit screenshots and six `Pasted--*Replit-Deployment-Issue*.txt` transcripts.

**Latent Docker hazard:** `vite.config.ts:15` aliases `@assets` → `attached_assets/`, a directory `.dockerignore` excludes. Exactly one reference exists and it is commented out (`client/src/pages/home.tsx:15`). The moment anyone uncomments it, the Railway build fails with an unresolved import that reproduces nowhere locally.

---

## E4 — HIGH — Build, bundle and environment

**Build succeeds.** `npm run build`:

```
../dist/public/index.html                    0.54 kB │ gzip:   0.36 kB
../dist/public/assets/index-B0Q0kEua.css   111.75 kB │ gzip:  17.77 kB
… 11 console chunks, 2.4–6.3 kB each …
../dist/public/assets/LineChart-*.js       384.19 kB │ gzip: 105.03 kB
../dist/public/assets/index-qZPF__8n.js  1,463.75 kB │ gzip: 396.15 kB

(!) Some chunks are larger than 500 kB after minification.
dist/index.js  236.2kb
```

**Code splitting exists only for the HQ console** — `client/src/console/App.console.tsx:8-17` uses `React.lazy` for all 11 pages. `client/src/App.tsx:11-46` imports **all 36 customer-facing pages eagerly**, so the landing page downloads the entire dashboard, checkout, assessment, goals and coaching-tools tree. No `manualChunks` in `vite.config.ts`.

**No `compression` middleware** — the 396KB gzip figure is Vite's estimate; nothing actually gzips on the wire. **1.46MB is served uncompressed.**

**No static cache headers.** `server/vite.ts:82` is a bare `express.static(distPath)` with no `maxAge`. Vite emits content-hashed filenames, so `maxAge: '1y', immutable: true` on `/assets` is free and safe; `index.html` must stay `no-cache`.

**`client/public/` is 9.7MB and served**, including a 1.5MB `flo/avatar.png` and 1.3MB `flo/flo-image-3.png` — unoptimized PNGs on the landing page critical path. Several PDFs are duplicated between `attached_assets/` and `client/public/downloads/`.

### The Stripe environment variables are deliberately swapped

`server/routes.ts:20-21`:

```ts
// Fix: Use testing keys (the env variables are swapped - "public" contains secret key)
const stripeSecretKey = process.env.TESTING_VITE_STRIPE_PUBLIC_KEY || process.env.STRIPE_SECRET_KEY;
```

and `:60-66` reads `process.env.TESTING_STRIPE_SECRET_KEY` as a **publishable** key candidate. `server/env.ts:13-23` enshrines the swap.

**Anything prefixed `VITE_` is inlined into the browser bundle by Vite.** The only thing preventing a secret key being served to browsers via `/api/stripe-config` is a `key?.startsWith('pk_')` filter at `routes.ts:66`. **That filter is the entire safety margin.** Unwind the naming to `STRIPE_SECRET_KEY` / `VITE_STRIPE_PUBLIC_KEY` before someone refactors it away.

### Environment variables — full inventory

**Boot-crash set (5):**

| Variable | Read at | Missing ⇒ |
|---|---|---|
| `DATABASE_URL` | `server/db.ts:5,11`, `server/auth.ts:22,30`, `drizzle.config.ts:3` | throws at import |
| `SESSION_SECRET` | `server/auth.ts:36` | throws at import |
| `STRIPE_SECRET_KEY` / `TESTING_VITE_STRIPE_PUBLIC_KEY` | `server/routes.ts:21` | throws at module load |
| `GEMINI_API_KEY` | `server/gemini.ts:3,6,37` | prod boot crash via `env.ts:8`; dev degrades to fallback |
| `VITE_STRIPE_PUBLIC_KEY` (or 2 alts) | `server/routes.ts:62-63` | prod boot crash via `env.ts:33` |

Note `routes.ts:21` and `auth.ts:36` throw **during module import**, before `requireProductionEnv()` at `index.ts:45` can produce its friendly message — the fail-fast validator is partly dead code.

**Degrading set:** `NODE_ENV` (missing ⇒ dev mode, insecure cookies, **demo upgrade routes exposed**), `PORT` (default 5000, but `Dockerfile:32` says `EXPOSE 8080`), `STRIPE_WEBHOOK_SECRET`, `OPENAI_API_KEY` (defaults to the literal `"default_key"` at `server/openai.ts:5`), `GEMINI_MODEL`, `ASSETS_PATH`/`PDF_ASSETS_PATH`, `RESEND_API_KEY`, `RAILWAY_GIT_COMMIT_SHA`, `GITHUB_SHA`.

**Client (`VITE_*`, baked at build time):** `VITE_STRIPE_PUBLIC_KEY`, `VITE_VAPI_PUBLIC_KEY`, `VITE_VAPI_ASSISTANT_ID`.

**Problems:**

- **No `.env.example`**, despite `.gitignore:10` explicitly whitelisting `!.env.example`
- `docs/ENV-VARS.md` is stale — line 24 still says "Replit path" (**CLAUDE.md Rule 4 violation**), line 27 claims `PORT` is "not read by default" when it is read at `server/index.ts:142`, and it documents neither `RESEND_API_KEY` nor any `VITE_VAPI_*` variable
- `VITE_VAPI_ASSISTANT_ID` is **missing from `Dockerfile:14-20`** while the other two `VITE_*` vars are present — **voice ships with an empty assistant ID in every Railway build**
- `.gitignore` is missing `logs/` (written at runtime by `server/debug.ts:57`) and `*.log`. It also still contains `vite.config.ts.*`, a Replit-era leftover.

### Model configuration — Rule 1 violations

- `GEMINI_MODEL` has **two different hardcoded fallbacks in one file**: `"gemini-2.0-flash"` at `server/gemini.ts:46` vs `"gemini-1.5-flash"` at `:222`, `:287`, `:314`. Unset in prod today ⇒ chat runs 2.0, assessments run 1.5.
- **`OPENAI_MODEL` does not exist anywhere in the codebase.** `server/openai.ts` hardcodes `"gpt-4o"` at lines 132, 190, 253, 301.
- **`gpt-4o` is hardcoded in the client bundle** at `client/src/components/flo-voice-ptt.tsx:16`, along with an ElevenLabs voice ID at `:53`.
- **There is no fallback provider chain.** The spec's "Gemini primary, OpenAI fallback" was never wired — `server/openai.ts` is dead.

---

## E5 — Deploy pipeline

**Pipeline:** `railway.json:4` sets `"builder": "DOCKERFILE"` → Railway builds `Dockerfile`, starts with `npm start` = `NODE_ENV=production node dist/index.js`. Every push to `main` auto-deploys.

**Dockerfile ↔ build script are aligned, and the build gate is genuinely good** — `Dockerfile:29` runs `npm run build` then asserts `dist/index.js`, `dist/public/index.html`, `dist/public/deploy.json` and greps the manifest for `"hasDarkTheme": true` before accepting the image.

Two Dockerfile problems:

- **No multi-stage build.** `npm ci` installs all devDependencies (vite, esbuild, drizzle-kit, typescript) and they stay in the final image. No `npm prune --production`.
- **`EXPOSE 8080` vs `PORT` default `5000`.** Works only because Railway injects `PORT`; the `EXPOSE` is decorative and misleading.

The last four commits before this worktree's HEAD (`caefcba`, `0ef1229`, `7275ccf`) are empty redeploy triggers — a sign the pipeline needed manual nudging.

---

## E6 — Logging and observability

No Sentry, no pino, no winston, no OpenTelemetry. Logging is a hand-rolled `DebugLogger` class (`server/debug.ts:12-60`) formatting emoji-prefixed strings to `console.log` — **not structured JSON**, so Railway's log search cannot filter by level, request ID or user. **38 raw `console.log` in `server/`, 55 in `client/src/`.** No correlation or request IDs anywhere.

- **PII in logs** — see D4.
- **Filesystem log writes on ephemeral storage.** `server/debug.ts:38-40,56-60` writes to `process.cwd()/logs` **only when `NODE_ENV === 'production'`**. Railway containers have ephemeral disks — these vanish on every redeploy while consuming disk and adding sync I/O to the hot path.
- **Internal error leakage.** `server/routes.ts:1822`, `:1712`, `:1833` and ~40 sibling handlers return `error: (error as Error).message` to the client.
- **Gemini timeout race never clears its timer or aborts the request.** `server/gemini.ts:63-70` races a 12s timer against `chat.sendMessage` — the Gemini call completes and is billed regardless. The rejection is caught at `:89` and converted into a **200 with a keyword fallback**, so the route's 408 branch is effectively unreachable from Gemini timeouts.

---

# F. UI / UX and design craft

## F1 — CRITICAL — The marketing site and the app are two different products

`landing.tsx:55` sets `bg-slate-950` and every section is dark. The moment a user signs in, `index.css:66` applies `bg-gray-50` and every app page is light with pastel gradients — `home.tsx:134`, `tools.tsx:16`, `scenarios.tsx:67` all `bg-gradient-to-br from-blue-50 to-white`.

There is **no shared shell**. `landing.tsx:57-82` hand-rolls its own dark nav; `navigation.tsx:64` is a completely separate white nav. Same logo, same product, two visual languages, zero shared components.

Compounding it: `client/index.html` sets `<body style="background-color:#020617">` while `index.css:66` applies `bg-gray-50` to the same element. **The two fight; whichever wins is accidental.**

## F2 — HIGH — Purple/indigo AI-slop accent: 194 occurrences across 25 files

`purple-600` ×40, `purple-700` ×20, `purple-500` ×17, `indigo-600` ×14, `indigo-500` ×14. Worst: `landing.tsx` (32), `free-dashboard.tsx` (18), `tools.tsx` (12), `home.tsx` (7).

**Cerosity's actual brand is Red2Blue** — red and blue, defined in `index.css:28-34` and correctly implemented in `console/console-theme.ts:55-60` (`red: '#E63946'`, `blue: '#1D7FBF'`). Purple and indigo are not brand colours. They appear because tier colour is being encoded as blue → indigo → purple, the default LLM "cheap/better/best" ramp. Nothing in Red2Blue supports it.

- `landing.tsx:498-528` — the "BEST VALUE" tier is `border-indigo-500`, `bg-indigo-600`, `shadow-indigo-500/10`
- `dashboard.tsx:90-93` — the Red2Blue **Tools** card is purple-bordered with a purple icon
- `navigation.tsx:77` — the ULTIMATE badge is `from-purple-600 to-indigo-600`
- `console/pages/FloBrainDocs.tsx:166` — literal `#7c3aed` / `#a78bfa` hardcoded, breaking the console's own token system

**Two-stop gradient hero.** `landing.tsx:101`:

```jsx
<span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">FLO</span>
```

Three-stop blue→indigo→purple gradient text on the H1 — the canonical AI-generated hero. Underneath, `landing.tsx:87-90` layers four more gradient/blur elements. Site-wide there are **92 `bg-gradient-to-*` uses**.

**Accent count above the fold is 6-8× over the cap of 2.** The nav "Get Started" (`:76`) and hero "Get Started Free" (`:116`) use **byte-identical styling** and both scroll to `#pricing-section` — two co-primaries plus a live chat widget competing for the same glance.

## F3 — HIGH — No typography system

- **No fonts are loaded.** `client/index.html` has no font `<link>`, `index.css` has no `@font-face` or `@import`, `tailwind.config.ts` has no `fontFamily` extension. Everything renders in Tailwind's default `ui-sans-serif, system-ui`. No display face; body and headline are the same typeface at the same optical settings.
- **Negative tracking nearly absent.** Four uses across the entire app. `landing.tsx:100` is the only large display text with `tracking-tight`. `features.tsx:234`, `tools.tsx:32`, `landing.tsx:154/294/330/376` all ship `text-3xl`/`text-4xl` at default tracking, which reads loose at those sizes.
- **Flat scale.** Landing distribution: `text-sm` ×60, `text-lg` ×13, `text-3xl` ×13, `text-xs` ×12, `text-xl` ×12, `text-4xl` ×5, and exactly one `text-6xl` and one `text-5xl` (same H1). Below the hero everything collapses into a 14/18/30px ladder.
- **Measure out of range.** `landing.tsx:103` constrains hero body to `max-w-sm` (~24ch, far too narrow); `:157,:379` use `max-w-2xl` at `text-lg` (~85ch, above the 70ch ceiling).

## F4 — HIGH — Contrast failures

| Pair | Ratio | Where |
|---|---|---|
| `text-slate-600` on `bg-slate-950` | **2.55:1** | `landing.tsx:284`, `footer.tsx:115` (legal disclaimer) |
| `text-slate-600` on `bg-slate-900` | **2.29:1** | `landing.tsx:212` |
| `text-slate-500` on `bg-slate-950` | **4.03:1** | `landing.tsx:257,268,284,365,427,452,478,508,538`, `footer.tsx:101,105,117,121` |
| `#6B7588` on `#1A1D2E` | **3.59:1** | `ConsoleLayout.tsx:81,111,112,128,129` |
| `placeholder:text-slate-500` on `bg-slate-900` | **3.6:1** | `footer.tsx:84-87` — all four lead-capture inputs |

`text-slate-500` is the platform's default muted colour — it appears on every price, every helper line and the entire footer. All of it fails 4.5:1.

## F5 — MEDIUM — Design tokens exist but are bypassed, and drift from their own comments

`index.css:27-34` defines Cerosity brand tokens and `:70-128` exposes utility classes. `navigation.tsx`, `dashboard.tsx`, `assessment.tsx` and `techniques.tsx` use them. **`landing.tsx` uses none** — 1,214 lines with zero token references.

Token values drift from their documented hex:

```css
--red-primary:  0 74% 42%;    /* comment says #DC2626  → actually hsl(0,72%,51%)   */
--blue-primary: 213 94% 68%;  /* comment says #2563EB  → actually hsl(221,83%,53%) */
--coral:        21 90% 48%;   /* comment says #F97316  → actually hsl(25,95%,53%)  */
--success:      160 84% 39%;  /* comment says #059669  → actually hsl(160,94%,30%) */
```

`--blue-primary` is the most consequential — it drives every active nav state and renders as a light `#5FA9FB`, not `#2563EB`, which is why the nav active pill looks washed out.

`tailwind.config.ts:47-62` references `--chart-1..5` and eight `--sidebar-*` variables **that are never defined** in `index.css`. Those utilities resolve to nothing.

## F6 — Other UI findings

**Emoji as iconography — 29 instances**, despite `lucide-react` being imported everywhere: `technique-card.tsx:23-26,38` (`🫁 🎯 ⛰️ ⚓ 🧠` as primary technique icons), `home.tsx:40-42` (Red/Blue Head as emoji), `coaching-animations.tsx:24-64` (coach avatars), `payment-success.tsx:51-53`, `community-leaderboard.tsx:248`, `techniques.tsx:482` (`✓` instead of the imported `CheckCircle`), `✕` as close controls in three files.

**Rounded card + coloured left-border tile — 11 instances**: `free-dashboard.tsx:167-215` (four in a row, red/blue/yellow/green with no semantic mapping), `control-circles.tsx:335,350,365`, `goals.tsx:479,564`, `profile-new.tsx:598,687`.

**Accessibility:**

- **5 `aria-label`s in the entire application**, all inside vendored shadcn primitives. Zero in authored code.
- Icon-only buttons with no accessible name: `navigation.tsx:130-136` (notifications), `Users.tsx:50`, `FloChat.tsx:131`, `coaching-animations.tsx:170-177`.
- Non-semantic clickable div: `assessment.tsx:289-302` — a `<div>` with `onClick` and `cursor-pointer`, no `role`, no `tabIndex`, no keyboard handler. **Unreachable by keyboard.** Same pattern in `coach-dashboard.tsx`, `console/pages/Settings.tsx`, `console/pages/FloChat.tsx`.
- **The console has no focus states at all** — every interactive element is an inline-styled button/anchor with `outline` unset by the reset and nothing replacing it.
- `client/index.html` sets `maximum-scale=1`, blocking pinch-zoom on iOS. WCAG 1.4.4 failure and unnecessary.
- `scenarios.tsx:158` uses `alert()` as the primary interaction for "Practice This Scenario".
- Positive: all 9 `<img>` tags have `alt`, and `landing.tsx:127` / `home.tsx:279` are genuinely descriptive.

**Motion:**

- **`prefers-reduced-motion` is never referenced.** Zero occurrences in any `.tsx`, `.ts` or `.css`.
- 72 instances of `repeat: Infinity` / `animate-pulse` / `animate-bounce` / `animate-spin`, none with a pause control (WCAG 2.2.2 Level A requires one for motion running >5s).
- `coaching-animations.tsx:282-311` — 3s and 4s infinite float+rotate on decorative Sparkles and Heart icons. `:155,193,260` — three concurrent 1s infinite opacity loops on one card.

**Placeholder copy shipped:** `ConsoleLayout.tsx:129` "Activity feed coming soon"; `dashboard.tsx:14` `const mockUserId = 1; // In a real app, this would come from authentication` — **used for all four data queries, so every premium user's dashboard requests user 1's data**; `landing.tsx:24-40` 17 lines of commented-out `IntersectionObserver` marked `DISABLED: … to prevent memory leaks and crashes`.

**Empty/error/loading states:** `dashboard.tsx:17-31` has four `useQuery` calls with **no `isLoading`, no `isError`, no `enabled`**. `human-coaching.tsx:21,40,58` — three mutations with **no `onError`**, so failures are silent. `profile-new.tsx:276-287` shows a skeleton forever for logged-out users instead of redirecting. `checkout-final.tsx` and `checkout-simple.tsx` are the best-handled pages in the funnel. The nested `ErrorBoundary` tree in `App.tsx` is genuinely well-placed — nothing found will hard-crash the app.

---

# G. What is working — do not change

- **The HQ console is the best-built thing in the repo.** `console/console-theme.ts` is a real token system: typed interface, light/dark pairs, semantic and chart scales. `ConsoleLayout.tsx:32-35` is a hand-written responsive grid with four breakpoints. `ConsoleThemeProvider.tsx` persists mode. All 11 pages are `React.lazy`-loaded. It is visually distinct from the customer app exactly as CLAUDE.md Rule 5 requires, and all 22 console endpoints carry `requireAuth, requireAdmin` server-side. *(Two nits: theme applied via inline `style={{}}` rather than CSS variables, so nothing is overridable; and `RESPONSIVE_CSS` is injected into `<head>` imperatively at runtime.)*

- **The Dockerfile build gate.** It asserts the server bundle, client HTML, deploy manifest, and greps the manifest for the dark-theme flag before accepting the image. That is better than most production repos.

- **Session security fundamentals are right** — Postgres-backed store, mandatory secret, `httpOnly`, `secure` in prod, correct `trust proxy`.

- **Server-side tier gating exists and works.** The gate is not the problem; the tier value it reads being attacker-controlled is.

- **The FLO system prompt is real IP, well written.** `server/flo-prompt.ts:5-52` — tight persona ("You are NOT a search engine, general assistant, or trivia bot"), explicit scope discipline ("You may give ONE short, polite answer to an unrelated question. Immediately after, redirect…"), a concrete 120-word cap backed by `maxOutputTokens`, and dense correct methodology: STUC/CIA, RECOGNISE→ACCEPT→CHOOSE, ESC/APE/ACT, Negative Content Loop, Control Circles zones, a 5-step timed pre-shot routine, the four X-Check quadrants, box breathing, 3-2-1 reset. The `forLanding` rules (`:138-148`) show hard-won product judgement — banning the generic default reply, banning repetition, banning bullet lists, and forbidding all marketing before message 6. **This is an asset. It is just being bypassed by the fallback path (B3).**

- **The error boundary tree in `App.tsx`** is well placed.

- **The curriculum itself.** 23 lessons properly structured across the three sessions. The hard content work is done.

- **The Red Head → Blue Head section** (`landing.tsx:150-228`) is the one place where brand concept drives visual decisions.

---

## G1 — Safety rails on FLO need work before launch

Flagged separately because it is a duty-of-care issue on a mental-performance product, not a bug.

The entire safety surface is **one clause** inside a KNOWLEDGE line (`server/flo-prompt.ts:10`):

> "Do not invent clinical diagnoses. Escalate self-harm to crisis resources immediately."

Problems:

1. **No crisis resources are supplied.** FLO is told to escalate but given no helpline numbers. It will hallucinate them, or give US numbers to a UK or AU athlete — and the product has a `country` field, so locale is knowable.
2. **No server-side crisis detection.** `urgencyLevel` is parsed from the model output (`gemini.ts:83`) and returned to the client — then **acted on by nobody**. No alerting, no escalation, no logging. It is decorative.
3. **Eating disorders, self-harm-adjacent overtraining, substance use and abusive-coach disclosures** — all realistic in elite-athlete populations — have no named handling.
4. **The fallback path has no safety rails at all.** During a Gemini outage — which is the current production state (B3) — an athlete disclosing genuine crisis and using the word "pressure" receives a chirpy "nerves mean you're ready to perform at a higher level."
5. **Refusal behaviour is undefined.** No instruction for jailbreaks, prompt extraction, or requests for medical or pharmacological advice. Scope redirection is not refusal.
6. **Voice FLO's prompt has drifted from text FLO's.** `flo-voice-ptt.tsx:41` defines `STUCK` as "Stop, Think, Understand, Choose, Know-how"; `server/flo-prompt.ts:21` defines `STUC` as "Stuck/split attention, Tentative/tight, Underreact/overreact, Confusion/mistakes" — **a completely different framework under a near-identical name**. Voice FLO also has no brain docs, no athlete profile and no assessment scores.

---

# H. The path to launch

Sequenced by dependency, not severity.

## Phase 1 — Today — stop the bleeding

| # | Action | Detail |
|---|---|---|
| 1 | **Rotate the exposed Gemini key** | Google Cloud, immediately. In public git history, fronting an unmetered public endpoint. Nothing else is time-sensitive in the same way. |
| 2 | **Fix the endorser photo mapping** | Nine lines in `landing.tsx:301-309`. Real named people are misrepresented on the live homepage; all correct files are already in `client/public/endorsers/`. |
| 3 | **Remove every fabricated metric** | Delete the `Math.random()` progress figures and the hardcoded "+12%" / "+15%" claims (C2). Show real data or an empty state. |
| 4 | **Close the four free-access routes** | Allowlist the fields `PATCH /api/users/:id` accepts; delete `upgrade-tier`; force `tier: 'free'` in `registerUser` and stop the signup form sending it; derive Stripe amounts server-side from `TIER_PRICING`. |
| 5 | **Add a production guard to `db:push`** | Before anything else touches the database. Then `drizzle-kit generate` the ten orphan tables plus `sessions` into a real migration so the curriculum is protected by schema, not by luck. |

## Phase 2 — This week — make it transact and deliver

| # | Action | Detail |
|---|---|---|
| 6 | **Make payment the only thing that grants a tier** | Mount `express.raw()` on the webhook path before `express.json()`; add `STRIPE_WEBHOOK_SECRET` to required env; handle `payment_intent.succeeded`; write `userId` into metadata; make the webhook the sole writer of `subscriptionTier`. Then test a real card end to end. |
| 7 | **Build the course delivery layer** | Largest piece of genuine missing work. Schema for courses/modules/lessons/progress, tier-gated API routes, a lesson page, progress tracking. Content is already written — this is what customers are buying. |
| 8 | **Seed techniques and scenarios into the database** | Seed data exists inside the dead `MemStorage` class. Move it to a proper seed script and run it, or those two paid pages stay empty. |
| 9 | **Find out why Gemini is failing, and stop hiding failures** | Log the actual error; return a distinguishable state instead of an in-character fallback; add an error-rate metric. Then wire `athleteContext` into `buildFloPrompt` and give the KB real retrieval instead of an unordered `slice(0, 8000)`. |
| 10 | **Add `/login`, `/signup` and password reset as real routes** | Register `/checkout` in the authenticated table. Add the `flo` tier to `permissions.ts` and the nav. Route every price through `TIER_PRICING`, including the legal pages. |
| 11 | **Rate-limit and meter the AI endpoints** | Server-side session counter for the anonymous preview instead of a client integer; `express-rate-limit` on auth and chat; a cap on `conversationHistory` size; VAPI call logging so voice spend is visible before the invoice. |
| 12 | **Give FLO real safety rails** | Locale-aware crisis resources in the prompt; server-side detection acting on `urgencyLevel`; rails in the fallback path; reconcile the voice prompt with `flo-prompt.ts`. |

## Phase 3 — Before scale — make it survivable

| # | Action | Detail |
|---|---|---|
| 13 | **Get `npm run check` to zero** | Delete the 11 dead chat components first (free reduction), add the missing `storage.ts` imports (34 more), then type the query hooks. Two clusters are real null-dereference bugs. |
| 14 | **Fix ownership checks and add CSRF** | Apply `requireOwnUserOrAdmin` to `/api/chat` and the other unguarded routes; regenerate sessions on login; add `helmet`; move to `sameSite: 'lax'`; allowlist `sortCol`; stop logging request bodies and headers. |
| 15 | **Add foreign keys, indexes and real observability** | Indexes on `users.email`, every `user_id`, `sessions.expire`. Make the health check fail when the database does. Add SIGTERM handling and an `unhandledRejection` handler. Add error tracking — a Gemini outage is currently invisible. |
| 16 | **Consolidate to one chat component and one design language** | Four live implementations is why the product behaves differently in four places. Then unify the marketing and app shells, and replace the purple/indigo tier ramp with the Red2Blue system that already exists in `console-theme.ts`. |
| 17 | **Decide the sport story** | You market seven sports and ship golf, including a mandatory golf handicap field at signup and golf-only knowledge. Either make signup and copy sport-aware, or narrow the marketing until the content catches up. |
| 18 | **Fix the build and asset weight** | `manualChunks` + `React.lazy` on `App.tsx`'s 36 page imports; add `compression`; add `express.static` cache headers; convert the 1.5MB and 1.3MB hero PNGs to WebP; fix the `pdfParse` import. |

---

*Audit performed against production (cerosity.com, commit `56c323f`), production Supabase (`zyamllnmpdmnzglbbdff`), and the `origin/main` source tree. Findings verified by live request, direct database query, or source citation. Nothing was modified.*
