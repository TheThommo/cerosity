// Andy meeting — Sarah path, end to end, on production, on a phone.
//
// Sarah (sarah.demo@cerosity.com, ultimate) is the athlete Andy watches in the
// demo. This walks her exact route and fails loudly if any leg of it breaks:
//
//   1. she signs in through the real form, not an API shortcut,
//   2. /learn shows the whole curriculum unlocked — 23 of 23,
//   3. she opens a lesson and marks it complete, and it sticks server-side,
//   4. FLO remembers something she said before a reload,
//   5. her documents open as real PDFs,
//   6. the app is still installable — manifest served as application/manifest+json.
//
// The password comes from the environment so it never lands in the repo:
//   SARAH_PW
//
// Usage: SARAH_PW=... node docs/evidence/andy-meeting/sarah-smoke.mjs
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BASE = process.env.SMOKE_BASE_URL || "https://cerosity.com";
const EMAIL = process.env.SARAH_EMAIL || "sarah.demo@cerosity.com";
const PW = process.env.SARAH_PW;
// SMOKE_OUT_DIR lets the script run from a directory where playwright is
// installed while still writing its evidence back into the repo.
const OUT = process.env.SMOKE_OUT_DIR || dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

if (!PW) {
  console.error("SARAH_PW is not set. Refusing to guess Sarah's password.");
  process.exit(2);
}

const VIEWPORT = { width: 390, height: 844 };
const COURSE = "red2blue-foundation";
const results = [];

const shot = async (page, name) => {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
};
const record = (step, pass, detail) => {
  results.push({ step, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${step}\n      ${detail}`);
};
const courseState = async (page) => {
  const c = await (await page.request.get(`${BASE}/api/learn/courses/${COURSE}`)).json();
  const lessons = (c.modules || []).flatMap((m) => m.lessons || []);
  return { course: c, lessons };
};

const health = await (await fetch(`${BASE}/api/health`)).json();
console.log(`\nSarah path on ${BASE} @ commit ${health.commit}  viewport ${VIEWPORT.width}x${VIEWPORT.height}\n`);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices["iPhone 13"],
  viewport: VIEWPORT,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

// ------------------------------------------------------------------- sign in
// Through the form Andy will actually watch her use.
{
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Enter your email").fill(EMAIL);
  await page.getByPlaceholder("Enter your password").fill(PW);
  await shot(page, "01-signin-mobile");
  await page.getByRole("button", { name: /^sign in$/i }).click();

  await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 30000 });
  const me = await (await page.request.get(`${BASE}/api/auth/me`)).json();
  record(
    "Sarah signs in through the real form on a phone viewport",
    me.email === EMAIL && me.subscriptionTier === "ultimate",
    `landed on ${new URL(page.url()).pathname} as id=${me.id} tier=${me.subscriptionTier} role=${me.role}`
  );
}

// ---------------------------------------------------------------- curriculum
{
  await page.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
  const { course, lessons } = await courseState(page);
  const unlocked = lessons.filter((l) => !l.locked);
  record(
    "the whole curriculum is unlocked for her — 23 of 23",
    unlocked.length === 23 && lessons.length === 23 && course.hasAccess === true,
    `${unlocked.length} of ${lessons.length} unlocked, hasAccess=${course.hasAccess}`
  );
  await page.waitForTimeout(1500);
  await shot(page, "02-learn-23-unlocked");
}

// ------------------------------------------------------------- lesson finish
// Re-runnable: takes the first lesson she has not finished yet.
{
  const before = await courseState(page);
  const target =
    before.lessons.find((l) => !l.locked && l.status !== "completed") ||
    before.lessons.find((l) => !l.locked);

  await page.goto(`${BASE}/learn/lesson/${target.slug}`, { waitUntil: "domcontentloaded" });
  // The SPA shows "Loading Cerosity..." until auth bootstraps — wait for the
  // lesson itself to mount rather than probing an unhydrated page.
  const btn = page.getByRole("button", { name: /mark as complete/i }).first();
  const reMarking = target.status === "completed";
  const visible = await btn
    .waitFor({ state: "visible", timeout: 30000 })
    .then(() => true)
    .catch(() => false);

  if (visible) {
    await btn.click();
    await page.waitForTimeout(2500);
  }
  await shot(page, "03-lesson-complete");

  const after = await courseState(page);
  const row = after.lessons.find((l) => l.id === target.id);
  record(
    "she completes a lesson and it sticks on the server",
    row?.status === "completed",
    `"${target.title}" ${target.status} -> ${row?.status}; course ${after.course.progress.completed}/${after.course.progress.total}` +
      (reMarking ? " (already complete before this run)" : "")
  );
}

// ------------------------------------------------------------- FLO recall
// Memory cannot live in client state — it has to survive a reload.
{
  const token = `Rupert${Date.now() % 10000}`;
  await page.goto(`${BASE}/flo`, { waitUntil: "domcontentloaded" });
  const said = await page.request.post(`${BASE}/api/chat`, {
    data: { message: `Remember this: my caddie is called ${token}.` },
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  const res = await page.request.post(`${BASE}/api/chat`, {
    data: { message: "What is my caddie called?" },
  });
  const reply = ((await res.json())?.response?.message || "").toString();
  record(
    "FLO recalls what she told it before the reload",
    said.ok() && res.ok() && reply.toLowerCase().includes(token.toLowerCase()),
    `looked for "${token}" in: ${reply.slice(0, 100).replace(/\s+/g, " ")}`
  );
  await page.waitForTimeout(1500);
  await shot(page, "04-flo-recall-after-reload");
}

// ------------------------------------------------------------------ document
{
  const doc = "Master Your Moment by Cero Golf.pdf";
  const res = await page.request.get(`${BASE}${encodeURI(`/downloads/${doc}`)}`);
  const type = res.headers()["content-type"] || "";
  record(
    "her document opens as a real PDF",
    res.ok() && type.includes("application/pdf"),
    `${doc} — HTTP ${res.status()} ${type}`
  );
}

// --------------------------------------------------------------- installable
{
  const res = await page.request.get(`${BASE}/manifest.webmanifest`);
  const type = res.headers()["content-type"] || "";
  record(
    "the app is still installable — manifest is application/manifest+json",
    res.ok() && type.includes("application/manifest+json"),
    `HTTP ${res.status()} ${type}`
  );
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
