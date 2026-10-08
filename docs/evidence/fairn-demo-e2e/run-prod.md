# Fairn demo path — prod run

- **Base:** https://www.cerosity.com · **mode:** public
- **Ran at:** 2026-10-08T07:36:16.162Z
- **/api/health commit:** `e25e269`
- **Chrome:** 154.0.8037.98 (Playwright channel "chrome", headless, 390x844)
- **Throwaway emails:** none (no account created)
- **Result:** no FAIL · 5 PASS · 0 KNOWN

| ID | Check | Result | Detail |
|---|---|---|---|
| P0 | Health 200 with a commit | **PASS** | HTTP 200 commit=e25e269 |
| P1 | Landing at 390px shows brand + FLO | **PASS** | brand+FLO=true · landing-390.png |
| P2 | Forgot-password page loads | **PASS** | url=https://www.cerosity.com/forgot-password |
| P3 | Anonymous: mood entries, chat, curriculum, progress, coaching all refuse | **PASS** | GET mood-entries/1=401 POST mood-entries/1=401 POST chat=401 GET course=401 POST progress=401 POST coaching=401 |
| D1 | daily-mood refuses anonymous (old signed-in 404 not re-probed) | **PASS** | anon HTTP 401 |

## Console errors and warnings (recorded, not failed)

- (2×) error: Failed to load resource: the server responded with a status of 401 ()
