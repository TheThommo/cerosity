# Login throttle — evidence, 17 August 2026

Prod commit under test: `e28f3d8`.

`POST /api/auth/login` had no limit on it. Someone with a credential dump could
work through it at whatever rate the network allowed, against every account on
the platform, and nothing in the logs would have looked unusual.

## The limits

| Key | Limit | Window |
|---|---|---|
| `email:<lowercased address>` | 10 **failed** attempts | 15 minutes |
| `ip:<caller>` | 30 **failed** attempts | 15 minutes |

Only failures count. A correct password clears that address's tally; the
caller's own tally survives, so a machine grinding through a list cannot reset
it by signing into one account it does own. The check runs *before* the password
is verified, so a locked-out run costs a map lookup rather than a bcrypt
comparison.

Counters live in memory and are therefore per process. Railway runs one instance
today, so these are the real numbers; a second instance would double them. Same
trade as the forgot-password throttle, and the sliding window is now shared
between them rather than duplicated.

## Proven at the row

`01-email-lockout.txt` — eleven failed attempts against one address:

- attempts 1–10 → **401** `Invalid email or password`
- attempt 11 → **429** `Too many sign-in attempts. Wait 15 minutes and try again, or reset your password.`

The 429 body says nothing about whether the address exists. Neither did the 401.

## Timing

`02-timing-parity.txt` — three requests against an address with no account, then
three against a real one, both with a wrong password:

- unknown address: 1.74s, 0.82s, 0.88s
- known address: 0.89s, 1.02s, 1.03s

Before this change the unknown-address path returned *before* bcrypt ran, so it
answered in about a millisecond of server time while a real address took a
hundred — an enumeration oracle read with a stopwatch instead of off the screen.
`loginUser` now compares against a decoy hash on that path, which costs the same
ten rounds and is thrown away.

These figures are round-trip times over the public internet and are dominated by
network latency, so they show the absence of an order-of-magnitude gap rather
than millisecond parity. The mechanism, not the measurement, is the guarantee:
both paths now run exactly one bcrypt comparison.
