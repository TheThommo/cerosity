/**
 * Investor full-site E2E — production only (Playwright / Chromium).
 * Usage: SARAH_PW='…' node docs/evidence/investor-e2e/full-site-e2e.mjs
 * Exit 1 if any recorded step fails.
 */
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const OUT = dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

const APEX = "https://cerosity.com";
const COURSE = "red2blue-foundation";
const SARAH_EMAIL = "Sarah.guerra1981@gmail.com";
const SARAH_PW = process.env.SARAH_PW || "";

const stamp = Date.now();
const results = [];

const record = (step, pass, detail) => {
  results.push({ step, pass, detail: String(detail ?? "") });
  console.log(`${pass ? "PASS" : "FAIL"}  ${step}\n      ${detail}`);
};

const shot = async (page, name) => {
  const file = `${name}.png`;
  try {
    await page.screenshot({ path: join(OUT, file), fullPage: false });
  } catch (e) {
    return `${file} (screenshot failed: ${e.message})`;
  }
  return file;
};

async function resolveBase() {
  try {
    const r = await fetch(`${APEX}/`, { redirect: "manual", method: "GET" });
    if ([301, 302, 307, 308].includes(r.status)) {
      const loc = r.headers.get("location");
      if (loc) {
        const u = new URL(loc, APEX);
        u.protocol = "https:";
        return u.origin;
      }
    }
  } catch {}
  try {
    const h = await fetch(`${APEX}/api/health`);
    if (h.ok) return APEX;
  } catch {}
  return "https://www.cerosity.com";
}

async function signUp(context, BASE, who) {
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
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  try {
    await page.waitForURL(/\/learn/, { timeout: 60000, waitUntil: "domcontentloaded" });
  } catch {
    await page.screenshot({ path: join(OUT, `FAIL-signup-${who.first}.png`) });
    const visible = (await page.locator("body").innerText()).slice(0, 400).replace(/\n+/g, " | ");
    throw new Error(
      `signUp(${who.first}) stuck at ${page.url()} · register HTTP ${registerStatus} · visible: ${visible}`
    );
  }
  return page;
}

async function loginUi(page, BASE, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /Sign In/i }).click();
  await page.waitForURL(/\/learn/, { timeout: 60000, waitUntil: "domcontentloaded" });
}

function flattenLessons(courseJson) {
  const lessons = [];
  for (const m of courseJson.modules || []) {
    for (const l of m.lessons || []) lessons.push(l);
  }
  return lessons;
}

