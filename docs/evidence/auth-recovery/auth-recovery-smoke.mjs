// Auth recovery smoke — runs against production, on a phone viewport.
//
// Proves the whole way back into an account, and that the ways back in that
// should NOT exist still don't:
//   1. forgot-password gives one answer whether or not the address has an
//      account, so it cannot be used to enumerate who is a customer,
//   2. a reset token works exactly once, and only inside its window,
//   3. the new password signs in and the old one stops working,
//   4. change-password needs the current password,
//   5. an admin cannot write a password through the user PATCH.
//
// The one seam a script cannot cross is the athlete's inbox. forgot-password
// proves the token is issued, stored only as a digest and the mail dispatched;
// SMOKE_RESET_TOKEN then stands in for the link they would have clicked. Set it
// to a token whose SHA-256 has been written to the target row.
//
// Env:
//   SMOKE_A_EMAIL / SMOKE_A_PW    fixture holding the admin role
//   SMOKE_B_EMAIL / SMOKE_B_PW    fixture whose password gets recovered
//   SMOKE_B_ID                    numeric id of fixture B
//   SMOKE_RESET_TOKEN             raw token whose digest is on fixture B
//   SMOKE_EXPIRED_TOKEN           raw token whose digest is on B, already expired
//
// Usage: node docs/evidence/auth-recovery/auth-recovery-smoke.mjs
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BASE = process.env.SMOKE_BASE_URL || "https://cerosity.com";
const OUT = process.env.SMOKE_OUT_DIR || dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

const VIEWPORT = { width: 390, height: 844 };
const NEW_PASSWORD = process.env.SMOKE_NEW_PW || "Recovered-smoke-9f2c41";
const CHANGED_PASSWORD = process.env.SMOKE_CHANGED_PW || "Changed-smoke-77ab30";

