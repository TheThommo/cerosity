import { storage } from "./storage";
import type { AthleteFacts } from "./gemini";

// Write side of FLO's memory. flo-athlete-context.ts reads the profile back
// into the prompt; this is what puts things there in the first place.
//
// Everything here is additive: a fact the athlete repeats must not accumulate
// duplicate rows, and nothing they set themselves is overwritten by a model's
// guess. The caller swallows failures — losing a fact is bad, but never worth
// failing the coaching reply the athlete is waiting on.

const MAX_CHALLENGES = 12;
const MAX_FACT_LENGTH = 200;

/** Loose equality so "gets angry after bogeys" doesn't get stored twice. */
function alreadyKnown(existing: string[], candidate: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const c = norm(candidate);
  return existing.some((e) => {
    const n = norm(e);
    return n === c || n.includes(c) || c.includes(n);
  });
}

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_FACT_LENGTH) return null;
  return trimmed;
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(clean).filter((v): v is string => v !== null);
}

export async function applyAthleteFacts(userId: number, facts: AthleteFacts | undefined): Promise<string[]> {
  if (!facts || typeof facts !== "object") return [];

  const applied: string[] = [];
  const user = await storage.getUser(userId);
  if (!user) return [];

  // Sport and preferred name only fill gaps — a value the athlete set on their
  // own profile outranks anything inferred from conversation.
  const sport = clean(facts.sport);
  if (sport && !user.sport) {
    await storage.updateUser(userId, { sport: sport.toLowerCase() });
    applied.push(`sport=${sport.toLowerCase()}`);
  }

  const preferredName = clean(facts.preferredName);
  if (preferredName && !user.firstName) {
    await storage.updateUser(userId, { firstName: preferredName });
    applied.push(`firstName=${preferredName}`);
  }

  const challenges = cleanList(facts.challenges);
  if (challenges.length) {
    const profile = await storage.getAthleteProfile(userId);
    const existing = (profile?.challenges as Array<{ title?: string }> | undefined) ?? [];
    const existingTitles = existing.map((c) => c?.title ?? "").filter(Boolean);

    const additions = challenges
      .filter((c) => !alreadyKnown(existingTitles, c))
      .map((title) => ({ title, description: "Disclosed to FLO in conversation" }));

    if (additions.length) {
      await storage.upsertAthleteProfile(userId, {
        challenges: [...existing, ...additions].slice(-MAX_CHALLENGES),
        achievements: (profile?.achievements as unknown[]) ?? [],
      });
      applied.push(...additions.map((a) => `challenge=${a.title}`));
    }
  }

  const goals = cleanList(facts.goals);
  if (goals.length) {
    const existingGoals = await storage.getUserGoals(userId);
    const existingText = existingGoals.map((g) => g.goalText);

    for (const goalText of goals) {
      if (alreadyKnown(existingText, goalText)) continue;
      await storage.createUserGoal({ userId, goalText, category: "flo_disclosed" });
      existingText.push(goalText);
      applied.push(`goal=${goalText}`);
    }
  }

  return applied;
}
