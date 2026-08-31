# Investor full-site E2E

- **Ran at:** 2026-08-31T05:25:05.964Z
- **Apex:** https://cerosity.com
- **Effective base:** https://www.cerosity.com
- **Commit:** 124b2cf
- **SARAH_PW:** set
- **Result:** FAILURES PRESENT (22 passed / 1 failed)

## Failures

- FAIL **D1. daily-mood route returns 401/403/200**: anon=401 authed=404

## Passes

- PASS **0. Health check**: HTTP 200 · commit=124b2cf · llm=anthropic/claude-sonnet-5 · base=https://www.cerosity.com
- PASS **A1. Landing shows brand + FLO**: brand=true FLO=true · A1-landing.png
- PASS **A2. Google button hidden**: landingGoogleVisible=false signInGoogleText=false · A2-no-google.png
- PASS **A3. Forgot password link present**: link=true · A3-forgot-link.png
- PASS **A4. Imogen Hall img src contains imogen-hall.png**: count=1 src=/endorsers/imogen-hall.png · A4-imogen.png
- PASS **A5. Forgot-password page loads**: url=https://www.cerosity.com/forgot-password · A5-forgot-page.png
- PASS **B1. Free signup → /learn**: url=https://www.cerosity.com/learn email=e2e.free.1788153807519@cerosity-test.invalid · B1-signup-learn.png
- PASS **B2. Only freePreview lessons unlocked**: HTTP 200 hasAccess=false unlocked=2/23 previews=welcome-to-red2blue,the-performance-line · B2-curriculum.png
- PASS **B3. Complete first unlocked free-preview**: lesson=welcome-to-red2blue status=completed · B3-completed-preview.png
- PASS **B4. Free: completing a preview does NOT unlock the next non-preview**: next=the-performance-triangle locked=true · after completing welcome-to-red2blue
- PASS **B4b. Free: POST progress on a locked lesson is refused (403)**: slug=the-performance-triangle HTTP 403
- PASS **B5. Locked lesson API withholds content**: slug=the-performance-triangle locked=true contentLen=0
- PASS **B6. Human coaching gated for free**: uiGated=true POST /message HTTP 403 · B6-human-coaching-gated.png
- PASS **C1. Sarah login (iPhone 13) → /learn**: url=https://www.cerosity.com/learn viewport=390x664 · C1-sarah-learn.png
- PASS **C2. Entitled: lock flags follow the sequential rule**: hasAccess=true open=9/23 completed=8 violations=none
- PASS **C2b. Entitled: a locked-ahead lesson is withheld and refuses progress (403)**: slug=control-of-attention-rituals locked=true contentLen=0 POST HTTP 403
- PASS **C3. Entitled: completing a lesson unlocks the next one; progress increases**: marked=3 unlockedByCompletion=3 completed 8→11 pct 35→48 · tool-recognition-radar→control-of-attention-rituals:locked→open control-of-attention-rituals→where-pressure-comes-from:locked→open where-pressure-comes-from→spotting-the-loop:locked→open · C3-progress.png
- PASS **C4. Lesson API exposes prev/next**: slug=the-performance-line prev=welcome-to-red2blue next=the-performance-triangle
- PASS **C5. FLO accepts pressure story with marker**: marker=E2E-pressure-1788153807519 replyObserved=true · C5-flo-pressure.png
- PASS **C6. After reload FLO recalls marker or first-tee pressure**: marker=E2E-pressure-1788153807519 · snippet=Same as before, Sarah — first-tee freeze, now with two markers logged: E2E-pressure-1788145391042 and E2E-pressure-1788153807519. Consistent pattern, same trigger. We've confirmed it twice now — time to stop cataloguing it and start fixing  · C6-flo-recall.png
- PASS **C7. FLO fab present or page is /flo**: onFlo=true fab=false · C7-flo-fab.png
- PASS **C8. Human coaching shows Andrew Hurt (not Croxford)**: AndrewHurt=true Croxford=false · C8-human-coaching.png

## Known gap (B4)

Sequential unlock after completing a free-preview lesson is **not** implemented.
Lesson access is `isFreePreview || curriculum entitlement`, not progression.
B4 is expected to FAIL until progression gating ships.

## How to re-run

```bash
SARAH_PW='…' node docs/evidence/investor-e2e/full-site-e2e.mjs
```
