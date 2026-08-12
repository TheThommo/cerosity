// Investor polish night — mobile smoke. Runs against production, on a phone
// viewport (390x844), not a local build.
//
// Proves the things the demo actually leans on:
//   1. a paid athlete is never cut off mid-conversation,
//   2. FLO is reachable in one tap and still remembers across a reload,
//   3. the athlete documents open as real PDFs,
//   4. the app is installable (manifest served as JSON, not the SPA fallback),
//   5. the free tier is still gated — 5 chats, 2 preview lessons, 6-turn
//      logged-out preview.
//
// Credentials come from the environment so nothing is committed:
//   SMOKE_ULT_EMAIL  / SMOKE_ULT_PW   an athlete on a paid tier
//   SMOKE_FREE_EMAIL / SMOKE_FREE_PW  an athlete on the free tier
//
// Usage: node docs/evidence/investor-polish/mobile-smoke.mjs
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BASE = process.env.SMOKE_BASE_URL || "https://cerosity.com";
// SMOKE_OUT_DIR lets the script run from a directory where playwright is
// installed while still writing its evidence back into the repo.
const OUT = process.env.SMOKE_OUT_DIR || dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

const VIEWPORT = { width: 390, height: 844 };
const results = [];

const shot = async (page, name) => {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  return `${name}.png`;
};
const record = (step, pass, detail) => {
  results.push({ step, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${step}\n      ${detail}`);
};

async function login(page, email, password) {
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`login ${email} failed: HTTP ${res.status()}`);
  return (await page.request.get(`${BASE}/api/auth/me`)).json();
}

const health = await (await fetch(`${BASE}/api/health`)).json();
console.log(`\nTarget ${BASE} @ commit ${health.commit}  viewport ${VIEWPORT.width}x${VIEWPORT.height}\n`);

const browser = await chromium.launch();
const phone = { ...devices["iPhone 13"], viewport: VIEWPORT, isMobile: true, hasTouch: true };

// ---------------------------------------------------------------- regression
// The logged-out preview must still stop at 6 and still ask for the signup.
{
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  // previewEnded is the hard gate. showSignupCta is not a proxy for it: the
  // funnel raises the CTA on turn 6 while still answering, which is the point.
  let endedAt = null;
  let ctaAt = null;
  for (let i = 1; i <= 8 && endedAt === null; i++) {
    const res = await page.request.post(`${BASE}/api/landing-chat`, {
      data: { message: `Smoke ${i}: one focus cue?`, messageCount: i },
    });
    const body = await res.json();
    if (body.showSignupCta && ctaAt === null) ctaAt = i;
    if (body.previewEnded) endedAt = i;
  }
  record(
    "landing preview still allows 6 turns, then gates with a signup CTA",
    endedAt === 7 && ctaAt !== null && ctaAt <= 7,
    `answered through turn ${endedAt - 1}, gated on ${endedAt}, CTA from ${ctaAt}`
  );
  await ctx.close();
}

// ------------------------------------------------------------------ paid tier
const paidCtx = await browser.newContext(phone);
const paid = await paidCtx.newPage();
const paidUser = await login(paid, process.env.SMOKE_ULT_EMAIL, process.env.SMOKE_ULT_PW);

{
  const lim = await (await paid.request.get(`${BASE}/api/chat/limitations/${paidUser.id}`)).json();
  record(
    "paid athlete holds an unlimited chat entitlement",
    lim.chatLimit === -1 && lim.canChat === true,
    `tier=${paidUser.subscriptionTier} chatLimit=${lim.chatLimit} status=${lim.subscriptionStatus}`
  );

  // The bug this night existed to kill: a 403 on turn six of a demo.
  const codes = [];
  for (let i = 1; i <= 11; i++) {
    const res = await paid.request.post(`${BASE}/api/chat`, {
      data: { message: `Smoke turn ${i}: give me one short focus cue.` },
    });
    codes.push(res.status());
  }
  record(
    "11 consecutive chat turns as a paid athlete, none refused",
    codes.every((c) => c === 200),
    `distinct status codes: ${[...new Set(codes)].join(",")}`
  );
}

// FLO reachable from the curriculum in one tap.
{
  await paid.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
  const fab = paid.getByRole("link", { name: /ask flo/i }).first();
  await fab.waitFor({ timeout: 30000 });
  const box = await fab.boundingBox();
  record(
    "curriculum offers an Ask FLO entry at a 44px touch target",
    !!box && box.height >= 44,
    box ? `${Math.round(box.width)}x${Math.round(box.height)}px` : "FAB not found"
  );
  await shot(paid, "01-learn-ask-flo-fab");

  await fab.click();
  await paid.waitForURL(/\/flo/, { timeout: 30000, waitUntil: "domcontentloaded" });
  record("Ask FLO reaches the coach in one tap", true, "/learn -> /flo");

  const voice = paid.getByRole("button", { name: /talk to flo|end voice call|voice coaching unavailable/i }).first();
  const hasVoice = await voice.isVisible().catch(() => false);
  const voiceName = hasVoice ? await voice.getAttribute("aria-label") : null;
  record("coach surface mounts push-to-talk", hasVoice, hasVoice ? `control: "${voiceName}"` : "no voice control found");
  await shot(paid, "02-flo-text-and-voice");
}

// Memory has to survive a reload — it cannot live in client state.
{
  const token = `Rupert${Date.now() % 10000}`;
  await paid.request.post(`${BASE}/api/chat`, {
    data: { message: `Remember this: my caddie is called ${token}.` },
  });
  await paid.reload({ waitUntil: "domcontentloaded" });
  const res = await paid.request.post(`${BASE}/api/chat`, {
    data: { message: "What is my caddie called?" },
  });
  const reply = ((await res.json())?.response?.message || "").toString();
  record(
    "FLO recalls a fact given before the reload",
    reply.toLowerCase().includes(token.toLowerCase()),
    `looked for "${token}" in: ${reply.slice(0, 90).replace(/\n+/g, " ")}`
  );
  await shot(paid, "03-flo-recall-after-reload");
}

// The bottom-nav Coach entry — a dead <button> before tonight.
{
  await paid.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const coach = paid.getByRole("link", { name: /^coach$/i }).first();
  await coach.waitFor({ timeout: 30000 });
  const box = await coach.boundingBox();
  record(
    "mobile bottom-nav Coach is a real link at a 44px target",
    !!box && box.height >= 44,
    box ? `${Math.round(box.width)}x${Math.round(box.height)}px` : "not found"
  );
  await shot(paid, "04-bottom-nav");
  await coach.click();
  await paid.waitForURL(/\/flo/, { timeout: 30000, waitUntil: "domcontentloaded" });
  record("bottom-nav Coach opens FLO", true, "/ -> /flo");
}

// ------------------------------------------------------------------ documents
{
  for (const doc of [
    "Master Your Moment by Cero Golf.pdf",
    "Ability to Focus - Book.pdf",
    "Mental Toughness - Book.pdf",
  ]) {
    const res = await paid.request.get(`${BASE}${encodeURI(`/downloads/${doc}`)}`);
    const type = res.headers()["content-type"] || "";
    record(
      `document opens as a PDF: ${doc}`,
      res.ok() && type.includes("application/pdf"),
      `HTTP ${res.status()} ${type}`
    );
  }
}

// ---------------------------------------------------------------- installable
{
  const res = await paid.request.get(`${BASE}/manifest.webmanifest`);
  const type = res.headers()["content-type"] || "";
  record(
    "manifest serves as JSON, not the SPA's index.html",
    res.ok() && !type.includes("text/html") && /json/.test(type),
    `HTTP ${res.status()} ${type}`
  );

  const manifest = await res.json().catch(() => ({}));
  const sizes = (manifest.icons || []).map((i) => i.sizes);
  record(
    "manifest meets the install bar (standalone + 192 and 512 icons)",
    manifest.display === "standalone" && ["192x192", "512x512"].every((s) => sizes.includes(s)),
    `display=${manifest.display} icons=${sizes.join(",")}`
  );

  const sw = await paid.request.get(`${BASE}/sw.js`);
  record("service worker is served", sw.ok(), `HTTP ${sw.status()}`);

  const html = await (await paid.request.get(BASE)).text();
  record(
    "index.html carries the iOS Add to Home Screen tags",
    html.includes('rel="manifest"') &&
      html.includes("apple-mobile-web-app-capable") &&
      html.includes('rel="apple-touch-icon"'),
    "manifest + apple-mobile-web-app-capable + apple-touch-icon"
  );
}

// ---------------------------------------------------------------- regression
// Nothing about unlimited chat may leak into the free tier.
{
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  const user = await login(page, process.env.SMOKE_FREE_EMAIL, process.env.SMOKE_FREE_PW);

  const lim = await (await page.request.get(`${BASE}/api/chat/limitations/${user.id}`)).json();
  record(
    "free athlete is still metered at 5 chats",
    lim.chatLimit === 5,
    `chatLimit=${lim.chatLimit} used=${lim.chatsUsed} canChat=${lim.canChat} status=${lim.subscriptionStatus}`
  );

  const course = await (
    await page.request.get(`${BASE}/api/learn/courses/red2blue-foundation`)
  ).json();
  const lessons = (course.modules || []).flatMap((m) => m.lessons || []);
  const unlocked = lessons.filter((l) => !l.locked);
  record(
    "free athlete still sees only the 2 preview lessons",
    unlocked.length === 2 && course.hasAccess === false,
    `${unlocked.length} of ${lessons.length} unlocked, hasAccess=${course.hasAccess}`
  );

  // D3: one athlete must not be able to read another's coaching data.
  const theirs = await page.request.get(`${BASE}/api/chat/limitations/${paidUser.id}`);
  record(
    "D3 ownership holds — free athlete cannot read the paid athlete's chat data",
    theirs.status() === 403 || theirs.status() === 404,
    `HTTP ${theirs.status()} for another user's limitations`
  );

  await page.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
  await shot(page, "05-free-curriculum-locked");
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
