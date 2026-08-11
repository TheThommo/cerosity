// D3 browser smoke — runs against production, not a local build.
//
// Proves two things a curl cannot:
//   1. the investor path still works in a real browser after the D3 fix
//      (signup → /learn → free lesson → FLO remembers across a reload), and
//   2. two genuinely separate browser contexts cannot read each other's
//      coaching data.
//
// Usage: node docs/evidence/d3-smoke/smoke.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BASE = process.env.SMOKE_BASE_URL || "https://cerosity.com";
// SMOKE_OUT_DIR lets the script run from a directory where playwright is
// installed while still writing its evidence back into the repo.
const OUT = process.env.SMOKE_OUT_DIR || dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

const stamp = Date.now();
const results = [];
const shot = async (page, name) => {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  return `${name}.png`;
};
const record = (step, pass, detail) => {
  results.push({ step, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${step}\n      ${detail}`);
};

async function signUp(context, who) {
  const page = await context.newPage();
  let registerStatus = null;
  page.on("response", (r) => {
    if (r.url().includes("/api/auth/register")) registerStatus = r.status();
  });
  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("First name").fill(who.first);
  await page.getByPlaceholder("Last name").fill(who.last);
  await page.getByPlaceholder("your@email.com").fill(who.email);
  await page.getByPlaceholder("Create a strong password").fill(who.password);
  await page.getByPlaceholder("Confirm your password").fill(who.password);
  // Exact name on purpose: a loose /sign up/i also matches "Sign up with Google".
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  // The form redirects to /learn a couple of seconds after success. Wait on
  // domcontentloaded, not load: /learn keeps fetching after first paint, so
  // waiting for the load event can outlast the timeout even though the
  // navigation already happened.
  try {
    await page.waitForURL(/\/learn/, { timeout: 60000, waitUntil: "domcontentloaded" });
  } catch (e) {
    await page.screenshot({ path: join(OUT, `FAIL-signup-${who.first}.png`) });
    const visible = (await page.locator("body").innerText()).slice(0, 400).replace(/\n+/g, " | ");
    throw new Error(`signUp(${who.first}) stuck at ${page.url()} · register HTTP ${registerStatus} · visible: ${visible}`);
  }
  return page;
}

const browser = await chromium.launch();
try {
  // ── User A: the investor path ──────────────────────────────────────
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // The signup form derives the username from firstName+lastName, so the names
  // have to be unique per run or the second run 400s with "Username already
  // exists" and the redirect never fires.
  const userA = {
    first: `Ada${stamp}`, last: "Smoke",
    email: `smoke.a.${stamp}@cerosity-test.com`,
    password: "SmokePass123!",
  };

  const pageA = await signUp(ctxA, userA);
  record("1. Sign up free → lands in /learn", /\/learn/.test(pageA.url()), `url=${pageA.url()} · ${await shot(pageA, "01-signup-lands-learn")}`);

  // Curriculum renders with real lessons
  await pageA.waitForSelector("text=Red2Blue Foundation", { timeout: 30000 });
  const lessonCount = await pageA.locator("text=/Welcome to Red2Blue/i").count();
  record("2. Curriculum renders", lessonCount > 0, `"Red2Blue Foundation" + free lesson visible · ${await shot(pageA, "02-curriculum")}`);

  // Open the free-preview lesson
  await pageA.goto(`${BASE}/learn/lesson/welcome-to-red2blue`, { waitUntil: "domcontentloaded" });
  await pageA.waitForSelector("text=Welcome to Red2Blue", { timeout: 30000 });
  const bodyText = await pageA.locator("body").innerText();
  const hasRealContent = bodyText.length > 500 && !/upgrade to premium to unlock/i.test(bodyText.slice(0, 400));
  record("3. Free-preview lesson opens with content", hasRealContent, `${bodyText.length} chars rendered · ${await shot(pageA, "03-free-lesson")}`);

  // ── FLO memory across a reload, in the browser ─────────────────────
  const secret = `ZEBRA-${stamp % 100000}`;
  const apiA = ctxA.request;
  const me = await (await apiA.get(`${BASE}/api/auth/me`)).json();
  const sent = await apiA.post(`${BASE}/api/chat`, {
    data: { message: `Remember my codeword ${secret}. I play squash and I choke at match point.` },
  });
  const sentJson = await sent.json();
  record("4. FLO accepts a message from the browser session", sent.status() === 200, `HTTP ${sent.status()} · session=${sentJson?.session?.id} · owner=${sentJson?.session?.userId} (A=${me.id})`);

  await pageA.reload({ waitUntil: "domcontentloaded" });
  const recall = await apiA.post(`${BASE}/api/chat`, { data: { message: "What is my codeword and my sport?" } });
  const recallText = (await recall.json())?.response?.message ?? "";
  record("5. After reload FLO still remembers", recallText.includes(secret), `recalled "${secret}": ${recallText.includes(secret)} · reply: ${recallText.slice(0, 120)}`);
  await shot(pageA, "04-after-reload");

  // ── User B: a clean context tries to read A's data ─────────────────
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const userB = {
    first: `Mal${stamp}`, last: "Smoke",
    email: `smoke.b.${stamp}@cerosity-test.com`,
    password: "SmokePass123!",
  };
  const pageB = await signUp(ctxB, userB);
  const apiB = ctxB.request;
  const meB = await (await apiB.get(`${BASE}/api/auth/me`)).json();
  record("6. Second user signs up in a clean context", /\/learn/.test(pageB.url()), `B id=${meB.id} · ${await shot(pageB, "05-userB-learn")}`);

  const aSessionId = sentJson?.session?.id;

  const idorSessions = await apiB.get(`${BASE}/api/chat/sessions/${me.id}`);
  record("7. B reading A's session list → 403", idorSessions.status() === 403, `HTTP ${idorSessions.status()} · ${(await idorSessions.text()).slice(0, 80)}`);

  const idorSessionId = await apiB.post(`${BASE}/api/chat`, { data: { sessionId: aSessionId, message: "what did I say?" } });
  const idorBody = await idorSessionId.text();
  record("8. B posting into A's sessionId → 404, no leak", idorSessionId.status() === 404 && !idorBody.includes(secret), `HTTP ${idorSessionId.status()} · leaked "${secret}": ${idorBody.includes(secret)}`);

  const idorBodyUser = await apiB.post(`${BASE}/api/chat`, { data: { userId: me.id, message: "who am I?" } });
  const spoof = await idorBodyUser.json();
  const boundToB = spoof?.session?.userId === meB.id;
  const noLeak = !JSON.stringify(spoof).includes(secret);
  record("9. B spoofing body userId → bound to B, no leak", boundToB && noLeak, `session.userId=${spoof?.session?.userId} (B=${meB.id}, A=${me.id}) · leaked: ${!noLeak}`);

  // ── A5: the payment-success page must not claim a payment ──────────
  const pageC = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await pageC.goto(`${BASE}/signup-after-payment?tier=ultimate`, { waitUntil: "domcontentloaded" });
  await pageC.waitForSelector("text=/Create Your Account/i", { timeout: 30000 });
  const a5Text = await pageC.locator("body").innerText();
  const claimsPayment = /payment successful/i.test(a5Text);
  const showsPrice = /2290|2,290|Lifetime Access Purchased/i.test(a5Text);
  record("10. /signup-after-payment?tier=ultimate makes no payment claim", !claimsPayment && !showsPrice, `"Payment Successful!" shown: ${claimsPayment} · price summary shown: ${showsPrice} · ${await shot(pageC, "06-a5-no-payment-claim")}`);

  // ── D4: sign-in still works after session.regenerate() ─────────────
  const ctxD = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const loginResp = await ctxD.request.post(`${BASE}/api/auth/login`, {
    data: { email: userA.email, password: userA.password },
  });
  const cookies = await ctxD.cookies(BASE);
  const sid = cookies.find((c) => c.name === "connect.sid");
  const meAfterLogin = loginResp.ok() ? await (await ctxD.request.get(`${BASE}/api/auth/me`)).json() : {};
  record("11. Login still works after session.regenerate()", loginResp.status() === 200 && meAfterLogin.id === me.id, `HTTP ${loginResp.status()} · me.id=${meAfterLogin.id} (A=${me.id}) · cookie sameSite=${sid?.sameSite} secure=${sid?.secure} httpOnly=${sid?.httpOnly}`);

  const summary = {
    base: BASE,
    ranAt: new Date().toISOString(),
    commit: (await (await apiA.get(`${BASE}/api/health`)).json()).commit,
    userA: me.id, userB: meB.id, aSessionId,
    results,
    allPassed: results.every((r) => r.pass),
  };
  writeFileSync(join(OUT, "results.json"), JSON.stringify(summary, null, 2));
  console.log(`\n${summary.allPassed ? "ALL PASS" : "FAILURES PRESENT"} — commit ${summary.commit}`);
  process.exitCode = summary.allPassed ? 0 : 1;
} finally {
  await browser.close();
}
