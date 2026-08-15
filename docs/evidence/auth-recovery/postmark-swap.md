# Postmark swap — evidence

Ship SHA `eca9091`, confirmed deployed via `/api/health`. Sign-in smoke 9/9.

## Build

- `npm run check` — 156 errors, the unchanged pre-existing baseline; **zero in
  `server/email.ts`**.
- `npm run build` — clean.
- Server bundle `dist/index.js`: `api.postmarkapp.com` appears **1** time,
  `resend` appears **0** times.
- `resend` removed from `package.json`. No source file references it.

## Postmark error contract, verified against the live API

`deliver()` throws unless `response.ok && ErrorCode === 0`. Both halves matter,
because Postmark can also return **200 with a non-zero `ErrorCode`** — checking
only the status would have been a variation of the Resend bug.

The response shape was checked directly with a deliberately invalid token, no
credentials required:

```
POST https://api.postmarkapp.com/email
X-Postmark-Server-Token: invalid-token-probe

HTTP 401
{"ErrorCode":10,"Message":"Request does not contain a valid Server token."}
```

Exactly the shape the helper parses, so that failure surfaces in production as:

```
Postmark rejected the password reset email: HTTP 401 ErrorCode 10
  — Request does not contain a valid Server token.
```

## forgot-password against production

`POSTMARK_SERVER_TOKEN` was set on Railway partway through this run, which makes
the two measurements below worth keeping side by side.

A missing token throws *before* any network call; a present one costs a round
trip to Postmark. Six requests per path, `%{time_total}` seconds:

| | No account (no send) | Active fixture (send attempted) |
|---|---|---|
| **Before the token was set** | 1.53 | 1.13, 1.08 — *not slower* |
| **After the token was set** | 1.63, 0.74, 0.82, 0.74, 0.90, 0.86 → median **0.84** | 1.04, 0.83, 1.12, 1.16, 1.10, 0.98 → median **1.07** |

After the variable landed, the send path is consistently ~230 ms slower —
consistent with a real call to Postmark now being made, where before there was
none. Both requests answer 200 with the same generic sentence, as they must.

The token was written on the fixture with a 60-minute expiry each time,
confirming the flow is intact up to and including the handover to the mail
layer. The fixture (id 35) was reactivated only for these checks and set back to
deactivated with its token cleared immediately afterwards.

## What is proven, and what is not

**Proven:** the swap is complete and Resend is gone from the tree; the endpoint
and error contract are correct against the live Postmark API; the flow writes a
token and answers the athlete with one generic sentence either way; a network
call to Postmark is now being made.

**Not proven: that Postmark *accepted* the message.** An accept and a reject
both cost a round trip, so the timing cannot separate them, and the Railway CLI
on this machine is unauthorised so the log line could not be read back.

Two ways to settle it, either takes a minute:

1. **Railway → deploy logs**, grep for whichever appears:
   ```
   [EMAIL] Password reset accepted by Postmark for <email> (id <MessageID>)
   [AUTH] forgot-password failed for <email>: POSTMARK_SERVER_TOKEN is not set …
   [AUTH] forgot-password failed for <email>: Postmark rejected … ErrorCode <n> — <msg>
   ```
2. **Request a reset for your own account** at `cerosity.com/login` → "Forgot
   password?" and watch your inbox. That is the end-to-end proof, and it is the
   one test that needs a real mailbox — which is precisely why a script cannot
   do it.

If it is rejected, the most likely reason is the sending domain: Postmark →
Sender Signatures → Domains → `cerosity.com` must read **Verified** before
`flo@cerosity.com` can send.
