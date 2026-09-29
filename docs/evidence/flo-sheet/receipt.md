# Slice 3 — one FLO surface on the phone — receipt

- **PR:** [TheThommo/cerosity#17](https://github.com/TheThommo/cerosity/pull/17), merged → `main` at **`27acc84`**
- **Production SHA verified:** `27acc84` via `https://www.cerosity.com/api/health`
- **Done-when:** athlete pages (not landing, not HQ) show a bottom bar: Curriculum, Ask FLO, Check-in. Ask FLO and the existing bubble open the SAME sheet hosting the chat component the bubble already mounts. No seventh chat component. Duplicate chat mounts on those pages are not mounted.

## What shipped

| Piece | Where |
|---|---|
| `FloSheetProvider` / `useFloSheet` — one open state for the FLO panel; the bubble and Ask FLO both drive it. The panel still hosts `StableChat` (plus `FloVoicePTT`, as `/flo` does). Closes itself on `/flo`. | `client/src/components/floating-chat.tsx`, `client/src/App.tsx` |
| Mobile bottom bar: exactly **Curriculum** (→ `/learn`), **Ask FLO** (opens the panel, no route change; inert on `/flo`, where the chat is the page), **Check-in** (opens `CheckInSheet`) | `client/src/components/navigation.tsx` |
| Removed duplicate chat mounts: inline `StableChat` + voice on home; the free dashboard's private modal hosting `LandingChatStableV2` + voice; an unused `BulletproofAIChat` import on dashboard. Their buttons now open the shared panel. | `client/src/pages/home.tsx`, `free-dashboard.tsx`, `dashboard.tsx` |
| Bubble default/clamped position keeps 72px clear of the bottom bar on phones | `floating-chat.tsx` |

The navigation (and so the bar) only renders in the signed-in tree; the landing page and the HQ console host never reach it.

**No new chat component.** The only chat composers now reachable on athlete pages are the shared panel's `StableChat` and `/flo`'s own `StableChat` page.

### Orphaned by this slice — left in place, not deleted

- `client/src/components/bulletproof-ai-chat.tsx` — no importers
- `client/src/components/landing-chat-stable-v2.tsx` — no importers
- `data-chat-button` attribute in `client/src/components/stable-chat.tsx` — its only consumer was removed

Pre-existing bug found and noted, not fixed: the home page's "Ask Flo About" suggestion buttons set `.value` on the React-controlled chat input, which never enabled the Send button — they could not send. They now open the panel.

## Verification commands

| Command | Result |
|---|---|
| `npm test` | 60 / 60 (includes slice-4 tests written ahead; no client test harness exists) |
| `npm run check` | 150 errors, (file, code) multiset delta 0 |
| `npm run build` | OK |
| code-quality-reviewer | **APPROVE**; both MEDIUM items (one open path instead of a timer + global DOM query on home; an honest name for the inset helper) fixed before merge |

## Smoke

### Local at 390 × 844 — real dev server, scratch Postgres, throwaway local user

| Step | Result | Screenshot |
|---|---|---|
| Home | Bottom bar shows Curriculum / Ask FLO / Check-in; bubble sits above the bar (bubble bottom 760px, bar top 783px) | `1-bottom-bar-390.jpg` |
| Tap Ask FLO | Panel opens; path stays `/`; `history.length` unchanged (1 → 1); bubble reports `aria-expanded=true` | `2-ask-flo-open-390.jpg` |
| Chat composers on home | 0 before, exactly 1 with the panel open | — |
| Close ✕, then tap the bubble | Same panel opens; Ask FLO reports `aria-expanded=true` | `3-bubble-open-same-panel-390.jpg` |
| Tap Check-in | FLO panel closes; "How are you right now?" sheet opens, pre-filled from the last entry | `4-check-in-from-bar-390.jpg` |
| Tap Curriculum | Navigates to `/learn` | — |
| Sweep `/`, `/dashboard`, `/learn`, `/profile`, `/techniques`, `/tools`, `/goals`, `/help` | Bar on every page; 0 chat composers on each until the panel opens | — |
| `/flo` | Bar present, bubble hidden, 1 composer (the page itself) | — |
| Free tier (scratch DB) → "Start Chatting" | Shared panel opens; the old modal is gone; 1 composer | — |

### Production — `https://www.cerosity.com` on `27acc84`

| Check | Result |
|---|---|
| `/api/health` commit | `27acc84` |
| Shipped bundle contains "Ask FLO", "Close FLO chat", the `FloSheetProvider` guard message | 3, 1, 1 |
| Shipped bundle contains `LandingChatStableV2`'s placeholder "Ask about mental game challenges..." | **0** (was 1 in the `e15957c` bundle) — the second chat is no longer shipped |
| Bundle size | 1,491,058 → 1,482,109 bytes |
| `GET /` · `/learn` · `/flo` | 200 · 200 · 301 → `/flo/` (unchanged behaviour) |

**Not run on production: tapping through the bar while signed in at 390px.** Claude may not create accounts or sign in on a live site, and the in-app browser cannot open `cerosity.com`. Mark — on a phone, signed in: tap Ask FLO (panel opens, URL unchanged), close it, tap the bubble (same panel), tap Check-in (sheet), tap Curriculum (`/learn`).