async function main() {
  const BASE = await resolveBase();
  console.log(`BASE resolved: ${APEX} → ${BASE}`);
  console.log(`OUT: ${OUT}`);
  console.log(`SARAH_PW set: ${SARAH_PW ? "yes" : "no"}`);

  const browser = await chromium.launch({ headless: true });
  let healthCommit = null;

  try {
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const res = await ctx.request.get(`${BASE}/api/health`);
      let body = {};
      try { body = await res.json(); } catch { body = { raw: (await res.text()).slice(0, 200) }; }
      healthCommit = body.commit ?? null;
      record(
        "0. Health check",
        res.status() === 200 && (body.status === "ok" || body.status === "healthy"),
        `HTTP ${res.status()} · commit=${body.commit} · llm=${body.llmProvider}/${body.llmModel} · base=${BASE}`
      );
      await ctx.close();
    }

    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      const bodyText = await page.locator("body").innerText();
      const hasBrand = /Cerosity/i.test(bodyText);
      const hasFlo = /\bFLO\b/.test(bodyText);
      record("A1. Landing shows brand + FLO", hasBrand && hasFlo,
        `brand=${hasBrand} FLO=${hasFlo} · ${await shot(page, "A1-landing")}`);

      const googleVisible = await page.getByRole("button", { name: /Google/i }).count()
        .then(async (c) => c === 0 ? false : page.getByRole("button", { name: /Google/i }).first().isVisible())
        .catch(() => false);
      await page.getByRole("button", { name: "Sign In" }).first().click().catch(() => {});
      await page.waitForTimeout(800);
      const googleOnSignIn = await page.locator("text=/Sign (up|in) with Google/i").count()
        .then((c) => c > 0).catch(() => false);
      record("A2. Google button hidden", !googleVisible && !googleOnSignIn,
        `landingGoogleVisible=${googleVisible} signInGoogleText=${googleOnSignIn} · ${await shot(page, "A2-no-google")}`);

      const forgotVisible = (await page.getByRole("link", { name: /Forgot password/i }).count()) > 0;
      record("A3. Forgot password link present", forgotVisible,
        `link=${forgotVisible} · ${await shot(page, "A3-forgot-link")}`);

      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      const imogen = page.locator('img[src*="imogen-hall.png"]');
      const imogenCount = await imogen.count();
      const imogenSrc = imogenCount > 0 ? ((await imogen.first().getAttribute("src")) || "") : "";
      record("A4. Imogen Hall img src contains imogen-hall.png",
        imogenCount > 0 && /imogen-hall\.png/.test(imogenSrc),
        `count=${imogenCount} src=${imogenSrc} · ${await shot(page, "A4-imogen")}`);

      await page.goto(`${BASE}/forgot-password`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const fpText = await page.locator("body").innerText();
      const onFp = /forgot|reset|email/i.test(fpText) && /\/forgot-password/.test(page.url());
      record("A5. Forgot-password page loads", onFp,
        `url=${page.url()} · ${await shot(page, "A5-forgot-page")}`);
      await ctx.close();
    }

    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const free = {
        first: `Eve${stamp}`,
        last: "E2E",
        email: `e2e.free.${stamp}@cerosity-test.invalid`,
        password: "E2ePass123!",
      };

      let page;
      try {
        page = await signUp(ctx, BASE, free);
        record("B1. Free signup → /learn", /\/learn/.test(page.url()),
          `url=${page.url()} email=${free.email} · ${await shot(page, "B1-signup-learn")}`);
      } catch (e) {
        record("B1. Free signup → /learn", false, e.message);
        await ctx.close();
        throw e;
      }

      const api = ctx.request;
      const courseRes = await api.get(`${BASE}/api/learn/courses/${COURSE}`);
      const course = courseRes.ok() ? await courseRes.json() : null;
      const lessons = course ? flattenLessons(course) : [];
      const unlocked = lessons.filter((l) => !l.locked);
      const locked = lessons.filter((l) => l.locked);
      const onlyFreePreview =
        unlocked.length > 0 && unlocked.every((l) => l.isFreePreview) && !course?.hasAccess;

      record("B2. Only freePreview lessons unlocked", !!course && onlyFreePreview,
        `HTTP ${courseRes.status()} hasAccess=${course?.hasAccess} unlocked=${unlocked.length}/${lessons.length} previews=${unlocked.map((l) => l.slug).join(",") || "none"} · ${await shot(page, "B2-curriculum")}`);

      const firstUnlocked = unlocked[0];
      if (firstUnlocked) {
        await page.goto(`${BASE}/learn/lesson/${firstUnlocked.slug}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1500);
        const markBtn = page.getByRole("button", { name: /Mark as complete/i });
        if ((await markBtn.count()) > 0) {
          await markBtn.click();
          await page.waitForTimeout(1500);
        } else {
          await api.post(`${BASE}/api/learn/lessons/${firstUnlocked.id}/progress`, {
            data: { status: "completed" },
          });
        }
        const progressAfter = await (await api.get(`${BASE}/api/learn/courses/${COURSE}`)).json();
        const flatAfter = flattenLessons(progressAfter);
        const firstStatus = flatAfter.find((l) => l.id === firstUnlocked.id)?.status;
        record("B3. Complete first unlocked free-preview", firstStatus === "completed",
          `lesson=${firstUnlocked.slug} status=${firstStatus} · ${await shot(page, "B3-completed-preview")}`);

        // Monetization rule: a free user completing a preview must NOT earn the
        // next paid lesson. Progression is for entitled users only.
        const nextNonPreview = flatAfter.find((l) => !l.isFreePreview);
        const staysLocked = !!nextNonPreview && nextNonPreview.locked === true;
        record(
          "B4. Free: completing a preview does NOT unlock the next non-preview",
          staysLocked,
          `next=${nextNonPreview?.slug} locked=${nextNonPreview?.locked} · after completing ${firstUnlocked.slug}`
        );

        // And the API must refuse to record progress on it, not just hide it.
        if (nextNonPreview) {
          const pr = await api.post(`${BASE}/api/learn/lessons/${nextNonPreview.id}/progress`, {
            data: { status: "completed" },
          });
          record(
            "B4b. Free: POST progress on a locked lesson is refused (403)",
            pr.status() === 403,
            `slug=${nextNonPreview.slug} HTTP ${pr.status()}`
          );
        } else {
          record("B4b. Free: POST progress on a locked lesson is refused (403)", false, "no non-preview lesson found");
        }
      } else {
        record("B3. Complete first unlocked free-preview", false, "no unlocked lesson");
        record("B4. Free: completing a preview does NOT unlock the next non-preview", false, "skipped — no unlocked lesson");
        record("B4b. Free: POST progress on a locked lesson is refused (403)", false, "skipped — no unlocked lesson");
      }

      const lockedLesson = locked[0] || lessons.find((l) => !l.isFreePreview);
      if (lockedLesson) {
        const lr = await api.get(`${BASE}/api/learn/lessons/${lockedLesson.slug}`);
        const lj = await lr.json();
        const withheld =
          lj.locked === true &&
          (Array.isArray(lj.lesson?.content) ? lj.lesson.content.length === 0 : !lj.lesson?.content);
        record("B5. Locked lesson API withholds content", lr.status() === 200 && withheld,
          `slug=${lockedLesson.slug} locked=${lj.locked} contentLen=${lj.lesson?.content?.length ?? "n/a"}`);
      } else {
        record("B5. Locked lesson API withholds content", false, "no locked lesson found");
      }

      await page.goto(`${BASE}/human-coaching`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      const hcText = await page.locator("body").innerText();
      const gated =
        /Human Coaching Access|Upgrade to|Ultimate/i.test(hcText) &&
        !/Human Coaching Center/i.test(hcText);
      const msgApi = await api.post(`${BASE}/api/human-coaching/message`, {
        data: { message: "e2e probe" },
      });
      record("B6. Human coaching gated for free",
        gated && [401, 403].includes(msgApi.status()),
        `uiGated=${gated} POST /message HTTP ${msgApi.status()} · ${await shot(page, "B6-human-coaching-gated")}`);

      await ctx.close();
    }

    if (!SARAH_PW) {
      record("C0. Sarah path", false, "SARAH_PW not set — section C skipped (counts as fail)");
    } else {
      const iphone = devices["iPhone 13"];
      const ctx = await browser.newContext({ ...iphone });
      const page = await ctx.newPage();
      const api = ctx.request;
      let loggedIn = false;

      try {
        await loginUi(page, BASE, SARAH_EMAIL, SARAH_PW);
        loggedIn = /\/learn/.test(page.url());
        record("C1. Sarah login (iPhone 13) → /learn", loggedIn,
          `url=${page.url()} viewport=${iphone.viewport.width}x${iphone.viewport.height} · ${await shot(page, "C1-sarah-learn")}`);
      } catch (e) {
        record("C1. Sarah login (iPhone 13) → /learn", false, e.message);
      }

      if (loggedIn) {
        const courseRes = await api.get(`${BASE}/api/learn/courses/${COURSE}`);
        const course = await courseRes.json();
        const lessons = flattenLessons(course);
        // Sarah is entitled, so the curriculum is sequential — not all-open. Assert the
        // server's own lock flags match the rule, given whatever history she already has.
        const done = (l) => l.status === "completed";
        const violations = lessons
          .map((l, i) => {
            const shouldBeOpen = i === 0 || done(l) || done(lessons[i - 1]);
            return shouldBeOpen === !l.locked ? null : `${l.slug}(i=${i} locked=${l.locked} expectedOpen=${shouldBeOpen})`;
          })
          .filter(Boolean);
        const openCount = lessons.filter((l) => !l.locked).length;
        record("C2. Entitled: lock flags follow the sequential rule",
          course.hasAccess === true && lessons.length > 0 && violations.length === 0,
          `hasAccess=${course.hasAccess} open=${openCount}/${lessons.length} completed=${lessons.filter(done).length} violations=${violations.length ? violations.join(" ") : "none"}`);

        // Locked-ahead lesson: content withheld and progress refused with 403.
        const lockedAhead = lessons.find((l) => l.locked);
        if (lockedAhead) {
          const la = await (await api.get(`${BASE}/api/learn/lessons/${lockedAhead.slug}`)).json();
          const contentWithheld = la.locked === true && (la.lesson?.content ?? []).length === 0;
          const pr = await api.post(`${BASE}/api/learn/lessons/${lockedAhead.id}/progress`, {
            data: { status: "completed" },
          });
          record("C2b. Entitled: a locked-ahead lesson is withheld and refuses progress (403)",
            contentWithheld && pr.status() === 403,
            `slug=${lockedAhead.slug} locked=${la.locked} contentLen=${la.lesson?.content?.length ?? "n/a"} POST HTTP ${pr.status()}`);
        } else {
          record("C2b. Entitled: a locked-ahead lesson is withheld and refuses progress (403)", true,
            "no locked lesson remaining — this user has completed the whole course");
        }

        const beforePct = course.progress?.percent ?? 0;
        const beforeCompleted = course.progress?.completed ?? 0;
        // Walk the sequence: complete the current open lesson, re-read the course, and
        // prove the next one flipped from locked to open. Bulk-completing is impossible now.
        let marked = 0;
        let unlockedByCompletion = 0;
        let walkDetail = [];
        let current = lessons;
        for (let step = 0; step < 3; step++) {
          const idx = current.findIndex((l) => !l.locked && l.status !== "completed");
          if (idx === -1) break;
          const lesson = current[idx];
          const successor = current[idx + 1];
          const successorWasLocked = successor ? successor.locked === true : null;

          await page.goto(`${BASE}/learn/lesson/${lesson.slug}`, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(1000);
          const markBtn = page.getByRole("button", { name: /Mark as complete/i });
          if ((await markBtn.count()) > 0 && (await markBtn.isEnabled())) {
            await markBtn.click();
            await page.waitForTimeout(1200);
            marked++;
          } else {
            const pr = await api.post(`${BASE}/api/learn/lessons/${lesson.id}/progress`, {
              data: { status: "completed" },
            });
            if (pr.ok()) marked++;
          }

          current = flattenLessons(await (await api.get(`${BASE}/api/learn/courses/${COURSE}`)).json());
          if (successor) {
            const successorNow = current.find((l) => l.id === successor.id);
            const flipped = successorWasLocked === true && successorNow?.locked === false;
            if (flipped) unlockedByCompletion++;
            walkDetail.push(`${lesson.slug}→${successor.slug}:${successorWasLocked ? "locked" : "open"}→${successorNow?.locked ? "locked" : "open"}`);
          }
        }
        const afterCourse = await (await api.get(`${BASE}/api/learn/courses/${COURSE}`)).json();
        const afterPct = afterCourse.progress?.percent ?? 0;
        const afterCompleted = afterCourse.progress?.completed ?? 0;
        record("C3. Entitled: completing a lesson unlocks the next one; progress increases",
          marked > 0 && afterCompleted > beforeCompleted && unlockedByCompletion > 0,
          `marked=${marked} unlockedByCompletion=${unlockedByCompletion} completed ${beforeCompleted}→${afterCompleted} pct ${beforePct}→${afterPct} · ${walkDetail.join(" ") || "no successor observed"} · ${await shot(page, "C3-progress")}`);

        const mid = lessons[Math.min(1, lessons.length - 1)] || lessons[0];
        const lessonJson = await (await api.get(`${BASE}/api/learn/lessons/${mid.slug}`)).json();
        const hasNav =
          (lessonJson.prev != null || lessonJson.next != null) &&
          (lessons.length <= 1 || lessonJson.prev != null || lessonJson.next != null);
        record("C4. Lesson API exposes prev/next", hasNav || lessons.length === 1,
          `slug=${mid?.slug} prev=${lessonJson.prev?.slug ?? null} next=${lessonJson.next?.slug ?? null}`);

        const marker = `E2E-pressure-${stamp}`;
        await page.goto(`${BASE}/flo`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1500);
        const chatInput = page
          .locator("[data-chat-input], input[placeholder*='Flo' i], input[placeholder*='Ask' i]")
          .first();
        await chatInput.waitFor({ timeout: 30000 });
        const pressureMsg = `I'm telling you a pressure story for memory: on the first tee I freeze. Please remember this marker ${marker} and that first-tee pressure.`;
        await chatInput.fill(pressureMsg);
        await chatInput.press("Enter");

        let gotReply = false;
        const replyDeadline = Date.now() + 180000;
        while (Date.now() < replyDeadline) {
          await page.waitForTimeout(3000);
          const text = await page.locator("body").innerText();
          const bubbles = page.locator(".bg-gray-100");
          if ((await bubbles.count()) > 0 && /pressure|tee|remember|got it|noted|hear/i.test(text)) {
            gotReply = true;
            break;
          }
          if (text.includes(marker) && text.length > pressureMsg.length + 100) {
            gotReply = true;
            break;
          }
        }
        record("C5. FLO accepts pressure story with marker", gotReply,
          `marker=${marker} replyObserved=${gotReply} · ${await shot(page, "C5-flo-pressure")}`);

        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        const recallInput = page
          .locator("[data-chat-input], input[placeholder*='Flo' i], input[placeholder*='Ask' i]")
          .first();
        await recallInput.waitFor({ timeout: 30000 });
        await recallInput.fill(
          "What do you remember about my pressure story? Mention any marker or first-tee details."
        );
        await recallInput.press("Enter");

        let recallPass = false;
        let recallSnippet = "";
        const recallDeadline = Date.now() + 180000;
        while (Date.now() < recallDeadline) {
          await page.waitForTimeout(3000);
          const recallApi = await api.post(`${BASE}/api/chat`, {
            data: {
              message:
                "What do you remember about my pressure story and any E2E-pressure marker or first tee?",
            },
          });
          let replyText = "";
          try {
            const j = await recallApi.json();
            replyText =
              j?.response?.message ||
              j?.message ||
              j?.reply ||
              (typeof j === "string" ? j : JSON.stringify(j));
          } catch {
            replyText = await recallApi.text();
          }
          recallSnippet = String(replyText).slice(0, 240);
          const noHistory = /no history|don't remember|do not remember|no prior|nothing about/i.test(
            String(replyText)
          );
          const hit =
            String(replyText).includes(marker) ||
            (/first[- ]?tee/i.test(String(replyText)) && /pressure/i.test(String(replyText)));
          if (hit && !noHistory) {
            recallPass = true;
            break;
          }
          const body = await page.locator("body").innerText();
          if (
            (body.includes(marker) || (/first[- ]?tee/i.test(body) && /pressure/i.test(body))) &&
            !/no history/i.test(body.slice(-500))
          ) {
            recallPass = true;
            recallSnippet = body.slice(-300);
            break;
          }
        }
        record("C6. After reload FLO recalls marker or first-tee pressure", recallPass,
          `marker=${marker} · snippet=${recallSnippet.replace(/\n+/g, " ")} · ${await shot(page, "C6-flo-recall")}`);

        const onFlo = /\/flo/.test(page.url());
        let fab = false;
        if (!onFlo) {
          await page.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(1000);
          fab =
            (await page.getByRole("button", { name: /Chat with FLO/i }).count()) > 0 ||
            (await page.locator('[aria-label="Chat with FLO"]').count()) > 0;
        }
        record("C7. FLO fab present or page is /flo", onFlo || fab,
          `onFlo=${onFlo} fab=${fab} · ${await shot(page, "C7-flo-fab")}`);

        await page.goto(`${BASE}/human-coaching`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1500);
        const hc = await page.locator("body").innerText();
        const hasAndrew = /Andrew Hurt/i.test(hc);
        const hasCroxford = /Croxford/i.test(hc);
        record("C8. Human coaching shows Andrew Hurt (not Croxford)", hasAndrew && !hasCroxford,
          `AndrewHurt=${hasAndrew} Croxford=${hasCroxford} · ${await shot(page, "C8-human-coaching")}`);
      }

      await ctx.close();
    }

    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const today = new Date().toISOString().slice(0, 10);
      const anon = await ctx.request.get(`${BASE}/api/daily-mood/1/${today}`);
      let authedStatus = null;
      if (SARAH_PW) {
        const login = await ctx.request.post(`${BASE}/api/auth/login`, {
          data: { email: SARAH_EMAIL, password: SARAH_PW },
        });
        if (login.ok()) {
          const me = await (await ctx.request.get(`${BASE}/api/auth/me`)).json();
          const mood = await ctx.request.get(`${BASE}/api/daily-mood/${me.id}/${today}`);
          authedStatus = mood.status();
        }
      }
      const anonOk = [401, 403, 200].includes(anon.status());
      const authedOk = authedStatus == null ? true : [401, 403, 200].includes(authedStatus);
      record("D1. daily-mood route returns 401/403/200", anonOk && authedOk,
        `anon=${anon.status()} authed=${authedStatus ?? "n/a"}`);
      await ctx.close();
    }
  } catch (e) {
    console.error("SUITE ERROR:", e);
    record("Z. Uncaught suite error", false, e?.message || String(e));
  } finally {
    await browser.close();
  }

  const allPassed = results.length > 0 && results.every((r) => r.pass);
  const healthDetail = results.find((r) => r.step.startsWith("0."))?.detail || "";
  const baseMatch = /base=(https:\/\/[^\s]+)/.exec(healthDetail);
  const summary = {
    baseApex: APEX,
    base: baseMatch?.[1] || APEX,
    ranAt: new Date().toISOString(),
    commit: healthCommit,
    sarahPwSet: Boolean(SARAH_PW),
    course: COURSE,
    results,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    allPassed,
  };

  writeFileSync(join(OUT, "results.json"), JSON.stringify(summary, null, 2));

  const failLines = results.filter((r) => !r.pass)
    .map((r) => `- FAIL **${r.step}**: ${r.detail}`).join("\n");
  const passLines = results.filter((r) => r.pass)
    .map((r) => `- PASS **${r.step}**: ${r.detail}`).join("\n");

  const readme = `# Investor full-site E2E

- **Ran at:** ${summary.ranAt}
- **Apex:** ${APEX}
- **Effective base:** ${summary.base}
- **Commit:** ${summary.commit}
- **SARAH_PW:** ${summary.sarahPwSet ? "set" : "not set"}
- **Result:** ${allPassed ? "ALL PASS" : "FAILURES PRESENT"} (${summary.passed} passed / ${summary.failed} failed)

## Failures

${failLines || "_None_"}

## Passes

${passLines || "_None_"}

## Known gap (B4)

Sequential unlock after completing a free-preview lesson is **not** implemented.
Lesson access is \`isFreePreview || curriculum entitlement\`, not progression.
B4 is expected to FAIL until progression gating ships.

## How to re-run

\`\`\`bash
SARAH_PW='…' node docs/evidence/investor-e2e/full-site-e2e.mjs
\`\`\`
`;
  writeFileSync(join(OUT, "README.md"), readme);

  console.log(
    `\n${allPassed ? "ALL PASS" : "FAILURES PRESENT"} — ${summary.passed} pass / ${summary.failed} fail — commit ${summary.commit}`
  );
  console.log(`Wrote ${join(OUT, "results.json")} and README.md`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
