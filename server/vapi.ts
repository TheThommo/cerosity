import { createHmac, timingSafeEqual } from "crypto";
import { db } from "./db";
import { voiceCalls, voiceCallTranscripts } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

// ── Env ────────────────────────────────────────────────────────────

const VAPI_API_KEY = process.env.VAPI_API_KEY || "";
const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET || "";
const VAPI_BASE = "https://api.vapi.ai";

// ── Signature Verification ─────────────────────────────────────────

export function verifyVapiSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Webhook Handler ────────────────────────────────────────────────

export async function handleVapiWebhook(req: Request, res: Response) {
  // Verify signature in production
  if (VAPI_WEBHOOK_SECRET) {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const signature = req.headers["x-vapi-signature"] as string | undefined;
    if (!verifyVapiSignature(rawBody, signature ?? null, VAPI_WEBHOOK_SECRET)) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const event = req.body;
  const eventType = event.message?.type ?? event.type;

  try {
    switch (eventType) {
      case "call.started":
        await handleCallStarted(event);
        break;
      case "call.ended":
        await handleCallEnded(event);
        break;
      case "transcript.ready":
        await handleTranscript(event);
        break;
      case "tool_calls":
        return handleToolCalls(event, res);
      case "end-of-call-report":
        await handleEndOfCallReport(event);
        break;
      default:
        console.log(`[VAPI] Unhandled event: ${eventType}`);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[VAPI] Webhook error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

// ── Event Handlers ─────────────────────────────────────────────────

async function handleCallStarted(event: any) {
  const call = event.message?.call;
  if (!call?.id) return;

  // Idempotent — skip if already exists
  const existing = await db
    .select({ id: voiceCalls.id })
    .from(voiceCalls)
    .where(eq(voiceCalls.providerCallId, call.id))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(voiceCalls).values({
    providerCallId: call.id,
    direction: call.type === "inboundPhoneCall" ? "inbound" : call.type === "outboundPhoneCall" ? "outbound" : "web",
    status: "in-progress",
    fromNumber: call.customer?.number || null,
    toNumber: call.phoneNumber?.number || null,
    vapiAssistantId: call.assistantId || null,
    providerMetadata: call.metadata || null,
    startedAt: new Date(),
  });
  console.log(`[VAPI] Call started: ${call.id}`);
}

async function handleCallEnded(event: any) {
  const call = event.message?.call;
  if (!call?.id) return;

  await db
    .update(voiceCalls)
    .set({
      status: "completed",
      endedAt: new Date(),
      durationSeconds: call.duration || null,
      costUsd: call.cost?.toString() || null,
    })
    .where(eq(voiceCalls.providerCallId, call.id));
  console.log(`[VAPI] Call ended: ${call.id}, duration: ${call.duration}s`);
}

async function handleEndOfCallReport(event: any) {
  const report = event.message;
  const callId = report?.call?.id;
  if (!callId) return;

  await db
    .update(voiceCalls)
    .set({
      costUsd: report.cost?.toString() || null,
      summary: report.summary || null,
      providerMetadata: {
        costBreakdown: report.costBreakdown,
        analysis: report.analysis,
      },
    })
    .where(eq(voiceCalls.providerCallId, callId));
  console.log(`[VAPI] End-of-call report: ${callId}, cost: $${report.cost}`);
}

async function handleTranscript(event: any) {
  const transcript = event.message?.transcript;
  const callId = event.message?.call?.id;
  if (!transcript || !callId) return;

  // Resolve internal call ID
  const [call] = await db
    .select({ id: voiceCalls.id })
    .from(voiceCalls)
    .where(eq(voiceCalls.providerCallId, callId))
    .limit(1);
  if (!call) return;

  await db.insert(voiceCallTranscripts).values({
    callId: call.id,
    speaker: transcript.role === "assistant" ? "Agent" : "Customer",
    content: transcript.text,
    confidence: transcript.confidence?.toString() || null,
  });
}

// ── Tool Call Handler ──────────────────────────────────────────────

async function handleToolCalls(event: any, res: Response) {
  const toolCalls = event.message?.toolCallList ?? [];
  const results = [];

  for (const toolCall of toolCalls) {
    const { name, arguments: args } = toolCall.function;
    let result: any;

    try {
      switch (name) {
        case "suggest_technique":
          result = toolSuggestTechnique(args);
          break;
        case "log_session_note":
          result = toolLogSessionNote(args);
          break;
        case "escalate_to_human":
          result = toolEscalateToHuman(args);
          break;
        default:
          result = { success: false, spokenResponse: `I don't have that capability right now. Let me help you directly instead.` };
      }
    } catch (err) {
      console.error(`[VAPI] Tool error (${name}):`, err);
      result = { success: false, spokenResponse: "Something went wrong on my end. Let me try a different approach." };
    }

    results.push({
      toolCallId: toolCall.id,
      result: JSON.stringify(result),
    });
  }

  return res.json({ results });
}

// ── FLO-Specific Tools ─────────────────────────────────────────────

function toolSuggestTechnique(args: any) {
  const { situation } = args;
  const techniques: Record<string, string> = {
    nerves: "Let's do Box Breathing. Four seconds in, hold four, out four, hold four. This switches you from Red Head to Blue Head in about sixty seconds.",
    nervous: "Let's do Box Breathing. Four seconds in, hold four, out four, hold four. This switches you from Red Head to Blue Head in about sixty seconds.",
    focus: "Try the Three Two One Focus Reset. Three things you see, two things you hear, one deep breath. Brings you right into the present moment.",
    pressure: "Use your Control Circles. What can you actually control right now? Your breathing, your routine, your effort. Everything else — park it.",
    confidence: "Run your Pre-Performance Routine. Twenty-five seconds: deep breath, visualize the shot, commit fully, execute with trust.",
    anger: "You're in Red Head. That's okay — recognize it. Now use the STUCK model: Stop, Think, Understand what triggered it, Choose your response, Know-how to execute.",
    frustrated: "You're in Red Head. Recognize it first. Use the STUCK model: Stop, Think, Understand the trigger, Choose your response, then execute with Know-how.",
    distracted: "Three Two One Reset. Three things you see right now, two you hear, one deep breath. You're back in the present. Now — what's the one thing you need to do next?",
  };

  const lower = (situation || "").toLowerCase();
  const key = Object.keys(techniques).find((k) => lower.includes(k));
  const response = key
    ? techniques[key]
    : "Tell me more about what you're feeling. Is it nerves, focus, pressure, confidence, or frustration? I'll give you the right technique.";

  return { success: true, spokenResponse: response };
}

function toolLogSessionNote(args: any) {
  const { note, userId } = args;
  console.log(`[VAPI] Session note${userId ? ` (user ${userId})` : ""}: ${note}`);
  return { success: true, spokenResponse: "Noted. I'll remember that for next time." };
}

function toolEscalateToHuman(args: any) {
  const { reason } = args;
  console.warn(`[VAPI] ESCALATION REQUESTED: ${reason}`);
  return {
    success: true,
    spokenResponse: "I'm going to flag this for a human coach to follow up with you. If you need immediate support, please reach out to a crisis helpline. You're not alone in this.",
  };
}

// ── VAPI Assistant CRUD ────────────────────────────────────────────

const vapiHeaders = () => ({
  Authorization: `Bearer ${VAPI_API_KEY}`,
  "Content-Type": "application/json",
});

export async function createVapiAssistant(config: any): Promise<string> {
  const res = await fetch(`${VAPI_BASE}/assistant`, {
    method: "POST",
    headers: vapiHeaders(),
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`VAPI create assistant failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

export async function updateVapiAssistant(assistantId: string, config: any) {
  const res = await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
    method: "PATCH",
    headers: vapiHeaders(),
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    // Surface the FULL VAPI response body so logs explain WHY the PATCH failed.
    // (The request body / headers — which carry the key — are never logged.)
    const body = await res.text().catch(() => "");
    throw new Error(`VAPI update assistant failed: ${res.status} ${res.statusText} :: ${body}`);
  }
  return res.json();
}

export async function getVapiAssistant(assistantId: string) {
  const res = await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
    headers: vapiHeaders(),
  });
  if (!res.ok) throw new Error(`VAPI get assistant failed: ${res.status}`);
  return res.json();
}

export async function deleteVapiAssistant(assistantId: string) {
  const res = await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
    method: "DELETE",
    headers: vapiHeaders(),
  });
  if (!res.ok) throw new Error(`VAPI delete assistant failed: ${res.status}`);
}

// ── FLO Assistant Config Builder ───────────────────────────────────
// VAPI is voice transport ONLY. The assistant uses provider "custom-llm"
// pointing back at Cerosity, so every spoken reply is generated by
// buildFloPrompt() + the Cerosity LLM adapter (Claude Sonnet 5) — one brain.
//
// IMPORTANT (validated against the working manual PATCH, 2026-05-30):
// - model.url MUST be the FULL path: https://cerosity.com/api/vapi/chat/completions
//   (VAPI calls this URL as-is; it does NOT append /chat/completions for us).
// - This reconcile payload is intentionally MODEL-ONLY. It does not send voice,
//   transcriber, firstMessage or server, so it can never overwrite the working
//   dashboard voice (Clara/vapi) — overwriting it with ElevenLabs is what made
//   the earlier boot reconcile PATCH get rejected.
// - The only "system message" is a DELIVERY-ONLY instruction (voice the server's
//   reply verbatim). It carries zero coaching content, so the single brain still
//   lives in flo-prompt.ts + server/llm.ts. This is transport, not intelligence.

export const FLO_VAPI_ASSISTANT_ID = process.env.VITE_VAPI_ASSISTANT_ID || "51d263eb-5724-4471-bc27-44341a90c038";

// Delivery-only. NOT coaching. FLO's brain is the Cerosity custom-LLM bridge.
const FLO_VOICE_DELIVERY_SYSTEM =
  "You are the voice of Flow. The server provides the full coaching reply for every turn. " +
  "Speak that reply verbatim. Do not add, remove, summarise, rephrase, translate or invent any content. " +
  "You do not coach, reason, or decide anything yourself — you only voice what the server returns.";

function publicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || "https://cerosity.com").replace(/\/+$/, "");
}

/** Full custom-LLM endpoint VAPI must call (the bridge in server/flo-routes.ts). */
export function floCustomLlmUrl(baseUrl: string = publicBaseUrl()): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/vapi/chat/completions`;
}

// Minimal, model-only PATCH payload. Mirrors the confirmed-working manual config.
export function buildFloVapiAssistantConfig(baseUrl: string = publicBaseUrl()) {
  return {
    model: {
      provider: "custom-llm",
      url: floCustomLlmUrl(baseUrl),
      model: "cerosity-flo",
      messages: [{ role: "system", content: FLO_VOICE_DELIVERY_SYSTEM }],
    },
  };
}

export type ReconcileResult = { ok: boolean; detail?: string; url?: string; at: string };

let lastReconcileResult: ReconcileResult | null = null;
export function getLastReconcileResult(): ReconcileResult | null {
  return lastReconcileResult;
}

// Idempotently force the live VAPI assistant onto the custom-LLM (Cerosity brain).
// Runs on server startup so any drift back to a hosted LLM / dashboard prompt is
// overwritten on deploy. Never throws — voice must not block boot. The full VAPI
// error body is captured in `detail` (and Railway logs) so failures are debuggable.
export async function reconcileFloVapiAssistant(): Promise<ReconcileResult> {
  const at = new Date().toISOString();
  const url = floCustomLlmUrl();
  if (!VAPI_API_KEY) {
    console.log("[VAPI] Skipping assistant reconcile — VAPI_API_KEY not set");
    lastReconcileResult = { ok: false, detail: "no_api_key", url, at };
    return lastReconcileResult;
  }
  try {
    await updateVapiAssistant(FLO_VAPI_ASSISTANT_ID, buildFloVapiAssistantConfig());
    console.log(`[VAPI] FLO assistant reconciled to custom-llm brain (${FLO_VAPI_ASSISTANT_ID}) -> ${url}`);
    lastReconcileResult = { ok: true, url, at };
    return lastReconcileResult;
  } catch (err: any) {
    const detail = err?.message || "reconcile_failed";
    console.error("[VAPI] Assistant reconcile failed:", detail);
    lastReconcileResult = { ok: false, detail, url, at };
    return lastReconcileResult;
  }
}
