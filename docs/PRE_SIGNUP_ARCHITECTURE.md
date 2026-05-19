# Pre-Signup Architecture

How unauthenticated visitors interact with Cerosity before creating an account.

## Flow

```
Landing Page (landing.tsx)
  ├── Hero: FLO cutout + FloChat widget
  ├── FloChat (flo-chat.tsx)
  │     ├── 3 sport prompt chips (nervous, world #1, rain)
  │     ├── Text input → Enter sends text via /api/landing-chat
  │     ├── FloVoicePTT (mic button, type="button", VAPI PTT)
  │     ├── After 6 user messages → signup CTA button
  │     └── Visitor info parsed (name, sport, email) → sessionStorage
  ├── Pricing section (#pricing-section)
  │     └── 4 tiers: Free / FLO ($30/mo) / Elite ($590) / Master ($2290)
  └── Sign-in form (Google SSO placeholder + email/password)
```

## Checkout Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/checkout?tier=X` | `CheckoutFinal` | Primary — Stripe Elements, dark theme |
| `/checkout-simple?tier=X` | `CheckoutSimple` | Fallback — simpler Stripe Elements |
| `/checkout-hosted?tier=X` | `CheckoutHosted` | Stripe hosted checkout redirect |
| `/signup-after-payment?tier=X` | `SignupAfterPayment` | Post-payment account creation |
| `/payment-redirect?url=X` | `PaymentRedirect` | Intermediate redirect to Stripe |

All checkout pages: dark Cerosity theme, prices from `shared/entitlements.ts`, FloAvatar logo.

## Key Components

### FloChat (`client/src/components/flo-chat.tsx`)
- Pre-signup chat widget on landing page
- 3 sport-context prompt chips (replaced R2B methodology tools)
- `onSignupRequest` prop for parent to handle CTA clicks
- Fallback deduplication: won't repeat identical error message
- Visitor parsing: extracts name/sport/email from messages → `sessionStorage("cerosity_visitor")`

### FloVoicePTT (`client/src/components/flo-voice-ptt.tsx`)
- VAPI push-to-talk voice component
- All buttons have `type="button"` to prevent form submission on Enter
- Graceful fallback when `VITE_VAPI_PUBLIC_KEY` is missing (disabled mic icon + tooltip)
- Compact mode (in-chat) and full mode (standalone)

## Pricing Source of Truth

`shared/entitlements.ts` → `TIER_PRICING` record. All checkout pages import from here.
Server routes also reference these for Stripe metadata.

Never hardcode prices in UI components.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_STRIPE_PUBLIC_KEY` | Yes | Stripe publishable key for Elements |
| `VITE_VAPI_PUBLIC_KEY` | No | VAPI voice — UI degrades gracefully without it |
| `STRIPE_SECRET_KEY` | Yes | Server-side Stripe API |

## Theme

All pre-auth surfaces use dark Cerosity theme:
- Background: `bg-slate-950`
- Cards: `bg-slate-900 border-slate-800`
- Text: `text-white` / `text-slate-400`
- No `blue-50`, `from-white`, `text-gray-900`, `Brain` icon, or "Red2Blue" header on pre-auth pages
