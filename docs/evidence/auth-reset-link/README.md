# Password reset was broken for every athlete — evidence

- **Fix PR:** [#11](https://github.com/TheThommo/cerosity/pull/11)
- **Production SHA verified:** `1b07843` via `https://www.cerosity.com/api/health`
- **Date:** 2026-08-31

---

## What was wrong

Two independent faults, either of which alone locks an athlete out.

### 1. Reset emails linked to a host that 404s

`server/routes.ts` built the reset link from `APP_BASE_URL`, which defaulted to
`https://cerosity.com`. The apex domain forwards only its bare root — every deep link
under it answers 404:

| URL | Before |
|---|---|
| `https://cerosity.com/reset-password?token=…` | **404** |
| `https://cerosity.com/login` | **404** |
| `https://cerosity.com/` | 301 → `http://www.cerosity.com/` (note: plain http) |
| `https://www.cerosity.com/reset-password?token=…` | **200** |

So an athlete clicked the link in their inbox and landed on a 404. There was no way
to complete a reset. The same bare-apex host was also used for the welcome CTA, the
VAPI server URL and the Google OAuth callback — all paths under `/api/*`, which the
apex also 404s.

### 2. Addresses were matched case-sensitively

`getUserByEmail` used an exact string comparison, so an athlete whose address was
stored with any capital letter could not sign in — or request a reset — by typing it
in lower case. The login throttle already keyed on the lowercased address, so the two
halves of the same request disagreed about who the athlete was.

## What changed

`shared/app-urls.ts` now owns link building. The default is the www host, and an
`APP_BASE_URL` pointed at the apex is **corrected rather than obeyed**, so this cannot
return through configuration:

| `APP_BASE_URL` | Link produced |
|---|---|
| unset | `https://www.cerosity.com/reset-password?token=…` |
| `""` | `https://www.cerosity.com/reset-password?token=…` |
| `https://cerosity.com` | `https://www.cerosity.com/reset-password?token=…` |
| `http://cerosity.com/` | `https://www.cerosity.com/reset-password?token=…` |
| `https://www.cerosity.com` | `https://www.cerosity.com/reset-password?token=…` |

`shared/email-address.ts` trims and lowercases addresses on register, on the OAuth
path and on admin edits; `getUserByEmail` compares lowercased on both sides so
existing mixed-case rows stay reachable either way.

## Production verification on `1b07843`

| Check | Result |
|---|---|
| `https://www.cerosity.com/reset-password?token=…` | **200** |
| `https://cerosity.com/reset-password?token=…` | 404 — unchanged, see the outstanding hosting item below |
| Sign in with the exact stored address | **200** |
| Sign in with `Andrew.Hurt5@Gmail.com` (mixed case) | **200** — was impossible before |
| Sign in with `  ANDREW.HURT5@GMAIL.COM  ` (padded, upper) | **200** |
| Sign in with a wrong password | **401** — no weakening |
| `POST /api/auth/forgot-password` with a mixed-case address | **200**, and a live reset token was written to the row — proof the lookup now finds the athlete |
| Full reset journey: open the www link → `POST /api/auth/reset-password` → sign in | **200 / 200 / 200** |
| Replay the spent token | **400** — single-use still enforced |
| `/api/auth/me`, FLO chat sessions, curriculum for the restored account | **200 / 200 / 200** |

Unit coverage: 24 tests via `npm test`, covering the link builder for every
`APP_BASE_URL` setting and the address normaliser. `npm run check` reports the same
150 pre-existing errors before and after — compared as a multiset per error code and
file, so no new error is hidden by an equal count.

---

## Still outstanding for Mark — apex deep links (hosting, not code)

**Emailed links no longer touch the apex, so this is not blocking anyone.** It only
matters for someone who types or bookmarks `cerosity.com/login` directly.

What the DNS currently says:

- Nameservers: `ns57.domaincontrol.com` / `ns58.domaincontrol.com` — **GoDaddy DNS**
- `cerosity.com` → A records `3.33.251.168`, `15.197.225.128` — GoDaddy's **domain
  forwarding** service, which forwards only the root and 404s every other path
- `www.cerosity.com` → CNAME `csxwll1m.up.railway.app` — the real Railway app

To make apex deep links work, point the apex at Railway instead of at GoDaddy
forwarding:

1. **Railway** → the Cerosity service → **Settings → Networking → Custom Domain** →
   add `cerosity.com` (the bare apex, alongside the existing `www`). Railway will show
   the DNS target it wants.
2. **GoDaddy** → **My Products → Domains → cerosity.com → DNS** → **Forwarding**:
   delete the existing root forwarding rule. Leaving it in place will keep overriding
   the records below.
3. Still in GoDaddy DNS, replace the two apex `A` records with the target Railway
   gave you. If GoDaddy offers a CNAME/ALIAS at the root, use that; if it only allows
   `A` at the root, use the IP Railway supplies.
4. Confirm: `curl -sI https://cerosity.com/login` should return 200 or a 301 to
   `https://www.cerosity.com/login` **preserving the path and query string**.

Also worth setting on Railway so nothing depends on the default:
`APP_BASE_URL=https://www.cerosity.com`. The code no longer needs it — an apex value
would be corrected anyway — but an explicit setting documents the intent.
