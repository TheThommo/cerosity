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
  if (!res.ok) throw new Error(`VAPI update assistant failed: ${res.status}`);
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

export function buildFloVapiAssistantConfig(webhookUrl: string) {
  return {
    name: "FLO - Cerosity",
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      systemMessage: buildFloVoiceSystemPrompt(),
      temperature: 0.7,
      maxTokens: 512,
      tools: getFloToolDefinitions(),
    },
    voice: {
      provider: "elevenlabs",
      voiceId: "9BWtsMINqrJLrRacOk9x", // Aria — warm, professional
      stability: 0.6,
      similarityBoost: 0.8,
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
      keywords: [
        "Cerosity", "FLO", "Red2Blue", "Red Head", "Blue Head",
        "STUCK", "CIA", "Gazing", "pre-shot routine", "control circles",
        "box breathing", "mental skills x-check",
      ],
    },
    firstMessage: "Hey. I'm FLO, your mental performance coach. What's going on — what are you working through right now?",
    endCallMessage: "Good chat. Remember — you control your next move. Go make it count.",
    serverUrl: webhookUrl,
    silenceTimeoutSeconds: 10,
    maxDurationSeconds: 1800,
    recordingEnabled: false,
    metadata: { platform: "cerosity" },
  };
}

function buildFloVoiceSystemPrompt(): string {
  return `You are FLO — Red2Blue mental performance coach for Cerosity. Stern yet empathetic, with dry wit when appropriate.

VOICE MODE RULES:
1. Keep every response under 2-3 sentences. No lectures.
2. Never read URLs, links, or email addresses aloud. Say "I'll send you that" instead.
3. Use natural filler when looking something up: "Let me check that for you..." or "One moment..."
4. Match the athlete's energy. If they're fired up, match it. If they're flat, bring warmth.
5. No humor during crisis moments or when someone sounds upset.
6. Numbers: say "seven thirty" not "7:30". Say "two hundred dollars" not "$200".
7. Never say "as an AI" or "I'm an artificial intelligence". You're FLO.
8. If someone mentions self-harm or crisis, use the escalate_to_human tool immediately.

RED2BLUE METHODOLOGY:
- Red Head = reactive, stressed, "I can't" thinking. Signs: STUC.
- Blue Head = focused, confident, "do it" thinking. Traits: CIA (Clarity, Intensity, Accuracy).
- Performance = Structure + Skillset + Mindset
- Techniques: Box Breathing (4-4-4-4), Control Circles, Pre-Performance Routine (25s), 3-2-1 Focus Reset, STUCK model
- Pressure sources (ESC): Expectation, Scrutiny, Consequences
- Gazing: Overview then Specifics

COACHING STYLE:
- Direct and no-nonsense. Call out excuses firmly but with care.
- Short, punchy sentences. Every word earns its place.
- Ask one focused question at a time.
- When someone is spiraling, ground them immediately with a technique.
- Always bring it back to actionable next steps.`;
}

function getFloToolDefinitions() {
  return [
    {
      type: "function",
      function: {
        name: "suggest_technique",
        description: "Suggest a specific Red2Blue mental performance technique based on the athlete's current situation (nerves, focus, pressure, confidence, anger).",
        parameters: {
          type: "object",
          properties: {
            situation: {
              type: "string",
              description: "The athlete's current challenge: nerves, focus, pressure, confidence, anger, or a description",
            },
          },
          required: ["situation"],
        },
      },
      messages: [{ type: "request-start", content: "Let me think about the right technique for this." }],
    },
    {
      type: "function",
      function: {
        name: "log_session_note",
        description: "Record an important insight or commitment from this session for future reference.",
        parameters: {
          type: "object",
          properties: {
            note: { type: "string", description: "The key insight or commitment to remember" },
            userId: { type: "string", description: "The athlete's user ID if known" },
          },
          required: ["note"],
        },
      },
      messages: [{ type: "request-start", content: "I'll make a note of that." }],
    },
    {
      type: "function",
      function: {
        name: "escalate_to_human",
        description: "Flag this conversation for urgent human coach review. Use when someone mentions self-harm, crisis, or needs support beyond mental performance coaching.",
        parameters: {
          type: "object",
          properties: {
            reason: { type: "string", description: "Why this needs human attention" },
          },
          required: ["reason"],
        },
      },
      messages: [{ type: "request-start", content: "Let me connect you with additional support." }],
    },
  ];
}
