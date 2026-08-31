/**
 * Unit tests for LMS sequential unlock rules.
 * Run: npx tsx --test shared/lms-access.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAccessibleLessonIds,
  isLessonAccessible,
  hasCompletedCourse,
  type AccessLesson,
} from "./lms-access";

const FREE = { subscriptionTier: "free", role: "user" };
const PAID = { subscriptionTier: "premium", role: "user" };

/** 4 lessons: index 0 and 1 are free previews, 2 and 3 are paid-only. */
const lessons: AccessLesson[] = [
  { id: 10, isFreePreview: true },
  { id: 11, isFreePreview: true },
  { id: 12, isFreePreview: false },
  { id: 13, isFreePreview: false },
];

const ids = (set: Set<number>) => [...set].sort((a, b) => a - b);

test("free user: only free-preview lessons are accessible", () => {
  assert.deepEqual(ids(computeAccessibleLessonIds(FREE, lessons, [])), [10, 11]);
});

test("free user: completing a preview does not unlock the next non-preview", () => {
  const open = computeAccessibleLessonIds(FREE, lessons, [10, 11]);
  assert.equal(open.has(12), false);
  assert.deepEqual(ids(open), [10, 11]);
});

test("paid user with no progress: only the first lesson is unlocked", () => {
  assert.deepEqual(ids(computeAccessibleLessonIds(PAID, lessons, [])), [10]);
});

test("paid user who completed lesson 0: lesson 1 unlocks, lesson 2 stays locked", () => {
  const open = computeAccessibleLessonIds(PAID, lessons, [10]);
  assert.equal(open.has(11), true);
  assert.equal(open.has(12), false);
});

test("paid user gap: lesson 2 stays locked while lesson 1 is incomplete", () => {
  const open = computeAccessibleLessonIds(PAID, lessons, [10]);
  assert.equal(open.has(12), false);
  assert.equal(isLessonAccessible(PAID, lessons, [10], 12), false);
});

test("paid user: isFreePreview does not bypass the sequential rule", () => {
  // Lesson 11 is a free preview but its predecessor is not complete.
  assert.equal(isLessonAccessible(PAID, lessons, [], 11), false);
});

test("paid user: a lesson already completed stays accessible even if an earlier one is not", () => {
  // Legacy all-open-era history: lesson 12 completed while lesson 11 never was.
  const open = computeAccessibleLessonIds(PAID, lessons, [12]);
  assert.equal(open.has(12), true);
  // And its successor unlocks, because its predecessor is complete.
  assert.equal(open.has(13), true);
  // But the still-incomplete gap remains locked.
  assert.equal(open.has(11), false);
});

test("unknown lesson id is never accessible", () => {
  assert.equal(isLessonAccessible(PAID, lessons, [10, 11, 12, 13], 999), false);
});

test("certificate: not earned while any course lesson is incomplete", () => {
  assert.equal(hasCompletedCourse(PAID, lessons, [10, 11, 12]), false);
});

test("certificate: earned when an entitled user has completed every lesson", () => {
  assert.equal(hasCompletedCourse(PAID, lessons, [10, 11, 12, 13]), true);
});

test("certificate: never earned without the curriculum entitlement", () => {
  assert.equal(hasCompletedCourse(FREE, lessons, [10, 11, 12, 13]), false);
});
