/**
 * A mood entry is five separately-rated factors, each a whole number 0–100,
 * logged in one of four sport-neutral contexts. Anything else is refused before
 * it reaches the database. Run: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoodEntryInput, describeLatestCheckInForFlo, MOOD_CONTEXTS, MOOD_FACTORS } from "./mood-entry";

const NOW = new Date("2026-09-29T08:00:00.000Z");

const valid = {
  context: "pre_event",
  confidence: 72,
  focus: 64,
  energy: 55,
  stress: 30,
  motivation: 81,
};

function expectError(body: unknown) {
  const result = parseMoodEntryInput(body, NOW);
  assert.equal(result.ok, false, `expected refusal for ${JSON.stringify(body)}`);
  return result.ok ? "" : result.error;
}

test("a complete entry is accepted with every factor kept as rated", () => {
  const result = parseMoodEntryInput(valid, NOW);
  assert.ok(result.ok);
  assert.equal(result.value.context, "pre_event");
  assert.equal(result.value.confidence, 72);
  assert.equal(result.value.focus, 64);
  assert.equal(result.value.energy, 55);
  assert.equal(result.value.stress, 30);
  assert.equal(result.value.motivation, 81);
  assert.equal(result.value.note, null);
});

test("occurredAt defaults to now when not given", () => {
  const result = parseMoodEntryInput(valid, NOW);
  assert.ok(result.ok);
  assert.equal(result.value.occurredAt.toISOString(), NOW.toISOString());
});

test("a supplied occurredAt is kept", () => {
  const result = parseMoodEntryInput({ ...valid, occurredAt: "2026-09-28T06:30:00.000Z" }, NOW);
  assert.ok(result.ok);
  assert.equal(result.value.occurredAt.toISOString(), "2026-09-28T06:30:00.000Z");
});

test("an unparseable occurredAt is refused", () => {
  assert.match(expectError({ ...valid, occurredAt: "yesterday-ish" }), /occurredAt/);
});

test("a non-string occurredAt is refused without throwing — JSON can carry an object Date() cannot convert", () => {
  assert.match(expectError({ ...valid, occurredAt: { toString: null, valueOf: null } }), /occurredAt/);
  assert.match(expectError({ ...valid, occurredAt: 1727596800000 }), /occurredAt/);
});

test("the boundaries 0 and 100 are accepted", () => {
  const result = parseMoodEntryInput(
    { ...valid, confidence: 0, focus: 100, energy: 0, stress: 100, motivation: 0 },
    NOW,
  );
  assert.ok(result.ok);
});

for (const factor of MOOD_FACTORS) {
  test(`${factor} above 100 is refused`, () => {
    assert.match(expectError({ ...valid, [factor]: 101 }), new RegExp(factor));
  });
  test(`${factor} below 0 is refused`, () => {
    assert.match(expectError({ ...valid, [factor]: -1 }), new RegExp(factor));
  });
  test(`${factor} missing is refused`, () => {
    const body: Record<string, unknown> = { ...valid };
    delete body[factor];
    assert.match(expectError(body), new RegExp(factor));
  });
}

test("a fractional factor is refused", () => {
  assert.match(expectError({ ...valid, focus: 50.5 }), /focus/);
});

test("a numeric string is refused rather than coerced", () => {
  assert.match(expectError({ ...valid, energy: "60" }), /energy/);
});

test("NaN and Infinity are refused", () => {
  assert.match(expectError({ ...valid, stress: Number.NaN }), /stress/);
  assert.match(expectError({ ...valid, stress: Number.POSITIVE_INFINITY }), /stress/);
});

test("every sport-neutral context is accepted", () => {
  for (const context of MOOD_CONTEXTS) {
    assert.ok(parseMoodEntryInput({ ...valid, context }, NOW).ok, context);
  }
});

test("an unknown or sport-specific context is refused", () => {
  assert.match(expectError({ ...valid, context: "pre_round" }), /context/);
  assert.match(expectError({ ...valid, context: undefined }), /context/);
});

test("a note is trimmed, and a blank note is stored as null", () => {
  const withNote = parseMoodEntryInput({ ...valid, note: "  felt calm on the range  " }, NOW);
  assert.ok(withNote.ok);
  assert.equal(withNote.value.note, "felt calm on the range");

  const blank = parseMoodEntryInput({ ...valid, note: "   " }, NOW);
  assert.ok(blank.ok);
  assert.equal(blank.value.note, null);
});

test("a non-string or oversized note is refused", () => {
  assert.match(expectError({ ...valid, note: 42 }), /note/);
  assert.match(expectError({ ...valid, note: "x".repeat(1001) }), /note/);
});

test("a body that is not an object is refused", () => {
  expectError(null);
  expectError("confidence=70");
  expectError([valid]);
});

test("a userId in the body is ignored — ownership comes from the route, not the payload", () => {
  const result = parseMoodEntryInput({ ...valid, userId: 999 }, NOW);
  assert.ok(result.ok);
  assert.equal((result.value as Record<string, unknown>).userId, undefined);
});

// ── What FLO is told about the latest check-in ─────────────────────────
// A few factual lines inside the athlete memory pack. No interpretation, no
// sport wording: FLO sees the numbers the athlete gave and when.

const latest = {
  context: "pre_event" as const,
  occurredAt: new Date("2026-09-29T06:14:00.000Z"),
  confidence: 80,
  focus: 66,
  energy: 34,
  stress: 19,
  motivation: 89,
  note: null as string | null,
};

test("no check-in on record gives an empty string, so the pack omits the section", () => {
  assert.equal(describeLatestCheckInForFlo(undefined), "");
});

test("the latest check-in carries all five numbers exactly as rated", () => {
  const text = describeLatestCheckInForFlo(latest);
  assert.match(text, /confidence 80\b/);
  assert.match(text, /focus 66\b/);
  assert.match(text, /energy 34\b/);
  assert.match(text, /stress 19\b/);
  assert.match(text, /motivation 89\b/);
});

test("it says when and in what context, without naming a sport", () => {
  const text = describeLatestCheckInForFlo(latest);
  assert.match(text, /2026-09-29 06:14 UTC/);
  assert.match(text, /before an event/);
  assert.doesNotMatch(text, /round|golf|match|pre_event/i);
});

test("stress is flagged as higher = more stressed, so FLO does not read 19 as bad", () => {
  assert.match(describeLatestCheckInForFlo(latest), /stress 19 \(higher = more stressed\)/);
});

test("a note is quoted and trimmed to a sane length", () => {
  const text = describeLatestCheckInForFlo({ ...latest, note: `  ${"calm ".repeat(80)}  ` });
  const quoted = text.match(/Note: "([^"]*)"/);
  assert.ok(quoted, "note should be quoted");
  assert.ok(quoted[1].length <= 160, `note length ${quoted[1].length}`);
  assert.ok(!quoted[1].startsWith(" "));
});

test("it is a few lines, not a report", () => {
  const lines = describeLatestCheckInForFlo({ ...latest, note: "felt calm" }).split("\n");
  assert.ok(lines.length >= 2 && lines.length <= 4, `got ${lines.length} lines`);
  assert.match(lines[0], /^LATEST CHECK-IN/);
});
