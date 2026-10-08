# Fairn demo path — local run

- **Base:** http://localhost:5055 · **mode:** full
- **Ran at:** 2026-10-08T07:35:45.997Z
- **/api/health commit:** `unknown`
- **Chrome:** 154.0.8037.98 (Playwright channel "chrome", headless, 390x844)
- **Throwaway emails:** fairn.demo.ada.1791444932051@cerosity-test.invalid, fairn.demo.bo.1791444932051@cerosity-test.invalid
- **Result:** 1 FAIL · 21 PASS · 0 KNOWN

| ID | Check | Result | Detail |
|---|---|---|---|
| P0 | Health 200 with a commit | **PASS** | HTTP 200 commit=unknown |
| P1 | Landing at 390px shows brand + FLO | **PASS** | brand+FLO=true · local-landing-390.png |
| P2 | Forgot-password page loads | **PASS** | url=http://localhost:5055/forgot-password |
| P3 | Anonymous: mood entries, chat, curriculum, progress, coaching all refuse | **PASS** | GET mood-entries/1=401 POST mood-entries/1=401 POST chat=401 GET course=401 POST progress=401 POST coaching=401 |
| D1 | daily-mood refuses anonymous (old signed-in 404 not re-probed) | **PASS** | anon HTTP 401 |
| S1 | New free throwaway signs up → /learn | **PASS** | email=fairn.demo.ada.1791444932051@cerosity-test.invalid url=http://localhost:5055/learn |
| L1 | Free: only free-preview lessons open, at least one locked | **PASS** | hasAccess=false open=2 locked=21 of 23 |
| L2 | Locked lesson API returns empty content | **PASS** | slug=the-performance-triangle locked=true contentLen=0 |
| L3 | Curriculum page shows the free-preview banner and lock icons | **PASS** | lockIcons=22 · local-curriculum-lock.png |
| N1 | Bottom bar shows Curriculum, Ask FLO, Check-in | **PASS** | visible=Curriculum, Ask FLO, Check-in on /learn |
| F1 | Ask FLO (bar) opens the panel; path and history unchanged | **PASS** | path /learn→/learn history 3→3 composers 0→1 |
| F2 | Close, then the bubble opens that same panel | **PASS** | path /learn→/learn barAskFlo aria-expanded=true composers=1 |
| F3 | FLO answers "I am going Red on the first tee." in the panel | **FAIL** | POST /api/chat HTTP 503 replyChars=0 panelShows="I'm here to help with your mental game. Ask me about handling pressure, staying focused, or specific techniques like box" · local-flo-panel.png |
| F4 | Every Ask FLO control on /learn keeps the path (no jump to /flo) | **PASS** | no separate Ask FLO link on /learn |
| K1 | Check-in: set five values and save (201, sheet closes) | **PASS** | set=72/64/38/21/87 POST HTTP 201 |
| K2 | After reload the Check-in sheet still shows the same five values | **PASS** | afterReload=72/64/38/21/87 expected=72/64/38/21/87 · local-check-in-after-reload.png |
| K3 | GET /api/mood-entries returns the saved values | **PASS** | HTTP 200 rows=1 latest=72/64/38/21/87 |
| B3 | Free: completing a preview does not unlock the next paid lesson | **PASS** | welcome-to-red2blue=completed · next paid the-performance-triangle locked=true |
| B4 | Free: progress POST on a locked lesson is 403 | **PASS** | slug=the-performance-triangle HTTP 403 |
| B6 | Free: human coaching message is 403 | **PASS** | POST /api/human-coaching/message HTTP 403 |
| K4 | A second throwaway gets 403 on the first user's check-ins | **PASS** | fairn.demo.bo.1791444932051@cerosity-test.invalid GET=403 POST=403 |
| E1 | No uncaught page exception during the demo taps | **PASS** | 0 uncaught exceptions |

## Console errors and warnings (recorded, not failed)

- (4×) error: Failed to load resource: the server responded with a status of 401 (Unauthorized)
- (24×) warning: You may test your Stripe.js integration over HTTP. However, live Stripe.js integrations must use HTTPS.
- (1×) error: Failed to load resource: the server responded with a status of 503 (Service Unavailable)
