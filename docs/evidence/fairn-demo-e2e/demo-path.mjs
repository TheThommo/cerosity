/**
 * Martin Fairn phone demo path — Playwright, Chrome (channel "chrome"), 390x844, headless.
 *
 * Usage:
 *   node docs/evidence/fairn-demo-e2e/demo-path.mjs                         # www, signs up two throwaways
 *   DEMO_MODE=public node docs/evidence/fairn-demo-e2e/demo-path.mjs        # www, no account at all
 *   BASE=http://localhost:5055 node docs/evidence/fairn-demo-e2e/demo-path.mjs   # local dev server
 *
 * Throwaway emails are @cerosity-test.invalid. Each password is random per run and is never
 * printed or written. The script never signs in as an existing user.
 * Writes run-<prod|local>.json / .md and screenshots next to this file. Exit 1 on any FAIL.
 */
import { chromium } from "playwright";
import { randomBytes } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const OUT = dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

const BASE = (process.env.BASE || "https://www.cerosity.com").replace(/\/$/, "");
const MODE = process.env.DEMO_MODE === "public" ? "public" : "full";
const LABEL = /^https:\/\/www\.cerosity\.com$/.test(BASE) ? "prod" : "local";
const SHOT_PREFIX = LABEL === "prod" ? "" : "local-";
const COURSE = "red2blue-foundation";
const VIEWPORT = { width: 390, height: 844 };
const FACTORS = ["confidence", "focus", "energy", "stress", "motivation"];
const TARGET = { confidence: 72, focus: 64, energy: 38, stress: 21, motivation: 87 };
const FLO_PROMPT = "I am going Red on the first tee.";
// StableChat swallows a failed /api/chat and shows this canned line instead of an error.
const CANNED_FALLBACK = "I'm here to help with your mental game. Ask me about handling pressure";

const stamp = Date.now();
const results = [];
const throwawayEmails = [];
const pageErrors = [];
const consoleNoise = new Map();

function record(id, name, status, detail) {
  results.push({ id, name, status, detail: String(detail ?? "") });
  console.log(`${status.padEnd(5)} ${id} ${name}\n      ${detail}`);
}

async function shot(page, name) {
  const file = `${SHOT_PREFIX}${name}.png`;
  try {
    await page.screenshot({ path: join(OUT, file) });
    return file;
  } catch (e) {
    return `${file} (screenshot failed: ${e.message})`;
  }
}

/** Run one check; an exception is a FAIL with a screenshot, never a crash of the suite. */
async function check(id, name, page, fn) {
  try {
    const { pass, detail, known } = await fn();
    record(id, name, pass ? "PASS" : known ? "KNOWN" : "FAIL", detail);
    return pass;
  } catch (e) {
    const where = page ? ` · url=${page.url()} · ${await shot(page, `FAIL-${id}`)}` : "";
    record(id, name, "FAIL", `${e.message.split("\n")[0]}${where}`);
    return false;
  }
}

function watch(context) {
  context.on("page", (p) => {
    p.on("pageerror", (err) => pageErrors.push(`${p.url()} · ${err.message.split("\n")[0]}`));
    p.on("console", (msg) => {
      if (msg.type() !== "error" && msg.type() !== "warning") return;
      const key = `${msg.type()}: ${msg.text().slice(0, 180)}`;
      consoleNoise.set(key, (consoleNoise.get(key) || 0) + 1);
    });
  });
}

function throwaway(name) {
  const email = `fairn.demo.${name.toLowerCase()}.${stamp}@cerosity-test.invalid`;
  throwawayEmails.push(email);
  // The signup form derives the username from first + last name, so the first name carries the stamp.
  return { first: `${name}${stamp}`, last: "Demo", email, password: `Fd-${randomBytes(12).toString("base64url")}` };
}

async function signUp(context, who) {
  const page = await context.newPage();
  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("First name").fill(who.first);
  await page.getByPlaceholder("Last name").fill(who.last);
  await page.getByPlaceholder("your@email.com").fill(who.email);
  await page.getByPlaceholder("Create a strong password").fill(who.password);
  await page.getByPlaceholder("Confirm your password").fill(who.password);
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await page.waitForURL(/\/learn/, { timeout: 60000, waitUntil: "domcontentloaded" });
  return page;
}

