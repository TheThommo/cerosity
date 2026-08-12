// Andy meeting — does deactivation actually stop her getting in?
//
// One probe: try to sign in as Sarah through the real form, on a phone, and
// record what happens. Run it either side of flipping users.is_active so the
// three results together are the proof:
//
//   SMOKE_LABEL=baseline    (active)        -> expect in
//   SMOKE_LABEL=deactivated (is_active=off) -> expect refused, and told why
//   SMOKE_LABEL=restored    (active again)  -> expect in
//
// Each run appends to deactivate-results.json rather than overwriting, so the
// finished file is the whole sequence.
//
// This deliberately does NOT need an admin session — it proves the athlete-
// facing half. deactivate-smoke.mjs proves the HQ toggle drives it, and needs
// HQ_ADMIN_PW.
//
// Usage: SARAH_PW=... SMOKE_LABEL=baseline node docs/evidence/andy-meeting/deactivate-probe.mjs
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BASE = process.env.SMOKE_BASE_URL || "https://cerosity.com";
const EMAIL = process.env.SARAH_EMAIL || "sarah.demo@cerosity.com";
const PW = process.env.SARAH_PW;
const LABEL = process.env.SMOKE_LABEL;
const OUT = process.env.SMOKE_OUT_DIR || dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

if (!PW) {
  console.error("SARAH_PW is not set. Refusing to guess Sarah's password.");
  process.exit(2);
}
if (!["baseline", "deactivated", "restored"].includes(LABEL)) {
  console.error("SMOKE_LABEL must be baseline | deactivated | restored");
  process.exit(2);
}

const VIEWPORT = { width: 390, height: 844 };
const expectIn = LABEL !== "deactivated";

const health = await (await fetch(`${BASE}/api/health`)).json();
const browser = await chromium.launch();
const phone = { ...devices["iPhone 13"], viewport: VIEWPORT, isMobile: true, hasTouch: true };

// What the API says, and — just as important — what she is shown. These need
// separate contexts: a successful API login leaves a session cookie behind,
// and /login would then just bounce us to /learn before the form renders.
const apiCtx = await browser.newContext(phone);
const apiRes = await (await apiCtx.newPage()).request.post(`${BASE}/api/auth/login`, {
  data: { email: EMAIL, password: PW },
});
const apiBody = await apiRes.json().catch(() => ({}));
await apiCtx.close();

const ctx = await browser.newContext(phone);
const page = await ctx.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.getByPlaceholder("Enter your email").fill(EMAIL);
await page.getByPlaceholder("Enter your password").fill(PW);
await page.getByRole("button", { name: /^sign in$/i }).click();
await page.waitForTimeout(4000);

const path = new URL(page.url()).pathname;
const landedIn = !/\/login$/.test(path);
const onScreen = (await page.locator("body").innerText().catch(() => "")) || "";
const saysDeactivated = /deactivated/i.test(onScreen);
await page.screenshot({ path: join(OUT, `d-${LABEL}.png`), fullPage: false });
await browser.close();

const pass = expectIn
  ? apiRes.status() === 200 && landedIn
  : apiRes.status() === 401 && /deactivated/i.test(apiBody?.message || "") && !landedIn && saysDeactivated;

const step = expectIn
  ? `${LABEL}: an active athlete signs in`
  : `${LABEL}: a deactivated athlete is refused, and told why`;
const detail =
  `HTTP ${apiRes.status()}` +
  (apiBody?.message ? ` "${apiBody.message}"` : "") +
  ` · browser landed on ${path}` +
  (expectIn ? "" : ` · "deactivated" shown on screen: ${saysDeactivated}`);

console.log(`${pass ? "PASS" : "FAIL"}  ${step}\n      ${detail}`);

const file = join(OUT, "deactivate-results.json");
const prior = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
const results = [
  ...(prior?.results || []).filter((r) => !r.step.startsWith(`${LABEL}:`)),
  { step, pass, detail },
];
writeFileSync(
  file,
  JSON.stringify(
    { ranAt: new Date().toISOString(), base: BASE, commit: health.commit, viewport: VIEWPORT, results },
    null,
    2
  )
);

process.exit(pass ? 0 : 1);
