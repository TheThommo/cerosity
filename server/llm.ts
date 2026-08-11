import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// The one place Cerosity talks to a language model. Every FLO surface — landing
// chat, authenticated coaching, and the VAPI voice bridge — reaches a model
// through here, so provider choice and model names live in exactly one file.
//
// Per CLAUDE.md Rule 1 model names come from the environment. The constants
// below are the single fallback site; do not add model literals anywhere else.

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

const MAX_OUTPUT_TOKENS = 800;
const REQUEST_TIMEOUT_MS = 20000;

export type LlmProvider = "anthropic" | "gemini";

export type LlmTurn = { role: "user" | "assistant"; text: string };

export type LlmResult = {
  text: string;
  provider: LlmProvider;
  model: string;
};

/** Thrown when every configured provider failed. Callers decide what the athlete sees. */
export class LlmUnavailableError extends Error {
  constructor(message: string, readonly attempts: Array<{ provider: LlmProvider; error: string }>) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || process.env.FLO_MODEL || DEFAULT_ANTHROPIC_MODEL;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

/**
 * Which provider runs first. FLO_LLM_PROVIDER wins when set; otherwise Anthropic
 * whenever a key is present, because Sonnet is the Cerosity brain and Gemini is
 * only the safety net.
 */
export function primaryProvider(): LlmProvider {
  const configured = (process.env.FLO_LLM_PROVIDER || "").trim().toLowerCase();
  if (configured === "anthropic" || configured === "gemini") return configured;
  return process.env.ANTHROPIC_API_KEY ? "anthropic" : "gemini";
}

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

let geminiClient: GoogleGenerativeAI | null = null;
function getGemini(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }
  return geminiClient;
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS}ms`)), REQUEST_TIMEOUT_MS)
    ),
  ]);
}

/** Drop leading assistant turns — both providers require the first turn to be the user. */
function normaliseHistory(history: LlmTurn[]): LlmTurn[] {
  const cleaned = history.filter((t) => t.text?.trim());
  while (cleaned.length && cleaned[0].role !== "user") cleaned.shift();
  return cleaned;
}

async function callAnthropic(systemPrompt: string, history: LlmTurn[], userMessage: string): Promise<LlmResult> {
  const model = anthropicModel();
  const client = getAnthropic();

  // No temperature/top_p/top_k: Sonnet 5 rejects non-default sampling parameters.
  // Thinking is off because a coaching reply is short and latency matters more
  // than deliberation here.
  const response = await withTimeout(
    client.messages.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      thinking: { type: "disabled" },
      messages: [
        ...history.map((t) => ({ role: t.role, content: t.text })),
        { role: "user" as const, content: userMessage },
      ],
    }),
    "Anthropic request"
  );

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error(`Anthropic returned no text (stop_reason=${response.stop_reason})`);
  }

  return { text, provider: "anthropic", model };
}

async function callGemini(systemPrompt: string, history: LlmTurn[], userMessage: string): Promise<LlmResult> {
  const model = geminiModel();
  const generativeModel = getGemini().getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.7 },
  });

  const chat = generativeModel.startChat({
    history: history.map((t) => ({
      role: t.role === "assistant" ? "model" : "user",
      parts: [{ text: t.text }],
    })),
  });

  const result = await withTimeout(chat.sendMessage(userMessage), "Gemini request");
  const text = (result as any).response.text().trim();
  if (!text) throw new Error("Gemini returned no text");

  return { text, provider: "gemini", model };
}

function providerConfigured(provider: LlmProvider): boolean {
  return provider === "anthropic" ? !!process.env.ANTHROPIC_API_KEY : !!process.env.GEMINI_API_KEY;
}

/**
 * Run the athlete's message through the primary provider, falling back to the
 * other one only if it is configured. Throws LlmUnavailableError when nothing
 * answered — silently returning canned text here is what made a total AI outage
 * indistinguishable from FLO working (audit B3).
 */
export async function generateCoachingText(
  systemPrompt: string,
  history: LlmTurn[],
  userMessage: string
): Promise<LlmResult> {
  const primary = primaryProvider();
  const order: LlmProvider[] = primary === "anthropic" ? ["anthropic", "gemini"] : ["gemini", "anthropic"];
  const cleanHistory = normaliseHistory(history);
  const attempts: Array<{ provider: LlmProvider; error: string }> = [];

  for (const provider of order) {
    if (!providerConfigured(provider)) {
      attempts.push({ provider, error: "no API key configured" });
      continue;
    }

    try {
      const result =
        provider === "anthropic"
          ? await callAnthropic(systemPrompt, cleanHistory, userMessage)
          : await callGemini(systemPrompt, cleanHistory, userMessage);
      console.log(`[FLO-LLM] provider=${result.provider} model=${result.model} chars=${result.text.length}`);
      return result;
    } catch (error: any) {
      // The real error, not a summary — a silent swallow here is what hid the
      // outage last time. Never log the key itself.
      const detail = error?.status
        ? `${error.status} ${error?.error?.error?.message || error.message}`
        : error?.message || String(error);
      console.error(`[FLO-LLM] provider=${provider} FAILED: ${detail}`);
      attempts.push({ provider, error: detail });
    }
  }

  throw new LlmUnavailableError(
    `All LLM providers failed: ${attempts.map((a) => `${a.provider} (${a.error})`).join("; ")}`,
    attempts
  );
}