const flatten = (course) => (course.modules || []).flatMap((m) => m.lessons || []);
const bottomBar = (page) =>
  page.locator("div.fixed.bottom-0").filter({ has: page.getByText("Curriculum", { exact: true }) }).last();
const closeFlo = (page) => page.getByRole("button", { name: "Close FLO chat" });
const bubble = (page) => page.getByRole("button", { name: "Chat with FLO", exact: true });
const composers = (page) => page.locator("[data-chat-input]").count();
const historyLength = (page) => page.evaluate(() => history.length);
const path = (page) => new URL(page.url()).pathname;

async function publicChecks(browser) {
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  watch(ctx);
  const page = await ctx.newPage();
  const api = ctx.request;
  let commit = null;

  await check("P0", "Health 200 with a commit", null, async () => {
    const res = await api.get(`${BASE}/api/health`);
    const body = await res.json();
    commit = body.commit ?? null;
    return { pass: res.status() === 200 && body.status === "ok" && !!commit, detail: `HTTP ${res.status()} commit=${commit}` };
  });

  await check("P1", "Landing at 390px shows brand + FLO", page, async () => {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const text = await page.locator("body").innerText();
    const ok = /Cerosity/i.test(text) && /\bFLO\b/.test(text);
    return { pass: ok, detail: `brand+FLO=${ok} · ${await shot(page, "landing-390")}` };
  });

  await check("P2", "Forgot-password page loads", page, async () => {
    await page.goto(`${BASE}/forgot-password`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const ok = /forgot|reset|email/i.test(await page.locator("body").innerText());
    return { pass: ok, detail: `url=${page.url()}` };
  });

  await check("P3", "Anonymous: mood entries, chat, curriculum, progress, coaching all refuse", null, async () => {
    const probes = [
      ["GET mood-entries/1", () => api.get(`${BASE}/api/mood-entries/1`)],
      ["POST mood-entries/1", () => api.post(`${BASE}/api/mood-entries/1`, { data: { context: "check_in", ...TARGET } })],
      ["POST chat", () => api.post(`${BASE}/api/chat`, { data: { message: "probe" } })],
      ["GET course", () => api.get(`${BASE}/api/learn/courses/${COURSE}`)],
      ["POST progress", () => api.post(`${BASE}/api/learn/lessons/1/progress`, { data: { status: "completed" } })],
      ["POST coaching", () => api.post(`${BASE}/api/human-coaching/message`, { data: { message: "probe" } })],
    ];
    const seen = [];
    for (const [name, call] of probes) seen.push(`${name}=${(await call()).status()}`);
    return { pass: seen.every((s) => /=401$/.test(s)), detail: seen.join(" ") };
  });

  // The known old D1 failure (404) came from a signed-in probe as an existing user; this
  // script never signs in as one, so it only proves the anonymous half.
  await check("D1", "daily-mood refuses anonymous (old signed-in 404 not re-probed)", null, async () => {
    const today = new Date().toISOString().slice(0, 10);
    const status = (await api.get(`${BASE}/api/daily-mood/1/${today}`)).status();
    return { pass: [401, 403].includes(status), known: status === 404, detail: `anon HTTP ${status}` };
  });

  await ctx.close();
  return commit;
}

async function fullChecks(browser) {
  const ctxA = await browser.newContext({ viewport: VIEWPORT });
  watch(ctxA);
  const userA = throwaway("Ada");
  let page;
  const signedUp = await check("S1", "New free throwaway signs up → /learn", null, async () => {
    page = await signUp(ctxA, userA);
    return { pass: /\/learn/.test(page.url()), detail: `email=${userA.email} url=${page.url()}` };
  });
  if (!signedUp) return ctxA.close();

  const api = ctxA.request;
  const me = await (await api.get(`${BASE}/api/auth/me`)).json();
  const userId = me.id ?? me.user?.id;
  const course = await (await api.get(`${BASE}/api/learn/courses/${COURSE}`)).json();
  const lessons = flatten(course);
  const open = lessons.filter((l) => !l.locked);
  const locked = lessons.filter((l) => l.locked);

  // ── Curriculum: free lessons stay preview-locked ─────────────────────
  await check("L1", "Free: only free-preview lessons open, at least one locked", page, async () => {
    const ok = course.hasAccess === false && locked.length > 0 && open.length > 0 && open.every((l) => l.isFreePreview);
    return { pass: ok, detail: `hasAccess=${course.hasAccess} open=${open.length} locked=${locked.length} of ${lessons.length}` };
  });

  await check("L2", "Locked lesson API returns empty content", page, async () => {
    const target = locked[0];
    const lj = await (await api.get(`${BASE}/api/learn/lessons/${target.slug}`)).json();
    const len = Array.isArray(lj.lesson?.content) ? lj.lesson.content.length : lj.lesson?.content ? 1 : 0;
    return { pass: lj.locked === true && len === 0, detail: `slug=${target.slug} locked=${lj.locked} contentLen=${len}` };
  });

  await check("L3", "Curriculum page shows the free-preview banner and lock icons", page, async () => {
    await page.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
    await page.getByText("You are on a free preview").waitFor({ timeout: 20000 });
    const locks = await page.locator("svg.lucide-lock").count();
    await page.getByText(locked[0].title, { exact: true }).first().scrollIntoViewIfNeeded();
    return { pass: locks > 1, detail: `lockIcons=${locks} · ${await shot(page, "curriculum-lock")}` };
  });

  // ── Bottom bar ───────────────────────────────────────────────────────
  await check("N1", "Bottom bar shows Curriculum, Ask FLO, Check-in", page, async () => {
    const bar = bottomBar(page);
    const seen = [];
    for (const label of ["Curriculum", "Ask FLO", "Check-in"]) {
      if (await bar.getByText(label, { exact: true }).isVisible()) seen.push(label);
    }
    return { pass: seen.length === 3, detail: `visible=${seen.join(", ")} on ${path(page)}` };
  });

  // ── One FLO panel ────────────────────────────────────────────────────
  await check("F1", "Ask FLO (bar) opens the panel; path and history unchanged", page, async () => {
    const before = { path: path(page), hist: await historyLength(page), composers: await composers(page) };
    await bottomBar(page).getByRole("button", { name: "Ask FLO", exact: true }).click();
    await closeFlo(page).waitFor({ timeout: 10000 });
    const after = { path: path(page), hist: await historyLength(page), composers: await composers(page) };
    const ok = after.path === before.path && after.hist === before.hist && after.composers === before.composers + 1;
    return { pass: ok, detail: `path ${before.path}→${after.path} history ${before.hist}→${after.hist} composers ${before.composers}→${after.composers}` };
  });

  await check("F2", "Close, then the bubble opens that same panel", page, async () => {
    await closeFlo(page).click();
    await closeFlo(page).waitFor({ state: "hidden", timeout: 10000 });
    const before = path(page);
    await bubble(page).click({ timeout: 10000 });
    await closeFlo(page).waitFor({ timeout: 10000 });
    const barExpanded = await bottomBar(page).getByRole("button", { name: "Ask FLO", exact: true }).getAttribute("aria-expanded");
    const n = await composers(page);
    const ok = path(page) === before && barExpanded === "true" && n === 1;
    return { pass: ok, detail: `path ${before}→${path(page)} barAskFlo aria-expanded=${barExpanded} composers=${n}` };
  });

  await check("F3", `FLO answers "${FLO_PROMPT}" in the panel`, page, async () => {
    const replies = page.locator(".bg-gray-100");
    const repliesBefore = await replies.count();
    const input = page.locator("[data-chat-input]").first();
    await input.fill(FLO_PROMPT);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/api/chat") && r.request().method() === "POST", { timeout: 180000 }),
      input.press("Enter"),
    ]);
    let reply = "";
    try { reply = (await res.json())?.response?.message || ""; } catch {}
    await page.waitForFunction((n) => document.querySelectorAll(".bg-gray-100").length > n, repliesBefore, { timeout: 30000 });
    const shown = ((await replies.last().innerText()) || "").trim();
    const ok = res.status() === 200 && reply.trim().length > 0 && shown.length > 0 && !shown.startsWith(CANNED_FALLBACK);
    return {
      pass: ok,
      detail: `POST /api/chat HTTP ${res.status()} replyChars=${reply.length} panelShows="${shown.slice(0, 120).replace(/\s+/g, " ")}" · ${await shot(page, "flo-panel")}`,
    };
  });

  await check("F4", "Every Ask FLO control on /learn keeps the path (no jump to /flo)", page, async () => {
    if (await closeFlo(page).isVisible()) await closeFlo(page).click();
    await page.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
    await page.getByText("You are on a free preview").waitFor({ timeout: 20000 });
    const pill = page.getByRole("link", { name: "Ask FLO" });
    if ((await pill.count()) === 0) return { pass: true, detail: "no separate Ask FLO link on /learn" };
    const href = await pill.first().getAttribute("href");
    const p = await pill.first().boundingBox();
    const b = await bubble(page).boundingBox();
    const overlap = !!(p && b && p.x < b.x + b.width && b.x < p.x + p.width && p.y < b.y + b.height && b.y < p.y + p.height);
    // Tap the left edge of the pill — the part a thumb can reach when the bubble sits over its right side.
    await pill.first().click({ position: { x: 12, y: (p?.height ?? 44) / 2 } });
    await page.waitForTimeout(1500);
    const after = path(page);
    return { pass: after === "/learn", detail: `link href=${href} overlapsBubble=${overlap} tap → path ${after}` };
  });

  // ── Check-in persists ────────────────────────────────────────────────
  const checkInSheet = () => page.getByRole("dialog").filter({ hasText: "How are you right now?" });
  const readValues = async () => {
    const v = {};
    for (const f of FACTORS) v[f] = Number(await checkInSheet().getByTestId(`check-in-value-${f}`).innerText());
    return v;
  };
  const same = (a, b) => FACTORS.every((f) => a?.[f] === b[f]);
  const show = (v) => FACTORS.map((f) => v?.[f]).join("/");

  await check("K1", "Check-in: set five values and save (201, sheet closes)", page, async () => {
    if (path(page) !== "/learn") await page.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
    await bottomBar(page).getByRole("button", { name: "Check-in", exact: true }).click();
    await checkInSheet().waitFor({ timeout: 10000 });
    const sliders = checkInSheet().getByRole("slider");
    for (let i = 0; i < FACTORS.length; i++) {
      const thumb = sliders.nth(i);
      await thumb.focus();
      await thumb.press("Home");
      for (let k = 0; k < Math.floor(TARGET[FACTORS[i]] / 10); k++) await thumb.press("PageUp");
      for (let k = 0; k < TARGET[FACTORS[i]] % 10; k++) await thumb.press("ArrowRight");
    }
    const set = await readValues();
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/mood-entries/") && r.request().method() === "POST"),
      checkInSheet().getByRole("button", { name: "Save check-in" }).click(),
    ]);
    await checkInSheet().waitFor({ state: "hidden", timeout: 10000 });
    return { pass: same(set, TARGET) && res.status() === 201, detail: `set=${show(set)} POST HTTP ${res.status()}` };
  });

  await check("K2", "After reload the Check-in sheet still shows the same five values", page, async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await bottomBar(page).getByRole("button", { name: "Check-in", exact: true }).click();
    await checkInSheet().waitFor({ timeout: 10000 });
    await page
      .waitForFunction((v) => document.querySelector('[data-testid="check-in-value-confidence"]')?.textContent === String(v), TARGET.confidence, { timeout: 10000 })
      .catch(() => {});
    const v = await readValues();
    await page.waitForTimeout(800); // let the sheet finish sliding in before the screenshot
    const file = await shot(page, "check-in-after-reload");
    await page.keyboard.press("Escape");
    return { pass: same(v, TARGET), detail: `afterReload=${show(v)} expected=${show(TARGET)} · ${file}` };
  });

  await check("K3", "GET /api/mood-entries returns the saved values", page, async () => {
    const res = await api.get(`${BASE}/api/mood-entries/${userId}?limit=5`);
    const rows = await res.json();
    return { pass: res.status() === 200 && same(rows[0], TARGET), detail: `HTTP ${res.status()} rows=${rows.length} latest=${show(rows[0])}` };
  });

  // ── Free-user gates from full-site-e2e section B ─────────────────────
  const preview = open[0];
  const nextPaid = lessons.find((l) => !l.isFreePreview);
  await check("B3", "Free: completing a preview does not unlock the next paid lesson", page, async () => {
    await page.goto(`${BASE}/learn/lesson/${preview.slug}`, { waitUntil: "domcontentloaded" });
    const mark = page.getByRole("button", { name: /Mark as complete/i });
    await mark.waitFor({ timeout: 20000 });
    await mark.click();
    await page.waitForTimeout(1500);
    const after = flatten(await (await api.get(`${BASE}/api/learn/courses/${COURSE}`)).json());
    const done = after.find((l) => l.id === preview.id)?.status;
    const stillLocked = after.find((l) => l.id === nextPaid.id)?.locked;
    return { pass: done === "completed" && stillLocked === true, detail: `${preview.slug}=${done} · next paid ${nextPaid.slug} locked=${stillLocked}` };
  });

  await check("B4", "Free: progress POST on a locked lesson is 403", page, async () => {
    const res = await api.post(`${BASE}/api/learn/lessons/${nextPaid.id}/progress`, { data: { status: "completed" } });
    return { pass: res.status() === 403, detail: `slug=${nextPaid.slug} HTTP ${res.status()}` };
  });

  await check("B6", "Free: human coaching message is 403", page, async () => {
    const res = await api.post(`${BASE}/api/human-coaching/message`, { data: { message: "e2e probe" } });
    return { pass: res.status() === 403, detail: `POST /api/human-coaching/message HTTP ${res.status()}` };
  });

  // ── Another athlete cannot read or write these check-ins ─────────────
  const ctxB = await browser.newContext({ viewport: VIEWPORT });
  watch(ctxB);
  const userB = throwaway("Bo");
  await check("K4", "A second throwaway gets 403 on the first user's check-ins", null, async () => {
    const pageB = await signUp(ctxB, userB);
    const get = await ctxB.request.get(`${BASE}/api/mood-entries/${userId}`);
    const post = await ctxB.request.post(`${BASE}/api/mood-entries/${userId}`, { data: { context: "check_in", ...TARGET } });
    await pageB.close();
    return { pass: get.status() === 403 && post.status() === 403, detail: `${userB.email} GET=${get.status()} POST=${post.status()}` };
  });
  await ctxB.close();
  await ctxA.close();

  await check("E1", "No uncaught page exception during the demo taps", null, async () => ({
    pass: pageErrors.length === 0,
    detail: pageErrors.length ? pageErrors.join(" | ") : "0 uncaught exceptions",
  }));
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const chromeVersion = browser.version();
  console.log(`BASE=${BASE} label=${LABEL} mode=${MODE} chrome=${chromeVersion}`);
  let commit = null;
  try {
    commit = await publicChecks(browser);
    if (MODE === "full") await fullChecks(browser);
  } catch (e) {
    record("Z", "Suite error", "FAIL", e?.message || String(e));
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => r.status === "FAIL");
  const summary = {
    base: BASE, label: LABEL, mode: MODE, ranAt: new Date().toISOString(), commit, chromeVersion,
    throwawayEmails, results, pageErrors,
    consoleNoise: [...consoleNoise].map(([msg, count]) => ({ msg, count })),
  };
  writeFileSync(join(OUT, `run-${LABEL}.json`), JSON.stringify(summary, null, 2));

  const rows = results.map((r) => `| ${r.id} | ${r.name} | **${r.status}** | ${r.detail.replace(/\|/g, "\\|")} |`).join("\n");
  const noise = summary.consoleNoise.map((n) => `- (${n.count}×) ${n.msg.replace(/\n/g, " ")}`).join("\n") || "_none_";
  writeFileSync(join(OUT, `run-${LABEL}.md`), `# Fairn demo path — ${LABEL} run

- **Base:** ${BASE} · **mode:** ${MODE}
- **Ran at:** ${summary.ranAt}
- **/api/health commit:** \`${commit}\`
- **Chrome:** ${chromeVersion} (Playwright channel "chrome", headless, ${VIEWPORT.width}x${VIEWPORT.height})
- **Throwaway emails:** ${throwawayEmails.join(", ") || "none (no account created)"}
- **Result:** ${failed.length ? `${failed.length} FAIL` : "no FAIL"} · ${results.filter((r) => r.status === "PASS").length} PASS · ${results.filter((r) => r.status === "KNOWN").length} KNOWN

| ID | Check | Result | Detail |
|---|---|---|---|
${rows}

## Console errors and warnings (recorded, not failed)

${noise}
`);
  console.log(`\n${failed.length ? "FAILURES PRESENT" : "NO FAIL"} — wrote run-${LABEL}.json and run-${LABEL}.md`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
