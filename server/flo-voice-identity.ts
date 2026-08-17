import { createHmac, timingSafeEqual } from "crypto";

// Who is on the phone?
//
// The VAPI custom-LLM bridge is a public server-to-server callback: no cookie,
// no session. Reading a userId straight out of call metadata would therefore
// mean anyone who can POST to the bridge could name any athlete and have FLO
// read that athlete's moods, goals and last conversation back to them.
//
// So the client never states who it is — it presents a short-lived token this
// server signed while the athlete was properly authenticated, and the bridge
// trusts nothing else. An unsigned, expired or tampered token is simply an
// anonymous call: FLO still coaches, it just has no memory to draw on.

/** A call, not a credential. Long enough to place one, short enough to be worthless later. */
const TTL_MS = 60 * 60 * 1000;

const DOMAIN = "flo-voice-identity:v1";

function signingSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(`${DOMAIN}:${payload}`).digest("base64url");
}

export function issueVoiceIdentityToken(userId: number): { token: string; expiresInSeconds: number } {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  return {
    token: `${payload}.${sign(payload)}`,
    expiresInSeconds: Math.floor(TTL_MS / 1000),
  };
}

/** The athlete this token proves, or null. Null is never an error — it means "coach anonymously". */
export function verifyVoiceIdentityToken(token: unknown): number | null {
  if (typeof token !== "string" || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [rawId, rawExpiry, presented] = parts;

  try {
    const expected = sign(`${rawId}.${rawExpiry}`);
    const a = Buffer.from(presented);
    const b = Buffer.from(expected);
    // Length check first: timingSafeEqual throws on a mismatch rather than returning false.
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    // Missing secret or malformed input — indistinguishable from a bad token, and
    // deliberately so. Nothing about the failure is reported to the caller.
    return null;
  }

  const expiresAt = Number(rawExpiry);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  const userId = Number(rawId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}
