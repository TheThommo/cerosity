# Human coaching — evidence, 17 August 2026

Prod commit under test: `6fd5443` (page + endpoints), later confirmed on `cef6ff9`.

## What was wrong

`client/src/pages/human-coaching.tsx` hardcoded a coach called **Mark Croxford**
in JSX. There was no such row, no assignment, and no inbox behind him. Beneath
that, the three `/api/human-coaching/*` endpoints built a response object,
discarded it, and answered `"Message sent to your coach. They will respond
within 24 hours."` Nothing was sent to anyone. The page also showed a five-star
row and "150+ Golfers Coached", neither of which had a source, and the
**Upgrade to Ultimate** button had no `onClick` at all.

## What ships now

The coach is declared once, in `shared/human-coach.ts` — **Andrew Hurt**,
Certified Red2Blue Master Coach — and the page, the initials and the
notification recipient all read from it.

| File | Check | Result |
|---|---|---|
| `01-deployed-bundle-coach.txt` | coach config as it appears in the deployed JS bundle | Andrew Hurt / AH / Certified Red2Blue Master Coach |
| — | `grep -c Croxford` in deployed bundle | **0** |
| — | `grep -c "Golfers Coached"` in deployed bundle | **0** |
| `02-gate-truth-table.txt` | `hasFeatureAccess(tier, role, "humanCoaching")` | ultimate/admin/coach true; free, flo, premium false |
| `03-message-200.txt` | `POST /api/human-coaching/message` as an entitled athlete | **200**, Postmark MessageID returned |
| `04-review-200.txt` | `POST /api/human-coaching/progress-review` | **200**, Postmark MessageID returned |
| `05-schedule-200.txt` | `POST /api/human-coaching/schedule-request` | **200**, Postmark MessageID returned |
| — | same endpoint with no session | **401** |
| — | `POST .../message` with a blank body | **400** "A message is required" |

The three MessageIDs are Postmark's own acknowledgement that it accepted the
mail for delivery to `andrew.hurt5@gmail.com`, copied to Mark. That is the whole
point of the change: the request now leaves the building. A Postmark rejection
is answered **502** and logged rather than swallowed, and all three mutations
have `onError` toasts, so a failure reaches the athlete instead of being
reported as success.

The schedule button asks for a session — it does not claim one. No calendar is
consulted, no time is held, and the copy on the button, the toast and the email
all say so.

## Gate

`hasFeatureAccess(..., "humanCoaching")` now drives the nav entry and the page,
replacing a `subscriptionTier === 'ultimate'` string comparison that had already
drifted from the server's `requireUltimate` — that also admits admin and coach
roles. The route stays mounted for everyone so a non-entitled athlete who types
the URL meets the upgrade card rather than the 404 fallback, and that card's
button now starts the same Stripe checkout the free dashboard uses, priced from
`TIER_PRICING`.

## Not proven here

**The free-tier gate was not exercised against a live non-entitled session.**
All three accounts in production (Mark, Andy, Sarah demo) are `ultimate`, and
producing that evidence would have meant registering an account and
authenticating with a password — which this run would not do. The gate is
instead proven at the function (`02-gate-truth-table.txt`) and by the server's
unchanged `requireUltimate` middleware.

To close it by hand, sign in as any non-ultimate account and open
`/human-coaching`: the expected result is the upgrade card, and

```bash
curl -s -o /dev/null -w '%{http_code}\n' -b <that-session> -X POST \
  https://cerosity.com/api/human-coaching/message \
  -H 'Content-Type: application/json' -d '{"message":"x"}'
```

should print `403`.

**No authenticated screenshot.** Capturing the entitled view in a browser would
have required pasting a live session cookie into a logged tool call. The
deployed-bundle extract in `01-deployed-bundle-coach.txt` is the equivalent
proof of what renders.
