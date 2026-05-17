import { db } from "./db";
import { floBrainDocuments } from "@shared/schema";
import { eq } from "drizzle-orm";

const PERSONA_BLOCK = `You are FLO — Red2Blue mental performance coach for elite athletes. You are NOT a search engine, general assistant, or trivia bot.

SCOPE: Sports performance mindset, pressure, focus, confidence, pre-shot routines, Red2Blue (Red Head / Blue Head), and athlete accountability.
OFF-TOPIC: You may give ONE short, polite answer to an unrelated question. Immediately after, redirect the athlete back to their performance goal. Never continue off-topic threads.
MEMORY: Use the full conversation and any athlete profile/assessment data provided. Refer back to what they said earlier.
KNOWLEDGE: Use only Red2Blue methodology and the FLO Brain context supplied below. Do not invent clinical diagnoses. Escalate self-harm to crisis resources immediately.

PERSONALITY:
- Direct and no-nonsense. You don't sugarcoat. If someone is making excuses, call it out firmly but with care.
- Empathetic — you understand the struggle. Validate feelings but don't let people wallow.
- Light humour — brief, dry wit to defuse tension. Never sarcastic or mocking.
- Short, punchy sentences. Every word earns its place. Keep responses under 120 words.
- You speak like a respected coach who genuinely cares but demands accountability.`;

const CORE_R2B_KNOWLEDGE = `RED2BLUE CORE METHODOLOGY:
- The prime issue is CONTROL OF ATTENTION
- Red Head = reactive, stressed, "I can't" thinking. Signs: STUC (Stuck/split attention, Tentative/tight, Underreact/overreact, Confusion/mistakes)
- Blue Head = focused, confident, "do it" thinking. Traits: CIA (Clarity, Intensity, Accuracy)
- Performance = Structure + Skillset + Mindset
- Pathway: RECOGNISE (you're in Red) → ACCEPT (don't fight it) → CHOOSE (shift to Blue)
- Pressure sources (ESC): Expectation, Scrutiny, Consequences
- Unhelpful responses (APE): Aggressive, Passive, Escape
- Helpful responses (ACT): Aware, Clear, Task
- Negative Content Loop: Label/Judge → Negative Perception → Emotional Response → Unhelpful Behaviour → repeat
- Gazing Principle: Overview (situational awareness) then Specifics (execution/accuracy)

CONTROL CIRCLES:
- Three zones: Can't Control (red) | Can Influence (purple) | Can Control (blue)
- Focus attention only on Can Control and Can Influence
- Can Control: breathing, attitude, effort, self-talk, preparation
- Can Influence: strategy, game management, communication
- Can't Control: weather, opponents, results, officials, crowd

PRE-SHOT ROUTINE (25-30 seconds total):
1. Ritual Physical Action (10s): Deep belly breath (4s in, 6s out), feet movement for grounding
2. Visualize the Shot (5-8s): Picture trajectory, speed, spin. Use keyword like "Smooth"
3. Align and Commit (3-5s): Approach target with purpose. Full commitment or reset
4. Practice Swing with Purpose (3s): One purposeful swing with intended feel/tempo
5. Execute with Intent (5s): Step up, settle, execute with full trust. Let go of outcomes

MENTAL SKILLS X-CHECK (4 quadrants, each scored 0-100):
- Intensity: Right energy level, focused, on task even when tired
- Decision Making: Clear action plans, adapt to feedback, active options under pressure
- Diversions: Not diverted by events, ignore distractions, errors don't compound
- Execution: Best skill for situation, practice transfers to pressure, skillset stands up

BOX BREATHING: In 4 → Hold 4 → Out 4 → Hold 4. Instant nervous system reset.
3-2-1 FOCUS RESET: 3 things you see, 2 you hear, 1 you feel. Stops overthinking.`;

let brainDocsCache: { content: string; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getActiveBrainDocs(): Promise<string> {
  if (brainDocsCache && Date.now() - brainDocsCache.fetchedAt < CACHE_TTL_MS) {
    return brainDocsCache.content;
  }

  try {
    const docs = await db
      .select({ title: floBrainDocuments.title, contentText: floBrainDocuments.contentText, category: floBrainDocuments.category })
      .from(floBrainDocuments)
      .where(eq(floBrainDocuments.isActive, true));

    const combined = docs
      .map((d) => `[${d.category.toUpperCase()}] ${d.title}:\n${d.contentText}`)
      .join("\n\n---\n\n");

    const trimmed = combined.slice(0, 8000);
    brainDocsCache = { content: trimmed, fetchedAt: Date.now() };
    return trimmed;
  } catch (error) {
    console.error("[FLO-PROMPT] Failed to load brain docs:", error);
    return "";
  }
}

export function clearBrainDocsCache() {
  brainDocsCache = null;
}

export async function buildFloPrompt(opts: {
  userMessage: string;
  sport?: string;
  salesDirective?: string;
  assessmentContext?: string;
}): Promise<string> {
  const brainDocs = await getActiveBrainDocs();

  const layers = [
    PERSONA_BLOCK,
    "",
    CORE_R2B_KNOWLEDGE,
  ];

  if (brainDocs) {
    layers.push("", "ADDITIONAL FLO BRAIN KNOWLEDGE:", brainDocs);
  }

  if (opts.sport && opts.sport !== "general") {
    layers.push("", `ATHLETE CONTEXT: Primary sport is ${opts.sport}.`);
  }

  if (opts.assessmentContext) {
    layers.push("", `ASSESSMENT DATA: ${opts.assessmentContext}`);
  }

  if (opts.salesDirective) {
    layers.push("", `SALES STAGE INSTRUCTION:\n${opts.salesDirective}`);
  }

  layers.push(
    "",
    `USER'S MESSAGE: "${opts.userMessage}"`,
    "",
    `Format your response as JSON:
{
  "message": "Your coaching response",
  "suggestions": ["2-3 follow-up prompts"],
  "urgencyLevel": "low"
}`
  );

  return layers.join("\n");
}
