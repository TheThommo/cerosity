// Andy meeting — soft deactivation, proven on production.
//
// The CEO wanted to turn an athlete off without deleting them. This proves
// the switch actually bites, using Sarah as the subject:
//
//   1. she can sign in to start with,
//   2. HQ turns her off,
//   3. her password is now refused — and she is told she is deactivated,
//      not that her password is wrong,
//   4. a session she already had open stops working on the next request,
//   5. HQ turns her back on and she is in again,
//   6. the CEO cannot deactivate himself out of the console.
//
// Sarah is left ACTIVE — the script restores her even if a step fails.
//
// Credentials come from the environment, same names phase-c.mjs uses:
//   SARAH_PW, HQ_ADMIN_EMAIL, HQ_ADMIN_PW
//
// Usage: SARAH_PW=... HQ_ADMIN_EMAIL=... HQ_ADMIN_PW=... \
//          node docs/evidence/andy-meeting/deactivate-smoke.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BASE = process.env.SMOKE_BASE_URL || "https://cerosity.com";
const SARAH_EMAIL = process.env.SARAH_EMAIL || "sarah.demo@cerosity.com";
const SARAH_PW = process.env.SARAH_PW;
const ADMIN_EMAIL = process.env.HQ_ADMIN_EMAIL;
const ADMIN_PW = process.env.HQ_ADMIN_PW;
const OUT = process.env.SMOKE_OUT_DIR || dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

if (!SARAH_PW || !ADMIN_EMAIL || !ADMIN_PW) {
  console.error("Set SARAH_PW, HQ_ADMIN_EMAIL and HQ_ADMIN_PW.");
  process.exit(2);
}

const results = [];
const record = (step, pass, detail) => {
  results.push({ step, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${step}\n      ${detail}`);
};

const health = await (await fetch(`${BASE}/api/health`)).json();
console.log(`\nSoft deactivation on ${BASE} @ commit ${health.commit}\n`);

const browser = await chromium.launch();
const admin = await (await browser.newContext()).newPage();
const setActive = (id, isActive) =>
  admin.request.patch(`${BASE}/api/admin/users/${id}`, { data: { isActive } });

// A fresh context each time, so every sign-in attempt is genuinely fresh.
const tryLogin = async (email, password) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const res = await page.request.post(`${BASE}/api/auth/login`, { data: { email, password } });
  const body = await res.json().catch(() => ({}));
  await ctx.close();
  return { status: res.status(), message: body?.message, email: body?.email };
};

let sarahId = null;
try {
  // -------------------------------------------------------------- admin in
  const adminLogin = await admin.request.post(`${BASE}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PW },
  });
  const adminUser = await adminLogin.json();
  if (!adminLogin.ok() || adminUser.role !== "admin") {
    throw new Error(`admin login failed: HTTP ${adminLogin.status()} role=${adminUser.role}`);
  }

  const all = await (await admin.request.get(`${BASE}/api/admin/users`)).json();
  const sarah = all.find((u) => u.email === SARAH_EMAIL);
  if (!sarah) throw new Error(`${SARAH_EMAIL} not found in /api/admin/users`);
  sarahId = sarah.id;
  record(
    "HQ reports the athlete's active state",
    sarah.isActive === true,
    `#${sarah.id} ${sarah.email} isActive=${sarah.isActive}`
  );

  // ------------------------------------------------------------- baseline
  const before = await tryLogin(SARAH_EMAIL, SARAH_PW);
  record("she can sign in before anything is changed", before.status === 200, `HTTP ${before.status}`);

  // A session opened now must not survive being turned off.
  const liveCtx = await browser.newContext();
  const live = await liveCtx.newPage();
  await live.request.post(`${BASE}/api/auth/login`, { data: { email: SARAH_EMAIL, password: SARAH_PW } });
  const liveBefore = await live.request.get(`${BASE}/api/auth/me`);

  // ----------------------------------------------------------- deactivate
  const off = await setActive(sarahId, false);
  const offBody = await off.json();
  record(
    "HQ turns the athlete off",
    off.ok() && offBody.isActive === false,
    `HTTP ${off.status()} isActive=${offBody.isActive}`
  );

  const denied = await tryLogin(SARAH_EMAIL, SARAH_PW);
  record(
    "a deactivated athlete cannot sign in, and is told why",
    denied.status === 401 && /deactivated/i.test(denied.message || ""),
    `HTTP ${denied.status} "${denied.message}"`
  );

  const liveAfter = await live.request.get(`${BASE}/api/auth/me`);
  record(
    "the session she already had open is cut off on the next request",
    liveBefore.ok() && liveAfter.status() === 401,
    `/api/auth/me was HTTP ${liveBefore.status()} before, HTTP ${liveAfter.status()} after`
  );
  await liveCtx.close();

  // ----------------------------------------------------------- reactivate
  const on = await setActive(sarahId, true);
  const onBody = await on.json();
  record(
    "HQ turns her back on",
    on.ok() && onBody.isActive === true,
    `HTTP ${on.status()} isActive=${onBody.isActive}`
  );

  const again = await tryLogin(SARAH_EMAIL, SARAH_PW);
  record(
    "she can sign in again once reactivated",
    again.status === 200 && again.email === SARAH_EMAIL,
    `HTTP ${again.status} as ${again.email}`
  );

  // --------------------------------------------------------------- footgun
  const self = await setActive(adminUser.id, false);
  const selfBody = await self.json();
  record(
    "the CEO cannot deactivate himself out of the console",
    self.status() === 400,
    `HTTP ${self.status()} "${selfBody.message}"`
  );
} finally {
  // Sarah must be left active whatever happened above — she is the demo.
  if (sarahId !== null) {
    const restore = await setActive(sarahId, true).catch(() => null);
    const state = restore ? (await restore.json().catch(() => ({}))).isActive : "unknown";
    record("Sarah is left active for the demo", state === true, `final isActive=${state}`);
  }
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
writeFileSync(
  join(OUT, "deactivate-results.json"),
  JSON.stringify({ ranAt: new Date().toISOString(), base: BASE, commit: health.commit, results }, null, 2)
);

console.log(`\n${results.length - failed.length}/${results.length} passed @ commit ${health.commit}`);
if (failed.length) {
  console.log("FAILED:\n" + failed.map((f) => `  - ${f.step} (${f.detail})`).join("\n"));
  process.exit(1);
}
