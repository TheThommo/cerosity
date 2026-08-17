import { storage } from "./storage";
import type { User, AthleteProfile, UserGoal, DailyMood, ChatSession } from "@shared/schema";

export function formatAthleteContextForPrompt(
  user: User,
  profile: AthleteProfile | undefined,
  goals: UserGoal[]
): string {
  const sections: string[] = [];

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (name) sections.push(`ATHLETE: ${name}`);
  if (user.sport) sections.push(`SPORT: ${user.sport}`);

  if (user.bio) {
    sections.push(`BIO: ${user.bio}`);
  }

  if (profile) {
    const achievements = profile.achievements as any[];
    if (achievements?.length) {
      const list = achievements
        .map((a: any) => `- ${a.title}${a.year ? ` (${a.year})` : ""}${a.description ? `: ${a.description}` : ""}`)
        .join("\n");
      sections.push(`ACHIEVEMENTS:\n${list}`);
    }

    const challenges = profile.challenges as any[];
    if (challenges?.length) {
      const list = challenges
        .map((c: any) => `- ${c.title}${c.description ? `: ${c.description}` : ""}${c.priority ? ` [priority ${c.priority}/5]` : ""}`)
        .join("\n");
      sections.push(`CHALLENGES (what FLO should help with):\n${list}`);
    }
  }

  if (goals.length) {
    const grouped: Record<string, UserGoal[]> = {};
    for (const g of goals) {
      const cat = g.category || "general";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(g);
    }

    const goalLines: string[] = [];
    for (const [cat, items] of Object.entries(grouped)) {
      const label = cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      goalLines.push(`${label}:`);
      for (const g of items) {
        const status = g.isCompleted ? " [DONE]" : "";
        goalLines.push(`  - ${g.goalText}${status}`);
      }
    }
    sections.push(`GOALS:\n${goalLines.join("\n")}`);
  }

  if (sections.length === 0) return "";
  return `ATHLETE PROFILE:\n${sections.join("\n\n")}`;
}

// ── The memory pack ───────────────────────────────────────────────────
// One builder, both modalities. Text FLO and voice FLO call this exact
// function, so an athlete who told FLO something by keyboard on Tuesday is
// remembered by FLO's voice on Thursday. Anything that diverges here becomes
// two coaches wearing one name.
//
// Everything below reads tables that already exist. Nothing is invented: a
// section is omitted entirely rather than rendered empty, because a heading
// with nothing under it reads to the model as "asked and answered" and stops
// FLO from ever asking.

const MOOD_WINDOW_DAYS = 14;
const MAX_MOOD_ROWS = 14;
const MAX_RECENT_TURNS = 8;
const MAX_TURN_CHARS = 240;
const MAX_NOTE_CHARS = 160;

export type AthleteMemoryPack = {
  /** Prompt-ready block. Empty string when this athlete has no recorded history. */
  context: string;
  /** Most recent durable chat turn, for the silence-gap opener. Null if never chatted. */
  lastActivityAt: Date | null;
  /** Open challenge titles — what a returning athlete gets asked about. */
  openChallenges: string[];
  /** The last thing the athlete themselves said, trimmed. Null if nothing on record. */
  lastAthleteMessage: string | null;
};

type StoredTurn = { role?: string; content?: string; timestamp?: string };

function truncate(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}

/**
 * Moods within the window, newest first.
 *
 * The date filter is applied here rather than trusted to the query:
 * DatabaseStorage.getUserMoods computes a cutoff and then never puts it in the
 * where clause, so it hands back an athlete's entire mood history.
 */
function recentMoods(moods: DailyMood[]): DailyMood[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MOOD_WINDOW_DAYS);

  return moods
    .filter((m) => {
      const on = new Date(m.date);
      return !Number.isNaN(on.getTime()) && on >= cutoff;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_MOOD_ROWS);
}

/** Newest conversation by actual activity — sessions arrive ordered by creation, not use. */
function newestSession(sessions: ChatSession[]): ChatSession | undefined {
  const stamp = (s: ChatSession) => (s.updatedAt ?? s.createdAt)?.getTime() ?? 0;
  return [...sessions].sort((a, b) => stamp(b) - stamp(a))[0];
}

function describeMood(score: number): string {
  if (score >= 75) return "good";
  if (score >= 50) return "okay";
  if (score >= 25) return "low";
  return "very low";
}

/** A real coach notices a fortnight of silence. Below this, just say hello. */
const SILENCE_THRESHOLD_HOURS = 48;

/**
 * The opener for an athlete coming back after a gap.
 *
 * Returned as a prompt directive rather than a canned client-side string so the
 * voice path gets the same behaviour from the same rule — a spoken FLO that
 * greets you as a stranger after a week away is the tell that there is no memory
 * behind it. Null means "no gap worth remarking on": say nothing special.
 */
