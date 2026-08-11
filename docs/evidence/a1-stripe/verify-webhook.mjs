// A1 — proof that the Stripe webhook fix actually works.
//
// The production secret lives only in Railway, so a correctly-signed event
// cannot be constructed against cerosity.com from here. What this does instead
// is exercise the exact mechanism the fix depends on, with a locally generated
// secret, and — importantly — reproduce the original bug alongside it:
//
//   FIXED  order: express.raw() on the webhook path, then express.json()
//   BROKEN order: express.json() first (what production shipped before)
//
// Same signed payload, same handler, only the middleware order differs.
//
// Usage: node docs/evidence/a1-stripe/verify-webhook.mjs
import express from "express";
import Stripe from "stripe";
import crypto from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const OUT = process.env.A1_OUT_DIR || dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

// Local, throwaway. Never a real secret — the real one stays in Railway.
const TEST_SECRET = "whsec_" + crypto.randomBytes(24).toString("hex");
const stripe = new Stripe("sk_test_not_used_for_signature_verification");

const EVENT = {
  id: "evt_local_verification",
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_local",
      object: "checkout.session",
      customer: "cus_local_test",
      metadata: { userId: "4242", tier: "premium" },
    },
  },
};
const PAYLOAD = JSON.stringify(EVENT);

function signature(payload, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

const lines = [];
const log = (s) => { lines.push(s); console.log(s); };

/** Boots an app with the given middleware order and returns what the handler saw. */
async function run(label, mountRawFirst) {
  const app = express();
  const seen = { bodyType: null, verified: false, error: null, granted: null };

  if (mountRawFirst) {
    app.use("/api/webhook/stripe", express.raw({ type: "application/json" }));
  }
  app.use(express.json());

  app.post("/api/webhook/stripe", (req, res) => {
    seen.bodyType = Buffer.isBuffer(req.body) ? "Buffer" : typeof req.body;
    try {
      const event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], TEST_SECRET);
      seen.verified = true;
      // Mirrors grantPaidAccess: the tier is only ever read from a verified event.
      const md = event.data.object.metadata;
      seen.granted = { userId: Number(md.userId), tier: md.tier };
      res.json({ received: true });
    } catch (err) {
      seen.error = err.message.split("\n")[0];
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const { port } = server.address();

  const resp = await fetch(`http://127.0.0.1:${port}/api/webhook/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": signature(PAYLOAD, TEST_SECRET) },
    body: PAYLOAD,
  });
  server.close();

  log(`\n${label}`);
  log(`   req.body seen by handler : ${seen.bodyType}`);
  log(`   HTTP                     : ${resp.status}`);
  log(`   signature verified       : ${seen.verified}`);
  if (seen.error) log(`   error                    : ${seen.error}`);
  if (seen.granted) log(`   would grant              : tier "${seen.granted.tier}" to user ${seen.granted.userId}`);
  return { ...seen, status: resp.status };
}

log("A1 — Stripe webhook signature verification");
log(`Payload: ${PAYLOAD.length} bytes · secret: locally generated, ${TEST_SECRET.length} chars (value not printed)`);

const fixed = await run("FIXED order — express.raw() on the webhook path, then express.json()", true);
const broken = await run("BROKEN order — express.json() first (what production shipped before)", false);

// A wrong secret must fail even with the correct middleware order.
const app = express();
app.use("/api/webhook/stripe", express.raw({ type: "application/json" }));
let wrongSecretStatus = null;
app.post("/api/webhook/stripe", (req, res) => {
  try {
    stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], TEST_SECRET);
    res.json({ received: true });
  } catch {
    res.status(400).send("Webhook Error");
  }
});
const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
const otherSecret = "whsec_" + crypto.randomBytes(24).toString("hex");
wrongSecretStatus = (await fetch(`http://127.0.0.1:${srv.address().port}/api/webhook/stripe`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "stripe-signature": signature(PAYLOAD, otherSecret) },
  body: PAYLOAD,
})).status;
srv.close();
log(`\nWRONG SECRET — correctly-signed payload, different secret`);
log(`   HTTP                     : ${wrongSecretStatus} (must be 400)`);

const pass =
  fixed.bodyType === "Buffer" && fixed.verified && fixed.status === 200 &&
  fixed.granted?.tier === "premium" && fixed.granted?.userId === 4242 &&
  broken.bodyType === "object" && !broken.verified && broken.status === 400 &&
  wrongSecretStatus === 400;

log(`\n${pass ? "PASS" : "FAIL"} — fixed order verifies and grants; old order fails exactly as A1 described; wrong secret rejected`);
writeFileSync(join(OUT, "verify-webhook.log"), lines.join("\n") + "\n");
process.exitCode = pass ? 0 : 1;
