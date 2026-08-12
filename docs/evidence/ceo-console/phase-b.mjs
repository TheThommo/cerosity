// CEO console — Phase B. LMS progress in HQ.
//
// Proves the Curriculum view reflects real lesson_progress rows: an athlete
// completes one lesson on production and HQ moves from 0/23 to 1/23, with the
// aggregate take-up counters moving too.
//
// Runs against production, not a local build.
//
// Credentials come from the environment so nothing is committed:
//   HQ_ADMIN_EMAIL / HQ_ADMIN_PW   an account with role=admin
//
// Usage: node docs/evidence/ceo-console/phase-b.mjs
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

const COURSE = "red2blue-foundation";
const ATHLETE_EMAIL = `ceo-console-b-${Date.now()}@cerosity-test.invalid`;

const results = [];
const record = (step, pass, detail) => {
  results.push({ step, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${step}\n      ${detail}`);
};
const shot = async (page, name) => {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  return `${name}.png`;
};

/** Call an admin endpoint from inside the authenticated HQ page. */
const adminGet = (page, path) =>
  page.evaluate(async (p) => {
    const r = await fetch(p, { credentials: "include" });
    return { status: r.status, body: await r.json() };
  }, path);

/** Open the Curriculum page and select one athlete by email. */
async function openAthlete(hq, email) {
  await hq.waitForFunction(() => document.body.innerText.includes("ATHLETES STARTED"), null, { timeout: 30000 });
  await hq.fill('input[placeholder="Search athletes..."]', email);
  await hq.getByRole("button", { name: email }).click();
  await hq.waitForSelector(`[data-testid="progress-${COURSE}"]`, { timeout: 30000 });
  return hq.locator(`[data-testid="progress-${COURSE}"]`).innerText();
}

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

  // Baseline take-up, before this run adds anything.
  const summaryBefore = (await adminGet(hq, "/api/admin/curriculum/summary")).body;
  const courseBefore = summaryBefore.find((c) => c.slug === COURSE);
  record(
    "curriculum summary returns real course totals",
    !!courseBefore && courseBefore.lessonCount > 0,
    `${courseBefore?.title}: ${courseBefore?.lessonCount} lessons, ${courseBefore?.athletesStarted} started, ${courseBefore?.athletesCompleted} completed, ${courseBefore?.certificatesIssued} certificates`
  );

  // ── 2. Provision a granted athlete through the Phase A path ──────
  const created = await hq.evaluate(async (email) => {
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email,
        firstName: "Progress",
        lastName: "Athlete",
        subscriptionTier: "ultimate",
        isSubscribed: true,
      }),
    });
    return { status: r.status, body: await r.json() };
  }, ATHLETE_EMAIL);
  record(
    "HQ provisions a granted athlete",
    created.status === 201 && created.body.subscriptionTier === "ultimate",
    `${created.status}, id=${created.body.id}, tier=${created.body.subscriptionTier}`
  );
  const athleteId = created.body.id;
  const tempPassword = created.body.tempPassword;

  // ── 3. HQ shows the athlete at zero ──────────────────────────────
  const zero = (await adminGet(hq, `/api/admin/users/${athleteId}/curriculum`)).body;
  const zeroCourse = zero.courses.find((c) => c.slug === COURSE);
  record(
    "new athlete starts at zero completed lessons",
    zeroCourse.completed === 0 && zeroCourse.total > 0 && zeroCourse.lessons.every((l) => l.status === "not_started"),
    `${zeroCourse.completed} of ${zeroCourse.total}, ${zeroCourse.percent}%`
  );

  await hq.goto(`${HQ}/console/curriculum`, { waitUntil: "domcontentloaded" });
  const beforeText = await openAthlete(hq, ATHLETE_EMAIL);
  const beforeShot = await shot(hq, "b01-hq-curriculum-zero");
  record(
    "HQ Curriculum page renders the athlete at zero",
    beforeText.startsWith("0 of"),
    `"${beforeText}" (screenshot ${beforeShot})`
  );

  // ── 4. The athlete completes one lesson ──────────────────────────
  const athleteCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const login = await athleteCtx.request.post(`${APP}/api/auth/login`, {
    data: { email: ATHLETE_EMAIL, password: tempPassword },
  });
  const course = await (await athleteCtx.request.get(`${APP}/api/learn/courses/${COURSE}`)).json();
  const firstLesson = course.modules.flatMap((m) => m.lessons)[0];
  const marked = await athleteCtx.request.post(`${APP}/api/learn/lessons/${firstLesson.id}/progress`, {
    data: { status: "completed" },
  });
  const markedBody = await marked.json();
  record(
    "athlete completes one lesson",
    login.ok() && marked.ok() && markedBody.progress?.status === "completed",
    `lesson ${firstLesson.id} "${firstLesson.title}" -> ${markedBody.progress?.status}, course now ${markedBody.courseProgress?.completed}/${markedBody.courseProgress?.total}`
  );
  await athleteCtx.close();

  // ── 5. HQ reflects it ────────────────────────────────────────────
  const after = (await adminGet(hq, `/api/admin/users/${athleteId}/curriculum`)).body;
  const afterCourse = after.courses.find((c) => c.slug === COURSE);
  const afterLesson = afterCourse.lessons.find((l) => l.id === firstLesson.id);
  record(
    "admin curriculum endpoint shows the completion",
    afterCourse.completed === 1 && afterLesson.status === "completed" && !!afterLesson.completedAt,
    `${afterCourse.completed} of ${afterCourse.total} (${afterCourse.percent}%), "${afterLesson.title}" completed at ${afterLesson.completedAt}`
  );

  await hq.reload({ waitUntil: "domcontentloaded" });
  const afterText = await openAthlete(hq, ATHLETE_EMAIL);
  const afterShot = await shot(hq, "b02-hq-curriculum-one-complete");
  record(
    "HQ Curriculum page shows the completion",
    afterText.startsWith("1 of"),
    `"${beforeText}" -> "${afterText}" (screenshot ${afterShot})`
  );

  // ── 6. The aggregate strip is real, not decorative ───────────────
  const summaryAfter = (await adminGet(hq, "/api/admin/curriculum/summary")).body;
  const courseAfter = summaryAfter.find((c) => c.slug === COURSE);
  record(
    "aggregate take-up counts move with the real row",
    courseAfter.athletesStarted === courseBefore.athletesStarted + 1
      && courseAfter.lessonsCompleted === courseBefore.lessonsCompleted + 1,
    `athletesStarted ${courseBefore.athletesStarted} -> ${courseAfter.athletesStarted}, lessonsCompleted ${courseBefore.lessonsCompleted} -> ${courseAfter.lessonsCompleted}`
  );
  await hq.evaluate(() => window.scrollTo(0, 0));
  await shot(hq, "b03-hq-curriculum-summary");

  // ── 7. Still admin-only ──────────────────────────────────────────
  const anonCtx = await browser.newContext();
  const anonUser = await anonCtx.request.get(`${APP}/api/admin/users/${athleteId}/curriculum`);
  const anonSummary = await anonCtx.request.get(`${APP}/api/admin/curriculum/summary`);
  record(
    "curriculum endpoints reject an unauthenticated caller",
    anonUser.status() === 401 && anonSummary.status() === 401,
    `per-user ${anonUser.status()}, summary ${anonSummary.status()}`
  );
  await anonCtx.close();

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  writeFileSync(
    join(OUT, "phase-b-results.json"),
    JSON.stringify(
      { phase: "B", ranAt: new Date().toISOString(), app: APP, hq: HQ, athlete: ATHLETE_EMAIL, passed, total: results.length, results },
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
