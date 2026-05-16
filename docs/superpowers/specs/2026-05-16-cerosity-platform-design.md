# Cerosity Platform Design Spec

**Date:** 2026-05-16
**Status:** Approved (brainstorming complete)
**Author:** Mark Thompson + Claude

---

## 1. Product Overview

Cerosity is a premium mental performance coaching platform for athletes, built on the Red2Blue (R2B) methodology by Gazing Performance. The platform's differentiator is FLO — an AI coaching agent that delivers personalized mental performance coaching via text and voice.

**Launch vertical:** Golf. Architecture supports any sport discipline.

**Core proposition:** "Your mind is your edge. Train it."

---

## 2. Pricing & Certification Tiers

All tier names, prices, features, and limits are config-driven via `shared/entitlements.ts`. Never hardcoded.

### 2.1 Free Tier ($0)

- Account creation (lead capture: email, name, sport discipline, optional phone/DOB/gender)
- Basic mental performance assessment
- 3 limited FLO chats (basic mindset info, no coaching depth)
- Sample content: "Master Your Moment" PDF, "Ability to Focus" PDF, "Mental Toughness" PDF
- Purpose: lead generation funnel

### 2.2 Premium Certification ($590 one-time)

- Everything in Free
- Complete R2B methodology (digital materials)
- All assessment tools
- Personalized training plans
- Advanced analytics
- Priority support
- **Certification is lifetime — never expires**
- **Does NOT include FLO subscription** (sold separately)

### 2.3 Ultimate Certification ($2,290 standard / $1,999 special offer)

- Everything in Premium
- 4x 1-on-1 human coaching sessions
- Advanced coach matching
- Custom training programs
- VIP support channel
- **Certification is lifetime — never expires**
- **Does NOT include FLO subscription** (sold separately)
- Display: crossed-out $2,290 with $1,999 promo price

### 2.4 FLO Subscription (separate, ongoing)

- $20/month or $200/year (auto-renewal)
- Unlimited AI coaching (text + voice)
- Sport-specific intelligence
- Available to any certified user (Premium or Ultimate)
- **Positioning:** "Always have FLO in your pocket. Your personal mental performance coach — on the course, in the car, before competition."
- Not available to Free tier users (FLO subscription requires certification)

### 2.5 Pricing Page Messaging

- Certification cards: "One-time payment, lifetime certification"
- FLO card: separate section or add-on, "Keep FLO in your pocket — $20/mo or $200/yr"
- No "lifetime access" language on FLO — it's a subscription service
- Free tier: "Get Started Free" (no billing language)

---

## 3. Revenue Model & Splits

### 3.1 Revenue per sale

| Event | Cerosity keeps | Gazing royalty | Coach payout |
|---|---|---|---|
| Premium ($590) | $501-$531 | $59-$89 (10-15%) | $0 |
| Ultimate ($1,999 promo) | $590 | $0 | $1,409 |
| Ultimate ($2,290 standard) | $881 | $0 | $1,409 |
| FLO subscription ($20/mo) | $20 | $0 | $0 |
| FLO subscription ($200/yr) | $200 | $0 | $0 |

### 3.2 Gazing royalty rules

- Applies ONLY to Premium tier
- 10-15% of $590 (discretionary, configurable in HQ)
- Settlement: monthly or quarterly (configurable)
- No royalty on Ultimate — coach gets the delta, Cerosity keeps $590

### 3.3 Coach payouts

- Per Ultimate delivery: $1,409 ($1,999) or variable ($2,290)
- Tracked per session delivery in HQ
- Multiple coaches supported (coach matching)

### 3.4 Affiliate / Introducer system

- Unique referral codes per introducer
- Configurable fee structure PER CODE, PER TIER
- Default: $50 one-off finder's fee per paid signup
- Example: certified golfer refers friend, friend buys Premium, golfer gets $50
- Tracked in HQ: who referred whom, conversion date, payout status
- Codes can be deactivated, have expiry dates, or usage caps

