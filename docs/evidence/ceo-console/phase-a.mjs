// CEO console — Phase A. Provision an athlete from HQ and grant a paid tier
// without Stripe, then prove the athlete actually gets the curriculum.
//
// Runs against production, not a local build. Desktop viewport: HQ is a
// desktop console.
//
// Credentials come from the environment so nothing is committed:
//   HQ_ADMIN_EMAIL / HQ_ADMIN_PW   an account with role=admin
//
// Usage: node docs/evidence/ceo-console/phase-a.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const APP = process.env.SMOKE_BASE_URL || "https://cerosity.com";
const HQ = process.env.SMOKE_HQ_URL || "https://hq.cerosity.com";
// SMOKE_OUT_DIR lets the script run from a directory where playwright is
// installed while still writing its evidence back into the repo.
const OUT = process.env.SMOKE_OUT_DIR || dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

const ADMIN_EMAIL = process.env.HQ_ADMIN_EMAIL;
const ADMIN_PW = process.env.HQ_ADMIN_PW;
if (!ADMIN_EMAIL || !ADMIN_PW) {
  console.error("Set HQ_ADMIN_EMAIL and HQ_ADMIN_PW");
  process.exit(2);
}

const stamp = Date.now();
const ATHLETE_EMAIL = `ceo-console-${stamp}@cerosity-test.invalid`;

