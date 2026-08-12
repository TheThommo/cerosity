# FLO Voice Sync (VAPI custom-LLM)

How FLO voice is wired so that VAPI is transport only and Cerosity is the brain. Pair this with
`docs/FLO_INTELLIGENCE.md`.

## The shape of it

```
Caller mic
  -> VAPI (Deepgram STT)
  -> VAPI assistant (provider: custom-llm,
       url: https://cerosity.com/api/vapi/chat/completions)   <-- FULL path
  -> POST https://cerosity.com/api/vapi/chat/completions      (Cerosity bridge)
       buildFloPrompt({ forVoice: true, sport }) + getCoachingResponse() [Gemini]
  -> reply text
  -> VAPI (TTS: dashboard voice, e.g. Clara/vapi)
  -> Caller speaker
```

VAPI never runs a coaching LLM. It calls Cerosity for every turn, OpenAI Chat Completions style.

### Confirmed working config (validated 2026-05-30)

`model.url` MUST be the FULL path, not the base. VAPI calls the URL as-is and does
NOT append `/chat/completions`:

| Field | Value |
|-------|-------|
| `model.provider` | `custom-llm` |
| `model.url` | `https://cerosity.com/api/vapi/chat/completions` (full path) |
| `model.model` | `cerosity-flo` |
| `model.messages[0]` | delivery-only system message ("voice the server reply verbatim") |
| voice / firstMessage | left on the dashboard value (e.g. Clara/vapi) — reconcile does NOT touch them |

The boot reconcile sends a **model-only** PATCH. It deliberately omits voice,
transcriber, firstMessage and server so it cannot overwrite the working dashboard
voice. (Overwriting voice with ElevenLabs is what made the first boot reconcile PATCH
get rejected, leaving the assistant on GPT-4.1 until the manual fix.)

## Pieces

| Piece | File | Notes |
|-------|------|-------|
| Voice prompt mode | `server/flo-prompt.ts` | `forVoice: true` adds spoken rules, returns plain text (no JSON) |
| Custom-LLM bridge | `server/flo-routes.ts` | `POST /api/vapi/chat/completions`, OpenAI compatible, SSE streaming |
| Route registration | `server/index.ts` | `registerFloVoiceRoutes(app)` before the error handler / static fallback |
| Assistant config | `server/vapi.ts` | `buildFloVapiAssistantConfig()` -> provider `custom-llm`, no system prompt |
| Live enforcement | `server/vapi.ts` | `reconcileFloVapiAssistant()` PATCHes the live assistant on prod boot |
| Client | `client/src/components/flo-voice-ptt.tsx` | Starts the call by assistant ID only. No inline config / prompt |

Prod assistant ID: `51d263eb-5724-4471-bc27-44341a90c038`

## Endpoints

- `POST /api/vapi/chat/completions` - the bridge VAPI calls. Public (VAPI is server to server).
  Optional bearer auth if `VAPI_CUSTOM_LLM_SECRET` is set.
- `POST /api/hq/vapi/reconcile` (admin) - force the live assistant onto the Cerosity custom-LLM
  config now. Returns `{ ok, detail?, url, at }`. On failure, `detail` carries the FULL VAPI
  response body so you can see exactly why the PATCH was rejected.
- `GET /api/hq/vapi/reconcile-status` (admin) - the cached result of the last reconcile (boot or
  manual). Use this to confirm the boot reconcile succeeded without tailing Railway logs.
- `GET /api/hq/vapi/assistant` (admin) - read the live assistant's model provider/url to confirm
  it is `custom-llm` pointing at the full `/api/vapi/chat/completions` URL, not GPT.

## Env

| Var | Purpose |
|-----|---------|
| `VAPI_API_KEY` | Server-side, private. Used to PATCH the assistant. Never prefix with VITE_ |
| `VITE_VAPI_PUBLIC_KEY` | Client VAPI init (public, safe) |
| `VITE_VAPI_ASSISTANT_ID` | Assistant ID the client starts |
| `PUBLIC_BASE_URL` | Base for the custom-LLM url + webhook (defaults to https://cerosity.com) |
| `VAPI_CUSTOM_LLM_SECRET` | Optional. If set, the bridge requires `Authorization: Bearer <secret>` |

## Deploy + verify

1. Push to main. Railway deploys. On boot, `reconcileFloVapiAssistant()` PATCHes the live
   assistant to `custom-llm` automatically (no dashboard editing).
2. Confirm the live assistant is on the Cerosity brain:
   ```bash
   # admin session cookie required
   curl -s https://cerosity.com/api/hq/vapi/assistant
   # expect: modelProvider "custom-llm", modelUrl "https://cerosity.com/api/vapi"
   ```
   Or re-run the reconcile explicitly:
   ```bash
   curl -s -X POST https://cerosity.com/api/hq/vapi/reconcile
   # expect: {"ok":true}
   ```
3. Smoke the bridge directly (OpenAI-shape request):
   ```bash
   curl -s -X POST https://cerosity.com/api/vapi/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"stream":false,"messages":[{"role":"user","content":"I am nervous before my match"}]}'
   # expect: a short spoken Red2Blue coaching reply in choices[0].message.content
   ```
4. Mic test: open the site, tap the FLO voice button, speak. FLO should answer in the Red2Blue
   voice with short spoken replies. Transcripts land in `voice_call_transcripts`.

## If the reconcile fails on boot

The PATCH is wrapped in try/catch and logs `[VAPI] Assistant reconcile failed: ...` without
crashing the server. Most likely causes: `VAPI_API_KEY` missing, or a schema field VAPI rejects.
Read the log line, fix `buildFloVapiAssistantConfig()`, redeploy, or hit `/api/hq/vapi/reconcile`
to retry and see the error body.