---

## 4. FLO AI Coach

### 4.1 Personality

- High emotional intelligence, personable, easy-going
- Uses humor appropriately — not robotic
- Sport-specific analogies and language
- Speaks like a trusted coach, not a textbook
- Adjusts tone to athlete's emotional state
- Goal: feel like talking to a real human coach

### 4.2 Knowledge Architecture (Hybrid)

**Layer 1 — Universal (all athletes):**
- Red2Blue methodology fundamentals
- Mental performance principles
- Emotional regulation frameworks
- Pre-performance routines
- Recovery and reflection patterns

**Layer 2 — Sport-specific prompts (managed in HQ):**
- Per-discipline structured prompts authored by Andrew/coaches
- Golf-specific: pre-shot routines, course management psychology, pressure putts, first tee nerves, bounce-back from bad holes
- Terminology, scenarios, and pressure situations per sport
- Editable in HQ without code changes

**Layer 3 — Supplementary documents (RAG pipeline):**
- Upload PDFs, articles, drill sheets per sport discipline
- RAG-indexed, FLO references during coaching
- Gazing R2B materials live here
- HQ interface for upload, review, delete per discipline

FLO selects layers based on athlete's registered sport discipline.

### 4.3 Access Gating

| User state | FLO behavior |
|---|---|
| No login (landing page) | 3 chats. Basic mindset info. Progressive capture (name > sport > email). No coaching depth. |
| Registered (Free) | Talks about R2B importance, shows sample content value, soft-pitches certification. No real coaching. |
| Certified (no FLO sub) | Certification complete but FLO subscription not active or expired. Prompts to subscribe. |
| FLO subscriber | Full coaching mode. Unlimited text + voice. Sport-specific intelligence. Personalized plans. |

### 4.4 Voice Coaching (VAPI Integration)

Same architecture as Tabby on Buddees:
- VAPI Web SDK for browser-based voice
- Mobile-first design — optimized for phone use
- FLO voice persona: warm, confident, coaching cadence
- Voice sessions logged with transcript
- Duration caps on free/demo voice (2 min like Buddees)
- Full subscribers: unlimited voice
- Use cases: pre-round mental prep, post-round debrief, in-car coaching, competition warm-up
- Voice gate on landing page: name + email capture before voice demo (same as Buddees pattern)

### 4.5 AI Models

- Primary: Google Gemini (env var `GEMINI_MODEL`)
- Fallback: OpenAI (env var `OPENAI_MODEL`)
- Model selection is config-driven, never hardcoded

---

## 5. Landing Page Design

### 5.1 Design Language