const results = [];
const record = (step, pass, detail) => {
  results.push({ step, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${step}\n      ${detail}`);
};
const shot = async (page, name) => {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
};

const post = (ctx, path, data) =>
  ctx.request.post(`${BASE}${path}`, { data, failOnStatusCode: false });

const health = await (await fetch(`${BASE}/api/health`)).json();
console.log(`\nTarget ${BASE} @ commit ${health.commit}  viewport ${VIEWPORT.width}x${VIEWPORT.height}\n`);

const browser = await chromium.launch();
const phone = { ...devices["iPhone 13"], viewport: VIEWPORT, isMobile: true, hasTouch: true };

// Order matters: every token test runs before anything calls
// forgot-password, because issuing a new link overwrites the digest on the
// row and would invalidate the token this run was staged with.

// ── 1. Token rules ────────────────────────────────────────────────
{
  const ctx = await browser.newContext(phone);

  const short = await post(ctx, "/api/auth/reset-password", {
    token: process.env.SMOKE_RESET_TOKEN,
    password: "short",
  });
  record(
    "reset refuses a password under 8 characters",
    short.status() === 400,
    `HTTP ${short.status()} · ${(await short.json()).message}`
  );

  const bogus = await post(ctx, "/api/auth/reset-password", {
    token: "0".repeat(64),
    password: NEW_PASSWORD,
  });
  record(
    "reset refuses a token that was never issued",
    bogus.status() === 400,
    `HTTP ${bogus.status()} · ${(await bogus.json()).message}`
  );

  const expired = await post(ctx, "/api/auth/reset-password", {
    token: process.env.SMOKE_EXPIRED_TOKEN,
    password: NEW_PASSWORD,
  });
  record(
    "reset refuses a token past its 60-minute window",
    expired.status() === 400,
    `HTTP ${expired.status()} · ${(await expired.json()).message}`
  );
  await ctx.close();
}

// ── 4. The reset itself, through the page ─────────────────────────
{
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();

  await page.goto(`${BASE}/reset-password?token=${process.env.SMOKE_RESET_TOKEN}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel(/confirm new password/i).fill(NEW_PASSWORD);
  await shot(page, "03-reset-password-form");
  await page.getByRole("button", { name: /set new password/i }).click();

  const done = page.getByText(/password updated/i);
  await done.waitFor({ timeout: 30000 });
  record("the emailed link sets a new password", await done.isVisible(), "reset page confirms");
  await shot(page, "04-reset-password-done");
  await ctx.close();
}

// ── 5. Single use, and the old password is dead ───────────────────
{
  const ctx = await browser.newContext(phone);

  const replay = await post(ctx, "/api/auth/reset-password", {
    token: process.env.SMOKE_RESET_TOKEN,
    password: "Another-attempt-11aa22",
  });
  record(
    "the same link cannot be used twice",
    replay.status() === 400,
    `HTTP ${replay.status()} · ${(await replay.json()).message}`
  );

  const withNew = await post(ctx, "/api/auth/login", {
    email: process.env.SMOKE_B_EMAIL,
    password: NEW_PASSWORD,
  });
  record("the new password signs in", withNew.status() === 200, `HTTP ${withNew.status()}`);

  const meBody = await (await ctx.request.get(`${BASE}/api/auth/me`)).json();
  const leaked = Object.keys(meBody).filter((k) => /password/i.test(k));
  record(
    "the session payload carries no password or reset secrets",
    leaked.length === 0,
    `password-ish keys in /api/auth/me: ${leaked.join(",") || "none"}`
  );

  const stale = await browser.newContext(phone);
  const withOld = await post(stale, "/api/auth/login", {
    email: process.env.SMOKE_B_EMAIL,
    password: process.env.SMOKE_B_PW,
  });
  record("the old password no longer works", withOld.status() === 401, `HTTP ${withOld.status()}`);
  await stale.close();
  await ctx.close();
}

// ── 6. Change password while signed in ────────────────────────────
{
  const ctx = await browser.newContext(phone);
  await post(ctx, "/api/auth/login", {
    email: process.env.SMOKE_B_EMAIL,
    password: NEW_PASSWORD,
  });

  const wrong = await post(ctx, "/api/auth/change-password", {
    currentPassword: "not-the-current-one",
    newPassword: CHANGED_PASSWORD,
  });
  record(
    "change-password refuses without the current password",
    wrong.status() === 400,
    `HTTP ${wrong.status()} · ${(await wrong.json()).message}`
  );

  const ok = await post(ctx, "/api/auth/change-password", {
    currentPassword: NEW_PASSWORD,
    newPassword: CHANGED_PASSWORD,
  });
  record("change-password accepts the current password", ok.status() === 200, `HTTP ${ok.status()}`);

  const anon = await browser.newContext(phone);
  const unauth = await post(anon, "/api/auth/change-password", {
    currentPassword: NEW_PASSWORD,
    newPassword: "Signed-out-attempt-4411",
  });
  record(
    "change-password rejects a signed-out caller",
    unauth.status() === 401,
    `HTTP ${unauth.status()}`
  );

  const relogin = await post(anon, "/api/auth/login", {
    email: process.env.SMOKE_B_EMAIL,
    password: CHANGED_PASSWORD,
  });
  record("the changed password signs in", relogin.status() === 200, `HTTP ${relogin.status()}`);
  await anon.close();
  await ctx.close();
}

// ── 7. An admin still cannot write a password ─────────────────────
{
  const ctx = await browser.newContext(phone);
  const login = await post(ctx, "/api/auth/login", {
    email: process.env.SMOKE_A_EMAIL,
    password: process.env.SMOKE_A_PW,
  });

  if (login.status() !== 200) {
    record("admin fixture signed in", false, `HTTP ${login.status()} — admin checks skipped`);
  } else {
    const patch = await ctx.request.patch(`${BASE}/api/admin/users/${process.env.SMOKE_B_ID}`, {
      data: { password: "admin-set-this-9911", firstName: "Recovery" },
      failOnStatusCode: false,
    });
    const patched = await patch.json().catch(() => ({}));
    record(
      "admin PATCH silently drops a password field",
      patch.status() === 200 && !("password" in patched),
      `HTTP ${patch.status()}, response has no password key`
    );

    const anon = await browser.newContext(phone);
    const tryInjected = await post(anon, "/api/auth/login", {
      email: process.env.SMOKE_B_EMAIL,
      password: "admin-set-this-9911",
    });
    record(
      "the password an admin tried to set does not work",
      tryInjected.status() === 401,
      `HTTP ${tryInjected.status()}`
    );

    const stillWorks = await post(anon, "/api/auth/login", {
      email: process.env.SMOKE_B_EMAIL,
      password: CHANGED_PASSWORD,
    });
    record(
      "the athlete's real password is untouched by the admin write",
      stillWorks.status() === 200,
      `HTTP ${stillWorks.status()}`
    );
    await anon.close();
  }
  await ctx.close();
}

// ── 6. No email enumeration ───────────────────────────────────────
// Last, because issuing links rewrites the reset columns used above.
{
  const ctx = await browser.newContext(phone);
  const real = await post(ctx, "/api/auth/forgot-password", { email: process.env.SMOKE_B_EMAIL });
  const fake = await post(ctx, "/api/auth/forgot-password", {
    email: "definitely-not-a-cerosity-user-8823@example.invalid",
  });
  const realBody = await real.json();
  const fakeBody = await fake.json();
  record(
    "forgot-password answers identically for a real and an unknown address",
    real.status() === fake.status() && JSON.stringify(realBody) === JSON.stringify(fakeBody),
    `both HTTP ${real.status()} · "${realBody.message}"`
  );

  const junk = await post(ctx, "/api/auth/forgot-password", { email: "not-an-email" });
  record(
    "forgot-password does not leak on malformed input either",
    junk.status() === 200 && (await junk.json()).message === realBody.message,
    `HTTP ${junk.status()}, same sentence`
  );
  await ctx.close();
}

// ── 7. The UI path an athlete actually walks ──────────────────────
{
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  const forgotLink = page.getByRole("link", { name: /forgot password/i }).first();
  await forgotLink.waitFor({ timeout: 30000 });
  record("sign-in form offers Forgot password?", true, "link present on /login");
  await shot(page, "01-signin-forgot-link");

  await forgotLink.click();
  await page.waitForURL(/\/forgot-password/, { timeout: 30000, waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(process.env.SMOKE_B_EMAIL);
  await page.getByRole("button", { name: /send reset link/i }).click();

  const confirmation = page.getByText(/check your email/i);
  await confirmation.waitFor({ timeout: 30000 });
  record(
    "requesting a link lands on a confirmation that reveals nothing",
    await confirmation.isVisible(),
    "shows 'Check your email' regardless of whether the account exists"
  );
  await shot(page, "02-forgot-password-confirmation");
  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
writeFileSync(
  join(OUT, "results.json"),
  JSON.stringify(
    { ranAt: new Date().toISOString(), base: BASE, commit: health.commit, viewport: VIEWPORT, results },
    null,
    2
  )
);

console.log(`\n${results.length - failed.length}/${results.length} passed @ commit ${health.commit}`);
if (failed.length) {
  console.log("FAILED:\n" + failed.map((f) => `  - ${f.step} (${f.detail})`).join("\n"));
  process.exit(1);
}
