# Auth polish + test-user cleanup — evidence

Ship SHA `22c4e8f`, confirmed deployed via `/api/health`. All prod probes below
ran against that build. `npm run check` held at its 156-error baseline — the two
errors the limiter first introduced (`Map` iteration under this tsconfig target)
were fixed before commit, not shipped.

## Part 1 — smoke

| # | Check | Expected | Result |
|---|---|---|---|
| A | Register, 7-char password | 400 | **PASS** — `400 {"message":"Choose a password of at least 8 characters."}` |
| B | Register, ≥8-char password | 200 | **PASS** |
| C | Login with that account | 200 | **PASS** |
| D | 8 forgot-password at one email | identical generic 200 every time | **PASS** — all 8 byte-identical |
| E | forgot-password, unknown email | same generic body | **PASS** — identical sentence |
| F | 9th request while over the limit | throttled, but indistinguishable | **PASS** — see below |
| G | Signup form, 7-char password | rejected client-side | **PASS** — 3/3, zero `/api/auth/register` calls fired |

### How the throttle was proven without an observable response

By design a throttled request is externally identical to a served one — saying
"too many requests" would tell an attacker their guess landed on a real address.
So it was proven at the database instead.

After the burst, the fixture's reset digest was `752048dcd4ba…`, expiring
`13:27:14.397`. A 9th request returned the usual generic 200, and the row was
then **byte-identical** — same digest prefix, same expiry to the millisecond. The
request never reached the token write, which is only reachable past the limiter.

Timing agrees: requests 1–5 averaged ~1.20s (DB write plus the Postmark call),
requests 6–8 ~0.80s (short-circuited).

## Limits

| Scope | Limit | Window |
|---|---|---|
| Per normalised email | 5 | 15 min |
| Per IP | 20 | 15 min |

In memory, therefore **per process**. Railway runs one instance today, so these
are the real limits; a second instance would give each its own allowance and
effectively double them. `req.ip` is the true client address because
`app.set('trust proxy', 1)` is already set.

## Part 3 — deleted

Listed and classified before touching anything. Only five rows existed — the
older junk from previous sessions was already gone.

**Hard-deleted:**

| id | username | email | state at deletion |
|---|---|---|---|
| 34 | `recovery_admin_20260815` | `recovery-admin-20260815@cerosity-test.invalid` | deactivated, role student, tokens cleared |
| 35 | `recovery_athlete_20260815` | `recovery-athlete-20260815@cerosity-test.invalid` | deactivated, role student, tokens cleared |
| 36 | `polish_20260815162651` | `polish-20260815162651@cerosity-test.invalid` | fixture created for the smoke above, deleted straight after |

**Safety:** one declared FK references `users` — `athlete_profiles.user_id`,
`ON DELETE CASCADE`. Every `public` table carrying a `user_id` was then counted
for ids 34/35 and returned **zero** child rows, so the delete orphaned nothing.
Each statement was written `… and email like '%@cerosity-test.invalid' and id not
in (1,2,33)`, so it could not have reached a real account even if the id list had
been wrong.

**Untouched, as instructed:**

| id | who | email |
|---|---|---|
| 1 | Mark | `mark.e.s.thompson@gmail.com` |
| 2 | Andy | `andrew.hurt5@gmail.com` |
| 33 | Sarah demo | `sarah.demo@cerosity.com` |

Final state: exactly those three rows remain.

## Still true (re-verified, not assumed)

- `pickAdminUserUpdates` — zero mentions of `password` in its body; the admin
  PATCH still routes through it.
- `stripPassword` — returns
  `Omit<T, 'password' | 'passwordResetTokenHash' | 'passwordResetExpiresAt'>`.
- No Google control on any client sign-in surface.

## Residual risks

1. **The limiter is per process.** Scaling Railway past one instance multiplies
   the effective limit. Redis or a database-backed counter is the fix if that
   day comes.
2. **Existing weak passwords are unaffected.** The minimum applies at
   registration, reset and change; anyone who signed up earlier with a short
   password keeps it until they next change it.
3. **Login is still unthrottled.** This job covered forgot-password only.
   `POST /api/auth/login` remains open to credential stuffing at whatever rate
   Railway will serve.
