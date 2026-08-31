/**
 * Addresses are compared case-insensitively: an athlete typing sarah@… must reach
 * the same account as Sarah@…. Run: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail } from "./email-address";

test("an address is lowercased", () => {
  assert.equal(normalizeEmail("Sarah.Guerra1981@Gmail.com"), "sarah.guerra1981@gmail.com");
});

test("surrounding whitespace is trimmed", () => {
  assert.equal(normalizeEmail("  andrew.hurt5@gmail.com \n"), "andrew.hurt5@gmail.com");
});

test("an already-normal address is unchanged", () => {
  assert.equal(normalizeEmail("andrew.hurt5@gmail.com"), "andrew.hurt5@gmail.com");
});

test("a missing or non-string value normalises to an empty string", () => {
  assert.equal(normalizeEmail(undefined), "");
  assert.equal(normalizeEmail(null), "");
  assert.equal(normalizeEmail(42 as unknown as string), "");
});
