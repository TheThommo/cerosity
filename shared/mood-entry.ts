/**
 * Mood entries: five factors the athlete rates separately, 0–100 each, in one of
 * four sport-neutral contexts. The labels an athlete sees ("Pre-round", …) live
 * in the UI; the stored value never names a sport.
 *
 * The old daily_moods path stored one number and derived every factor from it,
 * so all five were always equal. This is the replacement input rule, shared by
 * the API and the check-in form.
 */

export const MOOD_CONTEXTS = ["practice", "pre_event", "post_event", "check_in"] as const;
export type MoodContext = (typeof MOOD_CONTEXTS)[number];

export const MOOD_FACTORS = ["confidence", "focus", "energy", "stress", "motivation"] as const;
export type MoodFactor = (typeof MOOD_FACTORS)[number];

export const MOOD_FACTOR_MIN = 0;
export const MOOD_FACTOR_MAX = 100;
export const MOOD_NOTE_MAX_LENGTH = 1000;

/** GET /api/mood-entries/:userId page size. */
export const MOOD_ENTRIES_DEFAULT_LIMIT = 30;
export const MOOD_ENTRIES_MAX_LIMIT = 100;

export type MoodEntryInput = {
  occurredAt: Date;
  context: MoodContext;
  note: string | null;
} & Record<MoodFactor, number>;

export type ParseResult =
  | { ok: true; value: MoodEntryInput }
  | { ok: false; error: string };

/**
 * Validates a request body. Only known fields are copied out, so anything else
 * in the payload — a userId in particular — never reaches the insert.
 */
export function parseMoodEntryInput(body: unknown, now: Date = new Date()): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const input = body as Record<string, unknown>;

  if (!MOOD_CONTEXTS.includes(input.context as MoodContext)) {
    return { ok: false, error: `context must be one of ${MOOD_CONTEXTS.join(", ")}` };
  }

  const factors = {} as Record<MoodFactor, number>;
  for (const factor of MOOD_FACTORS) {
    const value = input[factor];
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < MOOD_FACTOR_MIN ||
      value > MOOD_FACTOR_MAX
    ) {
      return {
        ok: false,
        error: `${factor} must be a whole number from ${MOOD_FACTOR_MIN} to ${MOOD_FACTOR_MAX}`,
      };
    }
    factors[factor] = value;
  }

  let occurredAt = now;
  if (input.occurredAt !== undefined && input.occurredAt !== null) {
    // Type first: new Date() throws on an object with no usable toString/valueOf,
    // and such an object is one JSON.parse away.
    const parsed = typeof input.occurredAt === "string" ? new Date(input.occurredAt) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "occurredAt must be an ISO date-time string" };
    }
    occurredAt = parsed;
  }

  let note: string | null = null;
  if (input.note !== undefined && input.note !== null) {
    if (typeof input.note !== "string") {
      return { ok: false, error: "note must be text" };
    }
    const trimmed = input.note.trim();
    if (trimmed.length > MOOD_NOTE_MAX_LENGTH) {
      return { ok: false, error: `note must be at most ${MOOD_NOTE_MAX_LENGTH} characters` };
    }
    note = trimmed.length > 0 ? trimmed : null;
  }

  return {
    ok: true,
    value: { occurredAt, context: input.context as MoodContext, note, ...factors },
  };
}
