# Investor full-site E2E

- **Ran at:** 2026-08-31T05:02:42.189Z
- **Apex:** https://cerosity.com
- **Effective base:** https://www.cerosity.com
- **Commit:** d35406b
- **SARAH_PW:** not set
- **Result:** FAILURES PRESENT (14 passed / 1 failed)

## Failures

- FAIL **C0. Sarah path**: SARAH_PW not set — section C skipped (counts as fail)

## Passes

- PASS **0. Health check**: HTTP 200 · commit=d35406b · llm=anthropic/claude-sonnet-5 · base=https://www.cerosity.com
- PASS **A1. Landing shows brand + FLO**: brand=true FLO=true · A1-landing.png
- PASS **A2. Google button hidden**: landingGoogleVisible=false signInGoogleText=false · A2-no-google.png
- PASS **A3. Forgot password link present**: link=true · A3-forgot-link.png
- PASS **A4. Imogen Hall img src contains imogen-hall.png**: count=1 src=/endorsers/imogen-hall.png · A4-imogen.png
- PASS **A5. Forgot-password page loads**: url=https://www.cerosity.com/forgot-password · A5-forgot-page.png
- PASS **B1. Free signup → /learn**: url=https://www.cerosity.com/learn email=e2e.free.1788152522886@cerosity-test.invalid · B1-signup-learn.png
- PASS **B2. Only freePreview lessons unlocked**: HTTP 200 hasAccess=false unlocked=2/23 previews=welcome-to-red2blue,the-performance-line · B2-curriculum.png
- PASS **B3. Complete first unlocked free-preview**: lesson=welcome-to-red2blue status=completed · B3-completed-preview.png
- PASS **B4. Free: completing a preview does NOT unlock the next non-preview**: next=the-performance-triangle locked=true · after completing welcome-to-red2blue
- PASS **B4b. Free: POST progress on a locked lesson is refused (403)**: slug=the-performance-triangle HTTP 403
- PASS **B5. Locked lesson API withholds content**: slug=the-performance-triangle locked=true contentLen=0
- PASS **B6. Human coaching gated for free**: uiGated=true POST /message HTTP 403 · B6-human-coaching-gated.png
- PASS **D1. daily-mood route returns 401/403/200**: anon=401 authed=n/a

## Known gap (B4)

Sequential unlock after completing a free-preview lesson is **not** implemented.
Lesson access is `isFreePreview || curriculum entitlement`, not progression.
B4 is expected to FAIL until progression gating ships.

## How to re-run

```bash
SARAH_PW='…' node docs/evidence/investor-e2e/full-site-e2e.mjs
```