- Apple-clean, premium feel
- Dark theme primary (like Buddees), light sections for contrast
- Inter font family
- Glassmorphism for cards and nav
- Subtle gradient accents (brand colors: red #E63946, blue #1D7FBF)
- Framer Motion animations: fade-in-up on scroll, smooth transitions
- Mobile-first responsive

### 5.2 Section Flow (FLO-First Funnel)

1. **Nav** — Glass morphism sticky nav. Logo, links (Meet FLO, How It Works, Pricing, Resources), CTA button
2. **Hero** — Status badge ("Now open for athletes") > Bold headline ("Your mind is your edge.") > Subtext > Dual CTA (primary: "Talk to FLO" > chat widget, secondary: "View Programs" > pricing) > Stats row
3. **FLO Chat Widget** — Embedded interactive demo right on landing page. 3 free messages. Progressive capture in-chat (mirrors Buddees Interview Lab pattern)
4. **Problem/Story** — "You don't lose because of skill. You lose because of your mind." Before/after framing.
5. **Meet FLO** — Personality showcase. What FLO does. Sport-specific intelligence. Voice coaching teaser.
6. **How It Works** — 3 steps: Talk to FLO > Get Certified > Perform
7. **Sample Content** — Free PDF previews. "Master Your Moment", "Ability to Focus", "Mental Toughness"
8. **Pricing** — 3 certification cards (Free / Premium / Ultimate) + separate FLO subscription card
9. **Social Proof** — Testimonials, athlete photos, sport discipline logos
10. **Footer** — Email capture, contact, legal links

### 5.3 CTA Strategy (Buddees Pattern Adapted)

**In-chat progressive capture (FLO widget on landing page):**
- Message 1: User asks question, FLO responds with value
- After message 1: Name + sport hook ("Before we go further — what sport do you play and what should I call you?")
- After message 3: Soft pitch ("Now that you've seen how I work — imagine having me in your pocket before every round. Check out the certification programs below.")
- After message 5: Email capture ("I'd love to keep helping. Drop your email and I'll send you some free resources to get started.")

**Page CTAs:**
- Hero: "Talk to FLO" (scrolls to chat widget)
- Pricing cards: "Get Started Free" / "Get Premium Access" / "Get Ultimate Access"
- FLO subscription: "Keep FLO in Your Pocket"
- Footer: Email capture form

---

## 6. HQ Console Additions

### 6.1 Finance Module (new)

**Payee Management:**
- Payee profiles: name, type (coach / licensor / affiliate), payment details, status
- Per-payee commission rules (%, fixed amount, per-tier)
- Gazing: royalty % on Premium only, configurable 10-15%
- Coaches: per-delivery payout amount
- Affiliates: configurable per code per tier

**Affiliate Code Management:**
- Generate unique referral codes
- Assign to payee profile
- Configure: fee amount per tier, expiry date, usage cap, active/inactive
- Track: conversions, total payouts, conversion rate

**Accrual Ledger:**
- Every sale generates ledger entries for relevant payees
- Columns: date, sale type, customer, payee, amount owed, status (accrued / paid)
- Settlement marking: batch-mark as paid with date

**Settlement Reports:**
- Filter by payee, date range, type
- Monthly/quarterly aggregation
- CSV export for accounting

### 6.2 FLO Knowledge Management (new)

**Sport Discipline Management:**
- CRUD sport disciplines (golf, tennis, cricket, etc.)
- Per-discipline status: active / coming soon

**Layer 2 — Prompt Management:**
- Per-discipline structured prompts
- Editable rich text fields: scenarios, terminology, pressure situations
- Version history (who changed what, when)
- Preview: test prompt against FLO before publishing

**Layer 3 — Document Upload:**
- Upload interface per discipline
- Supported: PDF, DOCX, TXT
- RAG indexing status indicator
- Delete/replace documents
- Tag documents (e.g., "Gazing material", "coach-authored", "drill")

### 6.3 FLO Analytics (new)

- Chat volume: total conversations, messages per day
- Voice usage: calls, duration, VAPI cost tracking
- Conversion funnel: landing page chats > signups > certifications
- Per-sport-discipline breakdown
- Lead capture metrics: names captured, emails captured, conversion %

### 6.4 Subscription Management (enhanced)

- View all FLO subscribers
- Renewal status: active, cancelled, expired, past-due
- Manual override: extend, pause, cancel
- Churn metrics

---

## 7. Technical Architecture

### 7.1 New Database Tables Needed

- `affiliate_codes` — code, payee_id, fee_config (JSONB), expiry, usage_cap, active
- `affiliate_conversions` — code_id, customer_id, sale_id, amount, status, created_at
- `payees` — id, name, type (coach/licensor/affiliate), payment_details (JSONB), active
- `payee_ledger` — id, payee_id, sale_id, amount, status (accrued/paid), settled_at
- `sport_disciplines` — id, name, slug, status, created_at
- `flo_prompts` — id, discipline_id, prompt_type, content, version, updated_by, updated_at
- `flo_documents` — id, discipline_id, filename, storage_path, tags, rag_status, uploaded_by, uploaded_at
- `flo_conversations` — id, user_id, discipline_id, channel (text/voice), started_at, message_count
- `flo_messages` — id, conversation_id, role, content, created_at
- `flo_voice_calls` — id, conversation_id, user_id, duration_sec, vapi_call_id, transcript, cost_est, created_at

### 7.2 Stripe Integration

- Premium certification: one-time payment ($590)
- Ultimate certification: one-time payment ($1,999 or $2,290)
- FLO subscription: recurring ($20/mo or $200/yr)
- Webhook handling: payment_intent.succeeded, invoice.paid, customer.subscription.updated/deleted
- Promo codes via Stripe Coupons (Ultimate $2,290 > $1,999)

### 7.3 VAPI Integration

- VAPI Web SDK loaded on mobile-optimized FLO chat interface
- Voice persona configuration stored server-side
- Call logging: start/end, duration, transcript capture
- Cost tracking per call (VAPI per-minute pricing)
- 2-minute demo cap for unauthenticated/free users
- Unlimited for FLO subscribers

### 7.4 RAG Pipeline (Layer 3)

- Document upload > server-side text extraction (PDF/DOCX > plain text)
- Chunking + embedding (Gemini embeddings or OpenAI ada-002)
- Vector storage (pgvector extension on Supabase)
- FLO queries: retrieve relevant chunks per discipline + conversation context
- HQ shows indexing status per document

---

## 8. Mobile-First FLO Experience

FLO voice coaching is the premium mobile experience:

- Full-screen chat interface optimized for mobile
- Voice button prominent — "Talk to FLO" microphone icon
- Push notification support (future): "Pre-round check-in with FLO"
- Offline-friendly: cached conversation history
- Quick-access from home screen (PWA / Add to Home Screen)
- Voice works hands-free: start talking, FLO listens and responds
- Natural conversation flow — not menu-driven

---

## 9. Content Gating Summary

| Content | Free | Certified | FLO Sub |
|---|---|---|---|
| Sample PDFs (3) | Yes | Yes | Yes |
| Basic assessment | Yes | Yes | Yes |
| Full R2B materials | No | Yes | Yes |
| All assessments | No | Yes | Yes |
| Training plans | No | Yes | Yes |
| Advanced analytics | No | Yes | Yes |
| FLO text coaching | 3 msgs | No (must subscribe) | Unlimited |
| FLO voice coaching | 2 min demo | No (must subscribe) | Unlimited |
| Human coaching | No | No (Ultimate only) | No (Ultimate only) |

Note: Certified users without FLO subscription see certification materials but cannot use FLO coaching. They get prompted to subscribe.

---

## 10. Implementation Priority

**Phase 1 — Foundation:**
1. Landing page (FLO-first funnel, Apple-clean design)
2. FLO chat engine (text, 3-tier knowledge, gating)
3. Stripe checkout (certification tiers)
4. Updated pricing page

**Phase 2 — Voice & Mobile:**
5. VAPI integration for FLO voice
6. Mobile-optimized FLO interface
7. FLO subscription (Stripe recurring)

**Phase 3 — HQ & Revenue:**
8. Finance module (payees, ledger, settlements)
9. Affiliate system (codes, tracking, payouts)
10. FLO knowledge management (prompts + document upload)

**Phase 4 — Intelligence:**
11. RAG pipeline (document indexing, vector search)
12. FLO analytics dashboard
13. Sport discipline expansion beyond golf

---

## 11. Config-Driven Requirements

Per CLAUDE.md hard rules, these MUST be in `shared/entitlements.ts` or equivalent config:

- Tier names, prices, features per tier
- FLO message limits per tier
- FLO voice duration limits per tier
- Gazing royalty percentages
- Default affiliate fee amounts
- VAPI demo duration cap
- AI model references
- Sport discipline list
- Content access matrix

No `if (tier === 'premium')` scattered across files. All gating reads from config.
