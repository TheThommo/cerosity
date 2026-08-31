/**
 * The apex domain 404s on every deep link — only the bare root redirects, and it
 * redirects to http. Emailed links must therefore never use it.
 * Run: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAppBaseUrl, passwordResetUrl, DEFAULT_APP_BASE_URL } from "./app-urls";

test("with nothing configured the base URL is the www host", () => {
  assert.equal(resolveAppBaseUrl(undefined), "https://www.cerosity.com");
  assert.equal(DEFAULT_APP_BASE_URL, "https://www.cerosity.com");
});

test("an empty or whitespace-only setting falls back to the default", () => {
  assert.equal(resolveAppBaseUrl(""), "https://www.cerosity.com");
  assert.equal(resolveAppBaseUrl("   "), "https://www.cerosity.com");
  assert.equal(resolveAppBaseUrl(null), "https://www.cerosity.com");
});

test("the apex domain is upgraded to www, because apex deep links 404", () => {
  assert.equal(resolveAppBaseUrl("https://cerosity.com"), "https://www.cerosity.com");
  assert.equal(resolveAppBaseUrl("http://cerosity.com"), "https://www.cerosity.com");
  assert.equal(resolveAppBaseUrl("https://cerosity.com/"), "https://www.cerosity.com");
});

test("a deliberate non-apex host is left alone", () => {
  assert.equal(resolveAppBaseUrl("http://localhost:5000"), "http://localhost:5000");
  assert.equal(resolveAppBaseUrl("https://staging.cerosity.com"), "https://staging.cerosity.com");
});

test("trailing slashes are stripped so links never double up", () => {
  assert.equal(resolveAppBaseUrl("https://www.cerosity.com///"), "https://www.cerosity.com");
});

test("an unparseable setting falls back rather than emitting a broken link", () => {
  assert.equal(resolveAppBaseUrl("not a url"), "https://www.cerosity.com");
});

test("the reset link points at the www host and carries the token", () => {
  assert.equal(
    passwordResetUrl("abc123"),
    "https://www.cerosity.com/reset-password?token=abc123"
  );
});

test("the reset link uses www even when the apex is configured", () => {
  assert.equal(
    passwordResetUrl("abc123", "https://cerosity.com"),
    "https://www.cerosity.com/reset-password?token=abc123"
  );
});

test("a token with URL-significant characters is encoded", () => {
  assert.equal(
    passwordResetUrl("a+b/c=d", "https://www.cerosity.com"),
    "https://www.cerosity.com/reset-password?token=a%2Bb%2Fc%3Dd"
  );
});