const results = [];
const record = (step, pass, detail) => {
  results.push({ step, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${step}\n      ${detail}`);
};
const shot = async (page, name) => {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  return `${name}.png`;
};

/** Read a user row back through the admin API, from an authenticated HQ page. */
const adminLookup = (page, email) =>
  page.evaluate(async (target) => {
    const r = await fetch("/api/admin/users", { credentials: "include" });
    const all = await r.json();
    return all.find((u) => u.email === target) ?? null;
  }, email);

async function main() {
  const browser = await chromium.launch();
  const hqCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const hq = await hqCtx.newPage();

  // ── 1. Sign in to HQ ────────────────────────────────────────────
  await hq.goto(`${HQ}/console/login`, { waitUntil: "domcontentloaded" });
  await hq.fill('input[type="email"]', ADMIN_EMAIL);
  await hq.fill('input[type="password"]', ADMIN_PW);
  await hq.click('button[type="submit"]');
  // Wait for nav text only the authenticated layout renders. Waiting on the URL
  // is useless here — /console/login already matches /console.
  await hq.waitForFunction(() => document.body.innerText.includes("Command Center"), null, { timeout: 30000 });
  record("HQ login as admin", !hq.url().endsWith("/console/login"), `landed on ${hq.url()}`);

  // ── 2. Create an athlete, free tier, no Stripe ───────────────────
  await hq.goto(`${HQ}/console/users`, { waitUntil: "domcontentloaded" });
  await hq.getByRole("button", { name: "New athlete" }).waitFor({ timeout: 30000 });
  await hq.getByRole("button", { name: "New athlete" }).click();
  await hq.fill("#new-email", ATHLETE_EMAIL);
  await hq.fill("#new-first", "Console");
  await hq.fill("#new-last", "Athlete");
  await hq.selectOption("#new-tier", "free");
  const createShot = await shot(hq, "01-hq-new-athlete-form");

  await hq.getByRole("button", { name: "Create athlete" }).click();
  await hq.waitForSelector('[data-testid="temp-password"]', { timeout: 20000 });
  const tempPassword = (await hq.locator('[data-testid="temp-password"]').innerText()).trim();
  record(
    "HQ creates athlete with generated temp password",
    tempPassword.length >= 8,
    `${ATHLETE_EMAIL}, temp password ${tempPassword.length} chars (screenshot ${createShot})`
  );
  await shot(hq, "02-hq-athlete-created");
  await hq.getByRole("button", { name: "Done" }).click();

  // Creation must never grant entitlement, whatever the form asked for.
  const asCreated = await adminLookup(hq, ATHLETE_EMAIL);
  record(
    "created athlete starts free/student",
    !!asCreated && asCreated.subscriptionTier === "free" && asCreated.role === "student" && asCreated.isSubscribed === false,
    JSON.stringify({ tier: asCreated?.subscriptionTier, role: asCreated?.role, subscribed: asCreated?.isSubscribed })
  );

  // The admin list must not hand out bcrypt hashes.
  record(
    "GET /api/admin/users withholds the password hash",
    asCreated !== null && asCreated.password === undefined,
    `password field on the returned row: ${asCreated ? typeof asCreated.password : "no row"}`
  );

  // ── 3. Free athlete cannot see the curriculum yet ────────────────
  const freeCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const freeLogin = await freeCtx.request.post(`${APP}/api/auth/login`, {
    data: { email: ATHLETE_EMAIL, password: tempPassword },
  });
  const beforeGrant = freeLogin.ok()
    ? await (await freeCtx.request.get(`${APP}/api/learn/courses/red2blue-foundation`)).json()
    : null;
  const lessonsBefore = beforeGrant ? beforeGrant.modules.flatMap((m) => m.lessons) : [];
  const lockedBefore = lessonsBefore.filter((l) => l.locked).length;
  record(
    "temp password works and free athlete sees a locked curriculum",
    freeLogin.ok() && beforeGrant?.hasAccess === false && lockedBefore > 0,
    `login ${freeLogin.status()}, hasAccess=${beforeGrant?.hasAccess}, ${lockedBefore}/${lessonsBefore.length} lessons locked`
  );
  await freeCtx.close();

  // ── 4. Grant ultimate from the HQ drawer ─────────────────────────
  await hq.reload({ waitUntil: "domcontentloaded" });
  await hq.fill('input[placeholder="Search email or username..."]', ATHLETE_EMAIL);
  await hq.getByRole("cell", { name: ATHLETE_EMAIL }).click();
  await hq.waitForSelector("#drawer-tier");
  await hq.selectOption("#drawer-tier", "ultimate");
  await hq.getByRole("button", { name: "Save entitlement" }).click();
  await hq.waitForSelector("text=Saved", { timeout: 20000 });
  const grantShot = await shot(hq, "03-hq-granted-ultimate");

  const afterGrant = await adminLookup(hq, ATHLETE_EMAIL);
  record(
    "HQ drawer grants ultimate without Stripe",
    afterGrant?.subscriptionTier === "ultimate" && afterGrant?.isSubscribed === true && !afterGrant?.stripeCustomerId,
    `tier=${afterGrant?.subscriptionTier}, subscribed=${afterGrant?.isSubscribed}, stripeCustomerId=${afterGrant?.stripeCustomerId} (screenshot ${grantShot})`
  );

  // ── 5. The grant is real: athlete logs in and the curriculum unlocks ──
  const ultCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ultLogin = await ultCtx.request.post(`${APP}/api/auth/login`, {
    data: { email: ATHLETE_EMAIL, password: tempPassword },
  });
  const course = await (await ultCtx.request.get(`${APP}/api/learn/courses/red2blue-foundation`)).json();
  const lessons = course.modules.flatMap((m) => m.lessons);
  const lockedAfter = lessons.filter((l) => l.locked).length;
  record(
    "granted athlete gets the full curriculum",
    ultLogin.ok() && course.hasAccess === true && lockedAfter === 0 && lessons.length > 2,
    `hasAccess=${course.hasAccess}, ${lessons.length - lockedAfter}/${lessons.length} lessons unlocked (was ${lessonsBefore.length - lockedBefore}/${lessonsBefore.length})`
  );

  const athlete = await ultCtx.newPage();
  await athlete.goto(`${APP}/learn`, { waitUntil: "domcontentloaded" });
  // Wait for real content, not for the loading text to clear: the course fetch
  // starts several seconds after DOMContentLoaded, so "not loading" is briefly
  // true before the page has even asked for anything.
  await athlete.waitForFunction(
    () => document.body.innerText.includes("Your progress"),
    null,
    { timeout: 45000 }
  );
  await athlete.waitForTimeout(1000);
  await shot(athlete, "04-athlete-curriculum-unlocked");

  // ── 6. The allowlist holds: no password or Stripe id through PATCH ──
  const injection = await hq.evaluate(async (id) => {
    const r = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        password: "plaintext-should-be-ignored",
        stripeCustomerId: "cus_forged",
        subscriptionTier: "ultimate",
      }),
    });
    return { status: r.status, body: await r.json() };
  }, afterGrant.id);
  const stillValid = await ultCtx.request.post(`${APP}/api/auth/login`, {
    data: { email: ATHLETE_EMAIL, password: tempPassword },
  });
  record(
    "PATCH allowlist drops password and stripeCustomerId",
    injection.status === 200 && !injection.body.stripeCustomerId && stillValid.ok(),
    `PATCH ${injection.status}, stripeCustomerId=${injection.body.stripeCustomerId}, original password still valid (${stillValid.status()})`
  );

  // An unknown tier must be refused rather than written through.
  const badTier = await hq.evaluate(async (id) => {
    const r = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ subscriptionTier: "godmode" }),
    });
    return { status: r.status, body: await r.json() };
  }, afterGrant.id);
  record(
    "unknown tier is rejected",
    badTier.status === 400,
    `PATCH subscriptionTier=godmode -> ${badTier.status} ${badTier.body?.message ?? ""}`
  );

  await ultCtx.close();
  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  writeFileSync(
    join(OUT, "results.json"),
    JSON.stringify(
      { phase: "A", ranAt: new Date().toISOString(), app: APP, hq: HQ, athlete: ATHLETE_EMAIL, passed, total: results.length, results },
      null,
      2
    )
  );
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