export function buildReturningAthleteDirective(pack: AthleteMemoryPack): string | null {
  if (!pack.lastActivityAt) return null;

  const hoursAway = (Date.now() - pack.lastActivityAt.getTime()) / 3_600_000;
  if (hoursAway < SILENCE_THRESHOLD_HOURS) return null;

  const days = Math.floor(hoursAway / 24);
  const gap = days >= 1 ? `${days} day${days === 1 ? "" : "s"}` : `${Math.floor(hoursAway)} hours`;

  const lines = [
    `RETURNING ATHLETE: it has been about ${gap} since you last spoke.`,
    `Open by picking that thread back up and asking how it actually went — one warm, specific question.`,
    `Do not greet them as a stranger, do not recite what you remember, and do not ask what they'd like to work on as if this were the first time.`,
  ];

  if (pack.openChallenges.length) {
    lines.push(`What they were working on: ${pack.openChallenges.slice(0, 3).join("; ")}.`);
  }
  if (pack.lastAthleteMessage) {
    lines.push(`The last thing they said to you: "${pack.lastAthleteMessage}"`);
  }
  if (!pack.openChallenges.length && !pack.lastAthleteMessage) {
    lines.push(
      `You have no record of what they were working on. Check in warmly and ask what has happened since — invent nothing.`
    );
  }

  return lines.join("\n");
}

export async function buildAthleteMemoryPack(userId: number): Promise<AthleteMemoryPack> {
  const empty: AthleteMemoryPack = {
    context: "",
    lastActivityAt: null,
    openChallenges: [],
    lastAthleteMessage: null,
  };

  const user = await storage.getUser(userId);
  if (!user) return empty;

  // Losing one signal must not cost the athlete the other five, so each source
  // is settled independently and a failure degrades to "not recorded".
  const [profile, goals, moods, sessions, assessment] = await Promise.all([
    storage.getAthleteProfile(userId).catch(() => undefined),
    storage.getUserGoals(userId).catch(() => [] as UserGoal[]),
    storage.getUserMoods(userId, MOOD_WINDOW_DAYS).catch(() => [] as DailyMood[]),
    storage.getUserChatSessions(userId).catch(() => [] as ChatSession[]),
    storage.getLatestAssessment(userId).catch(() => undefined),
  ]);

  const blocks: string[] = [];

  const profileBlock = formatAthleteContextForPrompt(user, profile, goals);
  if (profileBlock) blocks.push(profileBlock);

  const window = recentMoods(moods);
  if (window.length) {
    const lines = window.map((m) => {
      const note = m.notes ? ` — "${truncate(m.notes, MAX_NOTE_CHARS)}"` : "";
      return `- ${m.date}: ${m.moodScore}/100 (${describeMood(m.moodScore)})${note}`;
    });
    blocks.push(
      `RECENT MOOD CHECK-INS (last ${MOOD_WINDOW_DAYS} days, newest first):\n${lines.join("\n")}\n` +
      `These are the athlete's own logged feelings. Treat a downward run as something to ask about, not to diagnose.`
    );
  }

  if (assessment) {
    blocks.push(
      `LATEST MENTAL SKILLS X-CHECK: Intensity ${assessment.intensityScore ?? 0}/100, ` +
      `Decision Making ${assessment.decisionMakingScore ?? 0}/100, ` +
      `Diversions ${assessment.diversionsScore ?? 0}/100, ` +
      `Execution ${assessment.executionScore ?? 0}/100, ` +
      `Total ${assessment.totalScore ?? 0}/400`
    );
  }

  const session = newestSession(sessions);
  const turns = ((session?.messages as StoredTurn[] | undefined) ?? []).filter(
    (t) => typeof t?.content === "string" && t.content.trim()
  );

  let lastActivityAt: Date | null = null;
  let lastAthleteMessage: string | null = null;

  if (turns.length) {
    const recent = turns.slice(-MAX_RECENT_TURNS);
    const lines = recent.map((t) => {
      const who = t.role === "user" ? "Athlete" : "FLO";
      return `- ${who}: ${truncate(t.content!, MAX_TURN_CHARS)}`;
    });
    blocks.push(
      `WHERE YOU LEFT OFF (most recent conversation, oldest first):\n${lines.join("\n")}`
    );

    const lastFromAthlete = [...turns].reverse().find((t) => t.role === "user");
    if (lastFromAthlete) lastAthleteMessage = truncate(lastFromAthlete.content!, MAX_TURN_CHARS);

    const stamps = turns
      .map((t) => (t.timestamp ? new Date(t.timestamp) : null))
      .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));
    if (stamps.length) {
      lastActivityAt = new Date(Math.max(...stamps.map((d) => d.getTime())));
    }
  }

  // Fall back to the row's own clock when the stored turns carry no timestamps.
  if (!lastActivityAt && session) {
    lastActivityAt = session.updatedAt ?? session.createdAt ?? null;
  }

  const openChallenges = ((profile?.challenges as Array<{ title?: string }> | undefined) ?? [])
    .map((c) => c?.title)
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0);

  return {
    context: blocks.join("\n\n"),
    lastActivityAt,
    openChallenges,
    lastAthleteMessage,
  };
}
