# DEPLOY_SYNC — Production Verification Report

## 2026-05-30 (later) — boot reconcile fix + bridge confirmed PASS

**Context**: `56c323f` shipped and is live (prod health shows `56c323f`,
`geminiConfigured: true`, `vapiConfigured: true`). The custom-LLM bridge works in prod.

**Bridge verification — PASS:**
```bash
curl -s -X POST https://cerosity.com/api/vapi/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"stream":false,"messages":[{"role":"user","content":"I am nervous before my match"}]}'
# -> returns Red2Blue coaching from Cerosity (Gemini). Correct.
```

**Issue found**: the boot `reconcileFloVapiAssistant()` did NOT update the live assistant
(stayed GPT-4.1 until Mark PATCHed it manually). Railway HAD `VAPI_API_KEY` set — the failure
was payload/schema, not a missing key. Two causes:
1. `model.url` was the base `/api/vapi` instead of the full `/api/vapi/chat/completions`.
2. The reconcile payload overwrote the working dashboard voice (Clara/vapi) with ElevenLabs,
   which VAPI rejected.

**Manual fix (Mark, 2026-05-30)**: PATCHed assistant `51d263eb-5724-4471-bc27-44341a90c038` to
`custom-llm`, `model.url = https://cerosity.com/api/vapi/chat/completions` (full path),
`model.model = cerosity-flo`, delivery-only system message, Flow firstMessage, dashboard voice
kept. Confirmed working.

**Fix in this commit**:
- `buildFloVapiAssistantConfig()` now sends a MODEL-ONLY PATCH with the FULL custom-LLM URL and a
  delivery-only system message. It no longer sends voice/transcriber/firstMessage/server, so it
  cannot overwrite the working Clara voice.
- `updateVapiAssistant()` throws/logs the FULL VAPI response body on non-2xx (key never logged).
- `reconcileFloVapiAssistant()` returns `{ ok, detail, url, at }` and caches the last result.
- New `GET /api/hq/vapi/reconcile-status` (admin) returns the cached boot result.

**Status**: bridge = PASS. Boot reconcile = fixed (to be confirmed on next deploy via the log
line `[VAPI] FLO assistant reconciled` and `GET /api/hq/vapi/reconcile-status`). Voice mic test
= Mark to confirm on the live site.

**Note**: `VAPI_API_KEY` is being rotated after an accidental exposure. Code never logs the key.

---

## 2026-05-30 — FLO single-brain (voice on custom-LLM)

**Change**: Voice (VAPI) moved off its hosted LLM + inline dashboard prompt onto the Cerosity
custom-LLM bridge. FLO now has one brain in every channel. See `docs/FLO_INTELLIGENCE.md` and
`docs/FLO_VOICE_SYNC.md`.

**Files changed this pass**

| File | Change |
|------|--------|
| `server/flo-prompt.ts` | Added `forVoice` mode: spoken rules, plain-text (no JSON) output |
| `server/flo-routes.ts` | NEW. `POST /api/vapi/chat/completions` custom-LLM bridge + admin reconcile/verify routes |
| `server/vapi.ts` | `buildFloVapiAssistantConfig` -> `custom-llm`; removed inline voice prompt + tool defs; added `reconcileFloVapiAssistant()` |
| `server/index.ts` | Register FLO voice routes; reconcile live assistant on prod boot |
| `client/src/components/flo-voice-ptt.tsx` | Removed inline `FLO_ASSISTANT_CONFIG` (gpt-4o + prompt); start by assistant ID only |
| `docs/FLO_INTELLIGENCE.md`, `docs/FLO_VOICE_SYNC.md` | NEW architecture + voice wiring docs |

**Live assistant update**: programmatic, not dashboard. `reconcileFloVapiAssistant()` PATCHes
assistant `51d263eb-5724-4471-bc27-44341a90c038` to `custom-llm` on every prod boot. Verify with
`GET /api/hq/vapi/assistant` (expect `modelProvider: custom-llm`) or `POST /api/hq/vapi/reconcile`.

**Prod verification (run after Railway deploy):**
```bash
# 1. Live assistant is on the Cerosity brain (admin session)
curl -s https://cerosity.com/api/hq/vapi/assistant
# 2. Bridge answers in FLO's voice
curl -s -X POST https://cerosity.com/api/vapi/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"stream":false,"messages":[{"role":"user","content":"I am nervous before my match"}]}'
# 3. Mic test on the live site (FLO voice button) — short spoken Red2Blue replies
```

**Typecheck**: `npm run check` carries ~162 pre-existing strict errors (build ships via esbuild,
per repo norms). This pass added zero new errors.

---

## 2026-05-22 (prior pass)

**Date**: 2026-05-22
**Commit**: `e7c5620` (pushed to main, Railway auto-deploy)
**Railway health commit**: `unknown` (expected — Docker runtime has no git)

---

## Phase Results

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Git aligned on main | PASS |
| 1 | FLO hero hip artifact cleaned (7747px) | PASS |
| 2 | Landing chat Gemini fallbacks + /api/health + /api/public-config | PASS |
| 3 | VAPI runtime config fallback + Dockerfile ARG | PASS |
| 4 | Trusted logos | BLOCKED — need standalone assets |
| 5 | Footer scroll to top | DONE (prior session) |
| 6 | Checkout dark theme guard | DONE (prior session) |
| 7 | Build + push | PASS |
| 8 | Prod verification | PASS |

---

## Prod Verification Curls

### /api/health
```bash
curl -s https://cerosity.com/api/health
```
```json
{"status":"ok","commit":"unknown","geminiConfigured":true,"vapiConfigured":true}
```
- geminiConfigured: true
- vapiConfigured: true

### /api/public-config
```bash
curl -s https://cerosity.com/api/public-config
```
- vapiPublicKey: present, non-empty
- vapiAssistantId: present, non-empty

### Landing Chat — 3 prompts, 3 distinct responses
```bash
curl -s -X POST https://cerosity.com/api/landing-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I am nervous","messageCount":1}'

curl -s -X POST https://cerosity.com/api/landing-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I am playing against world number 1","messageCount":2}'

curl -s -X POST https://cerosity.com/api/landing-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What if it rains","messageCount":3}'
```
All three: distinct Red2Blue coaching content. No generic fallback.

---

## Mark Action Items

1. **Phase 4 — Trusted logos**: Supply standalone PNG/SVG logo files. PDF extraction not viable.
2. **VAPI mic**: Runtime config fallback now in place. If mic still flashes yellow, check VAPI dashboard for assistant status + Deepgram/ElevenLabs quota.
3. **Health commit "unknown"**: Expected in Docker. To fix: use RAILWAY_GIT_COMMIT_SHA env var instead of git rev-parse.

---

## Files Changed This Pass

| File | Change |
|------|--------|
| `server/gemini.ts` | +3 fallback patterns (opponent, weather, confidence), replaced generic default |
| `server/routes.ts` | +/api/health, +/api/public-config endpoints |
| `client/src/components/flo-voice-ptt.tsx` | Runtime /api/public-config fetch when VITE_* empty |
| `Dockerfile` | +VITE_VAPI_ASSISTANT_ID ARG/ENV |
| `client/public/flo/flo-hero.png` | Hip artifact cleaned (7747 pixels erased) |
