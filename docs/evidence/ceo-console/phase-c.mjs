// CEO console — Phase C. FLO activity that is real.
//
// Proves the console's FLO numbers are counts rather than decoration: an
// athlete has one real conversation on production, and every KPI that claims
// to describe it moves by exactly the right amount. Then HQ opens the
// transcript and reads it back.
//
// Runs against production, not a local build.
//
// Credentials come from the environment so nothing is committed:
//   HQ_ADMIN_EMAIL / HQ_ADMIN_PW   an account with role=admin
//
// Usage: node docs/evidence/ceo-console/phase-c.mjs
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

const ATHLETE_EMAIL = `ceo-console-c-${Date.now()}@cerosity-test.invalid`;
// Distinctive enough that finding it in the HQ transcript proves the transcript
// is this athlete's real conversation and not a sample.
const ATHLETE_MESSAGE = `Marker ${Date.now()}: I go red before the first tee shot.`;

const results = [];
const record = (step, pass, detail) => {
  results.push({ step, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${step}\n      ${detail}`);
};
const shot = async (page, name) => {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  return `${name}.png`;
};

const adminGet = (page, path) =>
  page.evaluate(async (p) => {
    const r = await fetch(p, { credentials: "include" });
    return { status: r.status, body: await r.json() };
  }, path);

async function main() {
  const browser = await chromium.launch();
  const hqCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const hq = await hqCtx.newPage();

  // ── 1. Sign in to HQ ────────────────────────────────────────────
  await hq.goto(`${HQ}/console/login`, { waitUntil: "domcontentloaded" });
  await hq.fill('input[type="email"]', ADMIN_EMAIL);
  await hq.fill('input[type="password"]', ADMIN_PW);
  await hq.click('button[type="submit"]');
  await hq.waitForFunction(() => document.body.innerText.includes("Command Center"), null, { timeout: 30000 });
  record("HQ login as admin", !hq.url().endsWith("/console/login"), `landed on ${hq.url()}`);

  // ── 2. The fake pages are gone from the nav ──────────────────────
  const navText = await hq.locator("nav").innerText();
  record(
    "fake pages are not in the HQ nav",
    !navText.includes("Analytics") && !navText.includes("Coaching Data"),
    `nav items: ${navText.split("\n").map((s) => s.trim()).filter(Boolean).join(", ")}`
  );

  // ── 3. Every Command Center KPI is backed by a real number ───────
  const statsBefore = (await adminGet(hq, "/api/admin/stats")).body;
  const KPI_KEYS = [
    "totalUsers", "freeUsers", "premiumUsers", "ultimateUsers", "activeSubscriptions",
    "totalChatSessions", "floChatsToday", "avgMessagesPerSession", "activeChatters7d",
    "assessmentsToday", "dailyCheckIns",
  ];
  const missing = KPI_KEYS.filter((k) => typeof statsBefore[k] !== "number");
  record(
    "every Command Center KPI key exists in /api/admin/stats",
    missing.length === 0,
    missing.length
      ? `missing or non-numeric: ${missing.join(", ")}`
      : `all ${KPI_KEYS.length} keys numeric — sessions ${statsBefore.totalChatSessions}, chatters7d ${statsBefore.activeChatters7d}`
  );
  await hq.goto(`${HQ}/console`, { waitUntil: "domcontentloaded" });
  await hq.waitForFunction(() => document.body.innerText.includes("TOTAL CHAT SESSIONS"), null, { timeout: 30000 });
  await shot(hq, "c01-command-center-real-kpis");

  // ── 4. Give one athlete one real conversation ────────────────────
  const created = await hq.evaluate(async (email) => {
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, firstName: "Chat", lastName: "Athlete", subscriptionTier: "flo", isSubscribed: true }),
    });
    return { status: r.status, body: await r.json() };
  }, ATHLETE_EMAIL);
  const athleteId = created.body.id;

  const athleteCtx = await browser.newContext();
  await athleteCtx.request.post(`${APP}/api/auth/login`, {
    data: { email: ATHLETE_EMAIL, password: created.body.tempPassword },
  });
  const chat = await athleteCtx.request.post(`${APP}/api/chat`, {
    data: { message: ATHLETE_MESSAGE },
    timeout: 60000,
  });
  const chatBody = await chat.json();
  // /api/chat answers { session, response: { message, ... }, limitations }.
  const floReply = chatBody.response?.message ?? "";
  record(
    "athlete has a real FLO conversation",
    chat.ok() && floReply.length > 0,
    `POST /api/chat ${chat.status()}, FLO replied ${floReply.length} chars, session ${chatBody.session?.id}`
  );
  await athleteCtx.close();

  // ── 5. The KPIs moved by exactly one conversation ────────────────
  const statsAfter = (await adminGet(hq, "/api/admin/stats")).body;
  record(
    "FLO KPIs move with the real session",
    statsAfter.totalChatSessions === statsBefore.totalChatSessions + 1
      && statsAfter.floChatsToday === statsBefore.floChatsToday + 1
      && statsAfter.activeChatters7d === statsBefore.activeChatters7d + 1,
    `sessions ${statsBefore.totalChatSessions}->${statsAfter.totalChatSessions}, today ${statsBefore.floChatsToday}->${statsAfter.floChatsToday}, chatters7d ${statsBefore.activeChatters7d}->${statsAfter.activeChatters7d}`
  );

  // ── 6. HQ opens the transcript and reads it ──────────────────────
  const sessions = (await adminGet(hq, `/api/admin/users/${athleteId}/chat-sessions`)).body;
  const sessionId = sessions.sessions[0].id;
  const transcript = (await adminGet(hq, `/api/admin/chat-sessions/${sessionId}`)).body;
  record(
    "admin transcript endpoint returns the real messages",
    transcript.messages.some((m) => m.content.includes(ATHLETE_MESSAGE))
      && transcript.messages.some((m) => m.role !== "user"),
    `session ${sessionId}, ${transcript.messageCount} messages, athlete marker present`
  );

  await hq.goto(`${HQ}/console/flo`, { waitUntil: "domcontentloaded" });
  await hq.waitForFunction(() => document.body.innerText.includes("Users by FLO Usage"), null, { timeout: 30000 });
  await hq.getByRole("row", { name: new RegExp(ATHLETE_EMAIL) }).getByRole("button", { name: "View" }).click();
  await hq.waitForSelector(`[data-testid="session-${sessionId}"]`, { timeout: 30000 });
  await hq.click(`[data-testid="session-${sessionId}"]`);
  await hq.waitForSelector('[data-testid="transcript"]', { timeout: 30000 });
  await hq.waitForFunction(
    (marker) => document.querySelector('[data-testid="transcript"]')?.textContent?.includes(marker) ?? false,
    ATHLETE_MESSAGE,
    { timeout: 30000 }
  );
  const transcriptText = await hq.locator('[data-testid="transcript"]').innerText();
  const transcriptShot = await shot(hq, "c02-hq-transcript");
  record(
    "HQ renders the transcript in the console",
    transcriptText.includes(ATHLETE_MESSAGE) && transcriptText.includes("FLO"),
    `transcript shows the athlete marker and FLO's reply (screenshot ${transcriptShot})`
  );

  await hq.goto(`${HQ}/console/flo`, { waitUntil: "domcontentloaded" });
  await hq.waitForFunction(() => document.body.innerText.includes("Users by FLO Usage"), null, { timeout: 30000 });
  await shot(hq, "c03-flo-chat-kpis");

  // ── 7. Transcripts are admin-only ────────────────────────────────
  const anonCtx = await browser.newContext();
  const anon = await anonCtx.request.get(`${APP}/api/admin/chat-sessions/${sessionId}`);
  const studentCtx = await browser.newContext();
  await studentCtx.request.post(`${APP}/api/auth/login`, {
    data: { email: ATHLETE_EMAIL, password: created.body.tempPassword },
  });
  const asStudent = await studentCtx.request.get(`${APP}/api/admin/chat-sessions/${sessionId}`);
  record(
    "transcripts are admin-only",
    anon.status() === 401 && asStudent.status() === 403,
    `anonymous ${anon.status()}, the athlete themselves ${asStudent.status()}`
  );
  await anonCtx.close();
  await studentCtx.close();

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  writeFileSync(
    join(OUT, "phase-c-results.json"),
    JSON.stringify(
      { phase: "C", ranAt: new Date().toISOString(), app: APP, hq: HQ, athlete: ATHLETE_EMAIL, passed, total: results.length, results },
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
