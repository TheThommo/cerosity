// FLO voice (VAPI) HTTP surface — kept separate from routes.ts so the
// single-brain voice work is self-contained and independently deployable.
//
// NON-NEGOTIABLE ARCHITECTURE: FLO has ONE brain — Cerosity.
// VAPI is voice transport only (Deepgram STT + ElevenLabs TTS). The VAPI
// assistant is configured with provider "custom-llm" pointing at the bridge
// below, so every spoken reply is produced by buildFloPrompt() + Gemini — the
// exact same brain as text chat. No hosted LLM (OpenAI/Anthropic) coaches FLO.

import type { Express, Request, Response } from "express";
import { buildFloPrompt } from "./flo-prompt";
import { getCoachingResponse } from "./gemini";
import { reconcileFloVapiAssistant, getVapiAssistant, getLastReconcileResult, FLO_VAPI_ASSISTANT_ID } from "./vapi";
import { requireAuth, requireAdmin, type AuthRequest } from "./auth";
import { buildAthleteMemoryPack, buildReturningAthleteDirective } from "./flo-athlete-context";
import { issueVoiceIdentityToken, verifyVoiceIdentityToken } from "./flo-voice-identity";

function contentToText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((p: any) => (typeof p === "string" ? p : p?.text || "")).join(" ").trim();
  }
  return "";
}

export function registerFloVoiceRoutes(app: Express) {
  // ── VAPI Custom-LLM Bridge ────────────────────────────────────────
  // OpenAI Chat Completions compatible. VAPI POSTs to {url}/chat/completions.
  app.post("/api/vapi/chat/completions", async (req: Request, res: Response) => {
    try {
      // Optional shared-secret auth (set VAPI_CUSTOM_LLM_SECRET to enforce).
      const requiredSecret = process.env.VAPI_CUSTOM_LLM_SECRET;
      if (requiredSecret) {
        const auth = req.headers.authorization || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (token !== requiredSecret) {
          return res.status(401).json({ error: { message: "Unauthorized" } });
        }
      }

      const body = req.body || {};
      const wantStream = body.stream !== false; // VAPI streams by default
      const rawMessages: any[] = Array.isArray(body.messages) ? body.messages : [];
      const convo = rawMessages.filter((m) => m?.role === "user" || m?.role === "assistant");

      // Latest user message + prior turns as history
      let latestUser = "";
      let splitIdx = convo.length;
      for (let i = convo.length - 1; i >= 0; i--) {
        if (convo[i].role === "user") {
          latestUser = contentToText(convo[i].content);
          splitIdx = i;
          break;
        }
      }
      const history = convo.slice(0, splitIdx).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: contentToText(m.content) }],
      }));

      const metadata =
        body?.call?.metadata ||
        body?.metadata ||
        body?.call?.assistantOverrides?.metadata ||
        {};

      // The athlete is whoever the signed token proves — never whoever the
      // payload claims. A missing or bad token means an anonymous call, which
      // still gets coached, just without anyone's history attached to it.
      const userId = verifyVoiceIdentityToken(metadata?.voiceToken);

      const memory = userId ? await buildAthleteMemoryPack(userId) : null;
      const sport = metadata?.sport || "general";

      const systemPrompt = await buildFloPrompt({
        forVoice: true,
        sport,
        athleteContext: memory?.context || undefined,
        openerDirective: memory ? buildReturningAthleteDirective(memory) || undefined : undefined,
      });

      // Identity and section headings only — never the athlete's own words.
      console.log(
        `[VAPI-LLM] turn user=${userId ?? "anonymous"} memory=${memory?.context ? "attached" : "none"}`
      );
      const coaching = await getCoachingResponse(latestUser || "", history, {
        sport,
        systemPromptOverride: systemPrompt,
      });
      const reply =
        (coaching?.message || "").trim() ||
        "Let's keep it simple. Take one slow breath, then tell me the one thing on your mind right now.";

      const id = `chatcmpl-flo-${Date.now()}`;
      const created = Math.floor(Date.now() / 1000);
      const model = "cerosity-flo";

      if (!wantStream) {
        return res.json({
          id,
          object: "chat.completion",
          created,
          model,
          choices: [
            { index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" },
          ],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        });
      }

      // Stream as OpenAI-compatible SSE chunks
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      const sendChunk = (delta: any, finish: string | null) => {
        res.write(
          `data: ${JSON.stringify({
            id,
            object: "chat.completion.chunk",
            created,
            model,
            choices: [{ index: 0, delta, finish_reason: finish }],
          })}\n\n`
        );
      };
      sendChunk({ role: "assistant", content: reply }, null);
      sendChunk({}, "stop");
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("[VAPI-LLM] Bridge error:", error?.message || error);
      if (!res.headersSent) {
        return res.status(200).json({
          id: `chatcmpl-flo-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: "cerosity-flo",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "I'm with you. Take a slow breath, and tell me what's going on right now.",
              },
              finish_reason: "stop",
            },
          ],
        });
      }
      try { res.end(); } catch { /* noop */ }
    }
  });

  // ── Voice identity ────────────────────────────────────────────────
  // Minted only for an athlete who is already signed in here. The client hands
  // it to VAPI as call metadata and the bridge above is its only consumer, so a
  // spoken session can be tied to a real person without the bridge ever having
  // to take the caller's word for who they are. Deliberately not logged.
  app.get("/api/flo/voice-token", requireAuth, (req: AuthRequest, res: Response) => {
    try {
      res.json(issueVoiceIdentityToken(req.user!.id));
    } catch {
      // Signing is unavailable. Voice still works — it just won't remember them.
      res.status(503).json({ message: "Voice identity unavailable" });
    }
  });

  // ── Admin: enforce + verify the live assistant uses the Cerosity brain ──
  app.post("/api/hq/vapi/reconcile", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
    const result = await reconcileFloVapiAssistant();
    res.status(result.ok ? 200 : 502).json(result);
  });

  // Last reconcile result cached from boot (or the most recent manual run).
  // Use this to confirm the boot reconcile succeeded without tailing Railway logs.
  app.get("/api/hq/vapi/reconcile-status", requireAuth, requireAdmin, (_req: Request, res: Response) => {
    res.json(getLastReconcileResult() ?? { ok: false, detail: "no_reconcile_run_yet" });
  });

  app.get("/api/hq/vapi/assistant", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
    try {
      const assistant = await getVapiAssistant(FLO_VAPI_ASSISTANT_ID);
      res.json({
        id: assistant?.id,
        name: assistant?.name,
        modelProvider: assistant?.model?.provider,
        modelUrl: assistant?.model?.url,
        model: assistant?.model?.model,
      });
    } catch (error: any) {
      res.status(502).json({ message: error?.message || "Failed to read assistant" });
    }
  });
}
