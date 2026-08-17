import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import Stripe from "stripe";
import { z } from "zod";
import { storage } from "./storage";
import { insertAssessmentSchema, insertChatSessionSchema, insertUserProgressSchema, insertPreShotRoutineSchema, insertMentalSkillsXCheckSchema, insertControlCircleSchema, insertDailyMoodSchema, insertUserGoalSchema, type User } from "@shared/schema";
import { hasFeatureAccess, isSubscriptionTier, tierAmountInCents, TIER_PRICING, type SubscriptionTier } from "@shared/entitlements";
import { MIN_PASSWORD_LENGTH, passwordTooShortMessage } from "@shared/auth-rules";
import { getCoachingResponse, analyzeAssessmentResults, generatePersonalizedPlan } from "./gemini";
import { sessionConfig, requireAuth, requirePremium, requireUltimate, requireAdmin, requireCoach, requireOwnUserOrAdmin, registerUser, loginUser, AuthRequest, isGoogleOAuthConfigured, getGoogleAuthUrl, handleGoogleCallback, hashPassword, verifyPassword } from "./auth";
import { sendLeadRegistrationEmail, sendAdminLeadNotification, sendPasswordResetEmail, sendCoachingRequestEmail } from "./email";
import { PRIMARY_HUMAN_COACH } from "@shared/human-coach";
import { buildFloPrompt, buildLandingSalesDirective, clearBrainDocsCache, clearSportContextCache } from "./flo-prompt";
import { formatAthleteContextForPrompt } from "./flo-athlete-context";
import { applyAthleteFacts } from "./flo-memory";
import { primaryProvider, anthropicModel, geminiModel } from "./llm";
import { recommendationEngine } from "./recommendationEngine";
import { debugLogger, withErrorLogging } from "./debug";
import { handleVapiWebhook } from "./vapi";
import multer from "multer";
import * as pdfParse from "pdf-parse";
import { randomBytes, createHash } from "crypto";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Fix: Use testing keys (the env variables are swapped - "public" contains secret key)
const stripeSecretKey = process.env.TESTING_VITE_STRIPE_PUBLIC_KEY || process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  debugLogger.error('stripe', 'Missing required Stripe secret key');
  throw new Error('Missing required Stripe secret key');
}

debugLogger.success('stripe', `Initializing Stripe with testing secret key (${stripeSecretKey.substring(0, 7)}...)`);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-05-28.basil",
});
debugLogger.success('stripe', 'Stripe initialized successfully');

// ── Admin user administration ─────────────────────────────────────
/** Roles HQ may assign. Console roles are derived from these (appRoleToConsoleRole). */
const ADMIN_ASSIGNABLE_ROLES = ['student', 'coach', 'admin'];

/**
 * The admin user APIs return whole rows; the bcrypt hash is not theirs to hand
 * out, and neither is the password-reset digest — anyone holding that could
 * finish a reset the athlete started and take the account.
 */
function stripPassword<T extends {
  password?: string;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
}>(user: T): Omit<T, 'password' | 'passwordResetTokenHash' | 'passwordResetExpiresAt'> {
  const { password, passwordResetTokenHash, passwordResetExpiresAt, ...rest } = user;
  return rest;
}

/** Reset tokens live in the athlete's inbox; the database only ever sees this. */
function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Long enough that a stolen link is the realistic attack, not a guessed one. */
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://cerosity.com';

/**
 * Throttle for forgot-password. Unthrottled it is a mail cannon: anyone can
 * point it at a known address and send that person a reset email as fast as a
 * loop runs.
 *
 * In memory, and therefore per process. Railway runs a single instance today so
 * this holds; if that ever becomes two, each gets its own allowance and the
 * effective limit doubles. That is the trade for not adding Redis to an MVP.
 *
 * The email key is normalised so casing cannot buy extra attempts, and req.ip is
 * the real client address because trust proxy is set further down.
 */
const FORGOT_WINDOW_MS = 15 * 60 * 1000;
const FORGOT_MAX_PER_EMAIL = 5;
const FORGOT_MAX_PER_IP = 20;
const forgotAttempts = new Map<string, number[]>();

/** Records this attempt and reports whether the caller has now gone over. */
function forgotOverLimit(key: string, max: number): boolean {
  const now = Date.now();
  const recent = (forgotAttempts.get(key) ?? []).filter((at) => now - at < FORGOT_WINDOW_MS);
  recent.push(now);
  forgotAttempts.set(key, recent);

  // Keys come from the request, so the map cannot be allowed to grow without
  // bound. Anything with nothing left inside the window is dead weight.
  // forEach rather than for..of: this tsconfig's target predates downlevel Map
  // iteration, and a prune loop is not worth changing the build target over.
  if (forgotAttempts.size > 5000) {
    forgotAttempts.forEach((times, seen) => {
      if (!times.some((at) => now - at < FORGOT_WINDOW_MS)) forgotAttempts.delete(seen);
    });
  }

  return recent.length > max;
}

/**
 * The only fields HQ may write to a user. Anything else in the body is dropped —
 * notably `password`, which the old pass-through PATCH would have written to the
 * column as clear text, and `stripeCustomerId`, which must only ever come from
 * Stripe.
 */
function pickAdminUserUpdates(body: any): { updates: Partial<User> } | { error: string } {
  const updates: Partial<User> = {};
  if (body?.subscriptionTier !== undefined) {
    if (!isSubscriptionTier(body.subscriptionTier)) {
      return { error: `Unknown subscription tier: ${body.subscriptionTier}` };
    }
    updates.subscriptionTier = body.subscriptionTier;
  }
  if (body?.role !== undefined) {
    if (!ADMIN_ASSIGNABLE_ROLES.includes(body.role)) {
      return { error: `Unknown role: ${body.role}` };
    }
    updates.role = body.role;
  }
  if (body?.isSubscribed !== undefined) updates.isSubscribed = Boolean(body.isSubscribed);
  if (body?.isActive !== undefined) updates.isActive = Boolean(body.isActive);
  if (typeof body?.firstName === 'string') updates.firstName = body.firstName;
  if (typeof body?.lastName === 'string') updates.lastName = body.lastName;
  // The /admin edit form has always been able to correct an email; keep it,
  // but only in a shape the login lookup can actually match.
  if (body?.email !== undefined) {
    if (typeof body.email !== 'string' || !body.email.includes('@')) {
      return { error: 'Invalid email' };
    }
    updates.email = body.email.trim();
  }
  return { updates };
}

/** How an athlete is introduced to their coach: their real name where we have one. */
function athleteDisplayName(user: User): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.email;
}

/** Usernames are unique and HQ shouldn't have to invent one. Derive from the email. */
async function uniqueUsernameFromEmail(email: string): Promise<string> {
  const base = (email.split('@')[0] || 'athlete').toLowerCase().replace(/[^a-z0-9]/g, '') || 'athlete';
  for (let suffix = 0; suffix < 50; suffix++) {
    const candidate = suffix === 0 ? base : `${base}${suffix}`;
    if (!(await storage.getUserByUsername(candidate))) return candidate;
  }
  return `${base}${Date.now()}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  debugLogger.success('routes', 'Starting route registration...');
  
  // Enable trust proxy for Railway/production environments
  app.set('trust proxy', 1);
  
  // Session middleware with logging
  debugLogger.success('routes', 'Configuring session middleware');
  app.use(session(sessionConfig));
  
  // Client error reporting endpoint for deployment debugging
  app.post('/api/client-error', (req, res) => {
    const { diagnostic, userAgent, url, timestamp } = req.body;
    debugLogger.error('client-error', `Client error reported: ${diagnostic.message}`, {
      component: diagnostic.component,
      userAgent,
      url,
      timestamp,
      details: diagnostic.details
    });
    res.json({ received: true });
  });

  // Health check — used by Phase 8 prod verification
  app.get("/api/health", (_req, res) => {
    const sha = process.env.RAILWAY_GIT_COMMIT_SHA || "";
    res.json({
      status: "ok",
      commit: sha ? sha.substring(0, 7) : "unknown",
      // Which brain is actually live. Names only — never key material.
      llmProvider: primaryProvider(),
      llmModel: primaryProvider() === "anthropic" ? anthropicModel() : geminiModel(),
      anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      vapiConfigured: !!process.env.VAPI_API_KEY,
      // Presence only — the secret itself is never exposed. Without this the
      // webhook refuses every event, so it needs to be visible at a glance.
      stripeWebhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      timestamp: new Date().toISOString(),
    });
  });

  // Public config — runtime VAPI keys for client (no secrets)
  app.get("/api/public-config", (_req, res) => {
    res.json({
      vapiPublicKey: process.env.VITE_VAPI_PUBLIC_KEY || "",
      vapiAssistantId: process.env.VITE_VAPI_ASSISTANT_ID || "",
    });
  });

  // Stripe config endpoint - returns only the publishable key
  app.get("/api/stripe-config", (req, res) => {
    // Find the correct publishable key by checking prefixes
    const possibleKeys = [
      process.env.TESTING_STRIPE_SECRET_KEY, // Contains pk_test due to naming swap
      process.env.VITE_TESTING_STRIPE_PUBLIC_KEY,
      process.env.VITE_STRIPE_PUBLIC_KEY
    ].filter(Boolean);

    const publishableKey = possibleKeys.find(key => key?.startsWith('pk_'));
    
    if (!publishableKey) {
      debugLogger.error('stripe-config', 'No publishable key (pk_*) found in environment variables');
      return res.status(500).json({ 
        error: 'Stripe configuration error: No publishable key found' 
      });
    }

    debugLogger.success('stripe-config', `Providing publishable key: ${publishableKey.substring(0, 7)}...`);
    res.json({ publishableKey });
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Never log req.body here — it contains the plaintext password.
      console.log('Registration attempt for email:', req.body?.email);
      const user = await registerUser(req.body);

      // New session id at the moment privilege changes, so a session fixed
      // before sign-up cannot be reused afterwards (audit D4).
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          console.error('Session regenerate error:', regenErr);
          return res.status(500).json({ message: 'Session creation failed' });
        }

        req.session.userId = user.id;

        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ message: 'Session creation failed' });
          }

          // Remove password from response
          const safeUser = stripPassword(user);
          console.log('User registered successfully:', safeUser.id);
          res.json(safeUser);
        });
      });
    } catch (error: any) {
      console.error('Registration error:', error.message);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await loginUser(email, password);

      // Same reason as register: rotate the id when privilege changes.
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          console.error('Session regenerate error on login:', regenErr);
          return res.status(500).json({ message: 'Session creation failed' });
        }

        req.session.userId = user.id;

        req.session.save((err) => {
          if (err) {
            console.error('Session save error on login:', err);
            return res.status(500).json({ message: 'Session creation failed' });
          }

          console.log('Session saved successfully for user:', user.username);
          res.json(user);
        });
      });
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // ── Password recovery ─────────────────────────────────────────────

  app.post("/api/auth/forgot-password", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";

    // One answer for every input, whatever happens below. Anything that varies
    // with whether the address exists turns this endpoint into a way of asking
    // "does this person have a Cerosity account?" — including how long it takes,
    // which is why the send is not awaited differently on either branch.
    const sameAnswerEitherWay = {
      message: "If that email has a Cerosity account, a reset link is on its way.",
    };

    // Both counters are recorded before either is judged, so a burst against one
    // address still counts towards the address's own allowance and the caller's.
    const overEmailLimit = email
      ? forgotOverLimit(`email:${email.toLowerCase()}`, FORGOT_MAX_PER_EMAIL)
      : false;
    const overIpLimit = forgotOverLimit(`ip:${req.ip}`, FORGOT_MAX_PER_IP);

    if (overEmailLimit || overIpLimit) {
      // Same body as the happy path. Saying "too many requests" here would tell
      // an attacker their guesses are landing on a real address.
      console.warn(
        `[AUTH] forgot-password throttled — ${overEmailLimit ? "email" : "ip"} limit, ${email || "(no email)"} from ${req.ip}`
      );
      return res.json(sameAnswerEitherWay);
    }

    try {
      if (email.includes("@")) {
        const user = await storage.getUserByEmail(email);

        // A deactivated athlete is refused at login, so a reset would only hand
        // them a password that still cannot get them in. Silent on purpose.
        if (user && user.isActive !== false) {
          const token = randomBytes(32).toString("hex");
          await storage.updateUser(user.id, {
            passwordResetTokenHash: hashResetToken(token),
            passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
          });
          await sendPasswordResetEmail(
            user.email,
            `${APP_BASE_URL}/reset-password?token=${token}`,
            user.firstName
          );
        }
      }
    } catch (error) {
      // The athlete is told the same thing regardless, so this log is the only
      // place a rejected send or a broken database write becomes visible. The
      // message, not the object: this is what someone greps Railway for.
      console.error(
        `[AUTH] forgot-password failed for ${email}: ${(error as Error)?.message || error}`
      );
    }

    res.json(sameAnswerEitherWay);
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body ?? {};

      if (typeof token !== "string" || !token) {
        return res.status(400).json({ message: "Reset token is required" });
      }
      if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return res
          .status(400)
          .json({ message: passwordTooShortMessage });
      }

      const user = await storage.getUserByPasswordResetTokenHash(hashResetToken(token));
      const expiresAt = user?.passwordResetExpiresAt;

      // Expired, already spent, or never real — all the same sentence, so a
      // guessed token learns nothing from the wording.
      if (!user || !expiresAt || new Date(expiresAt).getTime() < Date.now()) {
        return res.status(400).json({
          message: "That reset link has expired or has already been used. Request a new one.",
        });
      }

      if (user.isActive === false) {
        return res
          .status(403)
          .json({ message: "This account has been deactivated. Contact Cerosity support." });
      }

      // Single use: the token is spent in the same write that changes the
      // password, so a replay of the same link finds nothing to match.
      await storage.updateUser(user.id, {
        password: await hashPassword(password),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      });

      console.log("[AUTH] password reset completed for user", user.id);
      res.json({ message: "Password updated. You can sign in with it now." });
    } catch (error) {
      console.error("[AUTH] reset-password failed:", error);
      res.status(500).json({ message: "Could not reset the password. Try again." });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body ?? {};

      if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
        return res
          .status(400)
          .json({ message: "Both your current and new password are required." });
      }
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return res
          .status(400)
          .json({ message: passwordTooShortMessage });
      }

      // Re-read rather than trusting the session copy: it carries no hash.
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!(await verifyPassword(currentPassword, user.password))) {
        return res.status(400).json({ message: "That isn't your current password." });
      }

      // Any reset in flight is cancelled — if somebody else requested one, the
      // athlete changing their password should invalidate it.
      await storage.updateUser(user.id, {
        password: await hashPassword(newPassword),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      });

      console.log("[AUTH] password changed for user", user.id);
      res.json({ message: "Password updated." });
    } catch (error) {
      console.error("[AUTH] change-password failed:", error);
      res.status(500).json({ message: "Could not change the password. Try again." });
    }
  });

  // Google OAuth — initiate
  app.get("/api/auth/google", (req, res) => {
    if (!isGoogleOAuthConfigured()) {
      return res.status(501).json({ message: "Google SSO not configured" });
    }
    const state = Math.random().toString(36).substring(2);
    req.session.oauthState = state;
    req.session.save(() => {
      res.redirect(getGoogleAuthUrl(state));
    });
  });

  // Google OAuth — callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      if (!code) return res.redirect("/?error=no_code");

      const { user, isNew } = await handleGoogleCallback(code, req);
      req.session.save((err) => {
        if (err) {
          console.error("[GOOGLE-AUTH] Session save error:", err);
          return res.redirect("/?error=session");
        }
        // Land in the curriculum — frontend picks up session via /api/auth/me
        res.redirect(isNew ? "/learn?welcome=1" : "/learn");
      });
    } catch (error: any) {
      console.error("[GOOGLE-AUTH] Callback error:", error.message);
      res.redirect("/?error=google_auth_failed");
    }
  });

  app.get("/api/auth/me", async (req: AuthRequest, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // This route checks the session itself instead of going through
      // requireAuth, so it needs its own deactivation check — without it the
      // client keeps treating a turned-off athlete as signed in.
      if (user.isActive === false) {
        return res.status(401).json({ message: "This account has been deactivated. Contact Cerosity support." });
      }

      res.json(stripPassword(user));
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });



  // Stripe payment route for tier purchases
  app.post("/api/create-payment-intent", async (req: AuthRequest, res) => {
    try {
      const { tier, description } = req.body;

      // The client's `amount` is ignored. It used to be honoured verbatim, so
      // anyone could pay $1 for the $2,290 tier (audit A3/A6). Price comes from
      // TIER_PRICING, which is also what the marketing pages render.
      if (!isSubscriptionTier(tier) || tier === 'free') {
        return res.status(400).json({ message: "A valid paid tier is required" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: tierAmountInCents(tier),
        currency: "usd",
        description: description || `Cerosity ${TIER_PRICING[tier].name}`,
        metadata: {
          tier,
          product: 'cerosity_access',
          // Present only when a signed-in user is buying. The webhook needs it
          // to know whose account to upgrade.
          ...(req.user ? { userId: String(req.user.id) } : {}),
        }
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Payment intent creation error:', error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe hosted checkout session for tier purchases
  app.post("/api/create-checkout-session", async (req: AuthRequest, res) => {
    try {
      const { tier, success_url, cancel_url } = req.body;

      // Client-supplied `amount` is deliberately not read (audit A3/A6).
      if (!isSubscriptionTier(tier) || tier === 'free') {
        return res.status(400).json({ message: "A valid paid tier is required" });
      }

      console.log('Creating checkout session for tier:', tier);

      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: tier === 'ultimate' ? 'Cerosity Master Human Coaching' : tier === 'flo' ? 'Cerosity FLO Subscription' : 'Cerosity Elite Digital Coaching',
                description: tier === 'ultimate'
                  ? 'AI + Human elite coaching with personal sessions'
                  : tier === 'flo' ? 'Unlimited AI mental performance coaching' : 'Complete AI coaching with all features',
              },
              unit_amount: tierAmountInCents(tier),
            },
            quantity: 1,
          },
        ],
        mode: 'payment' as const,
        success_url: success_url || `https://${req.headers.host}/signup-after-payment?tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `https://${req.headers.host}/checkout-hosted?tier=${tier}`,
        metadata: {
          tier,
          product: 'cerosity_access',
          ...(req.user ? { userId: String(req.user.id) } : {}),
        }
      };

      const session = await stripe.checkout.sessions.create(sessionConfig as any);
      
      console.log('Session created successfully:', { id: session.id, url: session.url });
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout session creation error:', error);
      res.status(500).json({ 
        message: "Error creating checkout session: " + error.message 
      });
    }
  });

  // NOTE: POST /api/auth/upgrade-tier was deleted (audit A3). It let any
  // authenticated session write its own subscriptionTier, which handed out
  // paid tiers — and, now that the curriculum is tier-gated, paid content —
  // for free. Tier changes belong to the payment flow only.

  /**
   * A chat session belongs to exactly one athlete. Admins may read any of them
   * (the HQ console needs it); nobody else may touch another user's row.
   * Callers should answer 404 on failure, not 403 — see POST /api/chat.
   */
  const userOwnsChatSession = (
    user: { id: number; role?: string | null },
    session: { userId: number }
  ) => session.userId === user.id || user.role === "admin";

  // Profile fields a user may edit about themselves. This is an allowlist on
  // purpose (audit A2): the previous denylist stripped password and the Stripe
  // ids but left role, subscriptionTier and isSubscribed writable, so one
  // PATCH against your own account made you an admin on the paid tier.
  const EDITABLE_PROFILE_FIELDS = [
    "username",
    "firstName",
    "lastName",
    "bio",
    "goals",
    "dateOfBirth",
    "dexterity",
    "gender",
    "golfHandicap",
    "golfExperience",
    "profileImageUrl",
    "sport",
  ] as const;

  // User profile update endpoint
  app.patch("/api/users/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updateData = req.body ?? {};

      // Ensure user can only update their own profile
      if (req.session.userId !== userId) {
        return res.status(403).json({ message: "Cannot update another user's profile" });
      }

      const safeUpdateData: Partial<User> = {};
      for (const field of EDITABLE_PROFILE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(updateData, field)) {
          (safeUpdateData as Record<string, unknown>)[field] = updateData[field];
        }
      }

      const updatedUser = await storage.updateUser(userId, safeUpdateData);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(stripPassword(updatedUser));
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile", error: (error as Error).message });
    }
  });

  // Stripe one-time payment routes
  app.post("/api/payment/create", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { tier } = req.body; // 'premium' or 'ultimate'
      const user = req.user;

      if (!user.email) {
        return res.status(400).json({ message: 'Email required for payment' });
      }

      // Create or retrieve Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
        });
        customerId = customer.id;
        
        // Update user with customer ID
        await storage.updateUser(user.id, { stripeCustomerId: customerId });
      }

      // Stripe product ids only. The amount comes from TIER_PRICING so a price
      // change happens in one place (CLAUDE.md Rule 1) — these were hardcoded
      // at 59000/229000 alongside a third, different set of prices elsewhere.
      const productIds: Partial<Record<SubscriptionTier, string>> = {
        premium: 'prod_SR3rZuRQG7JnqR',
        ultimate: 'prod_SR3txKbR55uws2',
      };

      if (!isSubscriptionTier(tier) || !productIds[tier]) {
        return res.status(400).json({ message: 'Invalid access tier' });
      }

      const pricing = {
        productId: productIds[tier]!,
        amount: tierAmountInCents(tier),
      };

      // Create checkout session for one-time payment
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product: pricing.productId,
              unit_amount: pricing.amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/?payment=success&tier=${tier}`,
        cancel_url: `${req.headers.origin}/?payment=cancelled`,
        metadata: {
          userId: user.id.toString(),
          tier: tier,
        },
      });

      res.json({ sessionUrl: session.url });
    } catch (error: any) {
      console.error('Payment creation error:', error);
      res.status(500).json({ message: 'Failed to create payment session' });
    }
  });

  // Webhook for Stripe events.
  //
  // This is the ONLY code path that may grant a paid tier. req.body arrives as
  // a raw Buffer because server/index.ts mounts express.raw() on this exact
  // path above express.json() — parsed JSON here would fail every signature
  // check, which is what made the whole payment chain dead (audit A1).
  app.post("/api/webhook/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      // Never fall through to "accept unverified". Without a secret we cannot
      // prove Stripe sent this, so we refuse rather than grant anything.
      console.error('[STRIPE-WEBHOOK] STRIPE_WEBHOOK_SECRET is not set — refusing to process events');
      return res.status(503).json({ message: 'Webhook not configured' });
    }

    if (!Buffer.isBuffer(req.body)) {
      // Guards against someone reordering the middleware later and silently
      // reintroducing A1. Loud, because the symptom is otherwise invisible.
      console.error('[STRIPE-WEBHOOK] req.body is not a Buffer — express.raw() mount is missing or out of order');
      return res.status(500).json({ message: 'Webhook misconfigured' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, secret);
    } catch (err: any) {
      // err.message describes the mismatch; it never contains the secret.
      console.warn(`[STRIPE-WEBHOOK] signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        // Hosted Checkout (/api/payment/create, /api/create-checkout-session)
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await grantPaidAccess(event.id, session.metadata, session.customer, 'checkout.session.completed');
          break;
        }
        // Embedded card element (/api/create-payment-intent). The live checkout
        // page uses PaymentIntents, which never emit checkout.session.completed
        // — so this event had no handler at all.
        case 'payment_intent.succeeded': {
          const intent = event.data.object as Stripe.PaymentIntent;
          await grantPaidAccess(event.id, intent.metadata, intent.customer, 'payment_intent.succeeded');
          break;
        }
        default:
          console.log(`[STRIPE-WEBHOOK] ignoring ${event.type}`);
      }
    } catch (err: any) {
      // Returning 500 tells Stripe to retry, which is what we want if our own
      // database write failed. The signature was already valid.
      console.error(`[STRIPE-WEBHOOK] handler failed for ${event.type}:`, err?.message || err);
      return res.status(500).json({ message: 'Webhook handler failed' });
    }

    res.json({ received: true });
  });

  /**
   * Grant the purchased tier to the buyer named in the payment's metadata.
   *
   * metadata.userId is written when the purchase is made by a signed-in user.
   * Anonymous buy-then-sign-up purchases have no user to grant to yet; those are
   * logged loudly and left for manual reconciliation rather than guessed at.
   */
  async function grantPaidAccess(
    eventId: string,
    metadata: Stripe.Metadata | null,
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
    source: string
  ) {
    const userId = parseInt(String(metadata?.userId ?? ''), 10);
    const tier = metadata?.tier;

    if (!tier || !isSubscriptionTier(tier)) {
      console.error(`[STRIPE-WEBHOOK] ${source} ${eventId}: missing or unknown tier in metadata (${tier}) — no access granted`);
      return;
    }

    if (Number.isNaN(userId)) {
      console.error(`[STRIPE-WEBHOOK] ${source} ${eventId}: paid for "${tier}" with no userId in metadata — anonymous purchase needs manual reconciliation`);
      return;
    }

    const customerId = typeof customer === 'string' ? customer : customer?.id ?? undefined;

    await storage.updateUser(userId, {
      isSubscribed: true,
      subscriptionTier: tier,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      subscriptionStartDate: new Date(),
      subscriptionEndDate: null, // Lifetime access
    });

    console.log(`[STRIPE-WEBHOOK] ${source} ${eventId}: granted "${tier}" to user ${userId}`);
  }

  // VAPI Voice Webhook — receives call events, tool calls, transcripts
  app.post("/api/webhooks/vapi-events", (req, res) => handleVapiWebhook(req, res));

  // DEMO ACCESS ROUTES - For testing premium/ultimate features without payment (disabled in production)
  app.post("/api/demo/upgrade", async (req: AuthRequest, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: 'Not available in production' });
    }
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { tier } = req.body; // 'premium' or 'ultimate'
      
      if (!tier || !['premium', 'ultimate'].includes(tier)) {
        return res.status(400).json({ message: "Valid tier required: 'premium' or 'ultimate'" });
      }

      // Update user to demo tier
      await storage.updateUser(req.session.userId, {
        isSubscribed: true,
        subscriptionTier: tier,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: null, // Lifetime access
      });

      res.json({ 
        message: `Demo access granted for ${tier} tier`,
        tier: tier,
        note: "This is for testing purposes only"
      });
    } catch (error) {
      console.error('Demo upgrade error:', error);
      res.status(500).json({ message: "Failed to grant demo access" });
    }
  });

  app.post("/api/demo/reset", async (req: AuthRequest, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: 'Not available in production' });
    }
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Reset user to free tier
      await storage.updateUser(req.session.userId, {
        isSubscribed: false,
        subscriptionTier: 'free',
        subscriptionStartDate: null,
        subscriptionEndDate: null,
      });

      res.json({ 
        message: "Account reset to free tier",
        tier: "free"
      });
    } catch (error) {
      console.error('Demo reset error:', error);
      res.status(500).json({ message: "Failed to reset account" });
    }
  });

  // Document download routes for Free tier (path from ASSETS_PATH env var)
  const assetsBasePath = process.env.ASSETS_PATH || process.env.PDF_ASSETS_PATH || "";
  const resolveAsset = (filename: string) => (assetsBasePath ? `${assetsBasePath.replace(/\/$/, "")}/${filename}` : null);

  app.get("/api/downloads/master-your-moment", (req, res) => {
    const filePath = resolveAsset("Master Your Moment by Cero Golf.pdf");
    if (!filePath) return res.status(503).json({ message: "Downloads not configured (set ASSETS_PATH or PDF_ASSETS_PATH)" });
    res.download(filePath, "Master Your Moment by Cero Golf.pdf", (err) => {
      if (err) res.status(404).json({ message: "File not found" });
    });
  });

  app.get("/api/downloads/ability-to-focus", (req, res) => {
    const filePath = resolveAsset("Ability to Focus - Book.pdf");
    if (!filePath) return res.status(503).json({ message: "Downloads not configured (set ASSETS_PATH or PDF_ASSETS_PATH)" });
    res.download(filePath, "Ability to Focus - Book.pdf", (err) => {
      if (err) res.status(404).json({ message: "File not found" });
    });
  });

  app.get("/api/downloads/mental-toughness", (req, res) => {
    const filePath = resolveAsset("Mental Toughness - Book.pdf");
    if (!filePath) return res.status(503).json({ message: "Downloads not configured (set ASSETS_PATH or PDF_ASSETS_PATH)" });
    res.download(filePath, "Mental Toughness - Book.pdf", (err) => {
      if (err) res.status(404).json({ message: "File not found" });
    });
  });

  // Community leaderboard and check-in routes
  app.get("/api/leaderboard", requireAuth, requirePremium, async (req, res) => {
    try {
      const currentUser = (req as AuthRequest).user;
      
      // For now, return mock data with 15 test clients (12 Premium, 3 Ultimate)
      const mockLeaderboard = [
        { id: 101, username: "Tiger_Elite", points: 2850, streak: 45, tier: "ultimate", lastCheckIn: "2024-06-04", rank: 1 },
        { id: 102, username: "PGA_Champion", points: 2620, streak: 38, tier: "premium", lastCheckIn: "2024-06-04", rank: 2 },
        { id: 103, username: "MindsetMaster", points: 2480, streak: 42, tier: "ultimate", lastCheckIn: "2024-06-03", rank: 3 },
        { id: 104, username: "FocusFlow", points: 2350, streak: 35, tier: "premium", lastCheckIn: "2024-06-04", rank: 4 },
        { id: 105, username: "PressureProof", points: 2210, streak: 28, tier: "premium", lastCheckIn: "2024-06-04", rank: 5 },
        { id: 106, username: "ZoneWarrior", points: 2080, streak: 31, tier: "premium", lastCheckIn: "2024-06-03", rank: 6 },
        { id: 107, username: "ClutchPlayer", points: 1950, streak: 25, tier: "ultimate", lastCheckIn: "2024-06-04", rank: 7 },
        { id: 108, username: "MentalTough", points: 1820, streak: 22, tier: "premium", lastCheckIn: "2024-06-04", rank: 8 },
        { id: 109, username: "VisualizePro", points: 1690, streak: 19, tier: "premium", lastCheckIn: "2024-06-03", rank: 9 },
        { id: 110, username: "ConfidenceKing", points: 1560, streak: 16, tier: "premium", lastCheckIn: "2024-06-04", rank: 10 },
        { id: 111, username: "BreatheMaster", points: 1430, streak: 13, tier: "premium", lastCheckIn: "2024-06-04", rank: 11 },
        { id: 112, username: "FlowState", points: 1300, streak: 10, tier: "premium", lastCheckIn: "2024-06-03", rank: 12 },
        { id: 113, username: "WinnerMindset", points: 1170, streak: 7, tier: "premium", lastCheckIn: "2024-06-04", rank: 13 },
        { id: 114, username: "ChampionFocus", points: 1040, streak: 4, tier: "premium", lastCheckIn: "2024-06-04", rank: 14 },
        { id: 115, username: "ElitePerformer", points: 910, streak: 1, tier: "premium", lastCheckIn: "2024-06-04", rank: 15 }
      ];
      
      // Filter leaderboard based on user's subscription tier
      const filteredLeaderboard = mockLeaderboard.map(entry => {
        // Free users can only see anonymous usernames and basic stats
        if (currentUser.subscriptionTier === 'free') {
          return {
            id: entry.id,
            username: `Player #${entry.rank}`, // Anonymous for free users
            points: entry.points,
            streak: entry.streak,
            tier: 'hidden', // Hide tier information for free users
            lastCheckIn: entry.lastCheckIn,
            rank: entry.rank
          };
        }
        
        // Premium/Ultimate users can see full leaderboard
        return entry;
      });
      
      res.json(filteredLeaderboard);
    } catch (error: any) {
      console.error('Leaderboard error:', error);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });

  app.get("/api/check-in/today/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const today = new Date().toISOString().split('T')[0];
      
      // Mock response for today's check-in status
      const mockCheckIn = {
        completedToday: Math.random() > 0.7, // 30% chance already completed
        streakCount: Math.floor(Math.random() * 20) + 1,
        totalPoints: Math.floor(Math.random() * 1000) + 100
      };
      
      res.json(mockCheckIn);
    } catch (error: any) {
      console.error('Check-in status error:', error);
      res.status(500).json({ message: 'Failed to fetch check-in status' });
    }
  });

  app.post("/api/check-in", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.body;
      if (req.user!.id !== parseInt(String(userId), 10) && req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      // Mock successful check-in
      const result = {
        success: true,
        pointsEarned: 10,
        newStreak: Math.floor(Math.random() * 20) + 2,
        totalPoints: Math.floor(Math.random() * 1000) + 110
      };
      
      res.json(result);
    } catch (error: any) {
      console.error('Check-in error:', error);
      res.status(500).json({ message: 'Failed to complete check-in' });
    }
  });

  // Notifications API endpoints (Phase 3: persisted in DB)
  app.post("/api/notifications", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const { type, title, message, scheduledDate } = req.body;
      if (!type || !title || !message) {
        return res.status(400).json({ message: "type, title, and message are required" });
      }
      const notification = await storage.createNotification({
        userId,
        type: String(type),
        title: String(title),
        message: String(message),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      });
      res.status(201).json({ success: true, notification });
    } catch (error: unknown) {
      console.error("Notification creation error:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.get("/api/notifications/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin("userId"), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (Number.isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });
      const list = await storage.getNotificationsByUserId(userId);
      res.json(list);
    } catch (error: unknown) {
      console.error("Notifications fetch error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid notification ID" });
      const notification = await storage.getNotification(id);
      if (!notification) return res.status(404).json({ message: "Notification not found" });
      const user = req.user as { id: number; role?: string } | undefined;
      if (notification.userId !== req.userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { isRead } = req.body;
      const updated = await storage.updateNotification(id, { isRead: Boolean(isRead) });
      res.json(updated);
    } catch (error: unknown) {
      console.error("Notification update error:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  app.get("/api/progress/techniques/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      // Mock technique progress data
      const mockProgress = [
        {
          id: 1,
          techniqueId: 1,
          techniqueName: "Box Breathing",
          category: "focus",
          practiceCount: 15,
          masteryLevel: "intermediate",
          totalTimeSpent: 75,
          lastPracticed: "2024-06-03",
          streakDays: 5
        },
        {
          id: 2,
          techniqueId: 2,
          techniqueName: "Visualization Training",
          category: "visualization",
          practiceCount: 8,
          masteryLevel: "beginner",
          totalTimeSpent: 40,
          lastPracticed: "2024-06-02",
          streakDays: 2
        },
        {
          id: 3,
          techniqueId: 3,
          techniqueName: "Pressure Response",
          category: "pressure",
          practiceCount: 22,
          masteryLevel: "advanced",
          totalTimeSpent: 110,
          lastPracticed: "2024-06-04",
          streakDays: 8
        }
      ];
      
      res.json(mockProgress);
    } catch (error: any) {
      console.error('Progress fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch technique progress' });
    }
  });

  app.post("/api/progress/practice-session", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const { userId, techniqueId, duration } = req.body;
      const uid = parseInt(String(userId), 10);
      if (Number.isNaN(uid) || (req.user!.id !== uid && req.user!.role !== 'admin')) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      // Mock successful practice session
      const result = {
        success: true,
        sessionCompleted: true,
        timeAdded: duration,
        practiceCountIncremented: true,
        streakMaintained: true
      };
      
      res.json(result);
    } catch (error: any) {
      console.error('Practice session error:', error);
      res.status(500).json({ message: 'Failed to record practice session' });
    }
  });
  
  // Assessment routes
  app.post("/api/assessments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const { responses } = req.body;
      
      console.log(`Creating assessment for user ${userId} with responses:`, responses);
      
      // Calculate scores from responses for better analysis
      const calculateCategoryScore = (prefix: string) => {
        const categoryResponses = Object.entries(responses)
          .filter(([key]) => key.startsWith(prefix))
          .map(([, value]) => parseInt(value as string));
        
        return categoryResponses.length > 0 
          ? Math.round(categoryResponses.reduce((a, b) => a + b, 0) / categoryResponses.length)
          : 0;
      };
      
      const intensityScore = calculateCategoryScore('intensity');
      const decisionMakingScore = calculateCategoryScore('decision');
      const diversionsScore = calculateCategoryScore('diversions');
      const executionScore = calculateCategoryScore('execution');
      const totalScore = Math.round((intensityScore + decisionMakingScore + diversionsScore + executionScore) / 4);
      
      // Store assessment with calculated scores
      const assessment = await storage.createAssessment({
        userId,
        responses: responses,
        intensityScore,
        decisionMakingScore,
        diversionsScore,
        executionScore,
        totalScore
      });

      // Get AI analysis based on response patterns and scores
      const previousAssessments = await storage.getUserAssessments(userId);
      const sport = (req as AuthRequest).user?.sport ?? "golf";
      const analysis = await analyzeAssessmentResults(
        intensityScore, decisionMakingScore, diversionsScore, executionScore,
        previousAssessments.slice(1, 4), // Last 3 previous assessments
        sport
      );

      console.log(`Assessment created successfully for user ${userId}:`, assessment);
      res.json({ assessment, analysis });
    } catch (error) {
      console.error('Assessment creation error:', error);
      res.status(400).json({ message: "Invalid assessment data", error: (error as Error).message });
    }
  });

  app.get("/api/assessments/latest/:userId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Ensure user can only access their own assessments
      if (userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const assessment = await storage.getLatestAssessment(userId);
      
      if (!assessment) {
        return res.status(404).json({ message: "No assessments found" });
      }

      console.log(`Latest assessment found for user ${userId}:`, assessment);
      res.json(assessment);
    } catch (error) {
      console.error('Error fetching latest assessment:', error);
      res.status(500).json({ message: "Failed to fetch assessment", error: (error as Error).message });
    }
  });

  app.get("/api/assessments/user/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const assessments = await storage.getUserAssessments(userId);
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assessments", error: (error as Error).message });
    }
  });

  // Landing page chat — FLO sales funnel with staged prompts per §8.2
  app.post("/api/landing-chat", async (req, res) => {
    const requestTimeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ message: "I'm having trouble connecting right now. Please try your question again." });
      }
    }, 15000);

    try {
      const { message, messageCount, conversationHistory, visitorName, visitorSport } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        clearTimeout(requestTimeout);
        return res.status(400).json({ message: "Please provide a valid message" });
      }

      if (message.length > 500) {
        clearTimeout(requestTimeout);
        return res.status(400).json({ message: "Message too long. Please keep it under 500 characters." });
      }

      // The preview gate counts server-side. req.body.messageCount is a hint
      // for pacing the sales directive, but resetting it to 1 must not buy more
      // free turns (audit B5) — so the real count is whichever is higher.
      const clientCount = typeof messageCount === 'number' && messageCount > 0 ? messageCount : 1;
      const serverCount = (req.session.landingChatCount ?? 0) + 1;
      req.session.landingChatCount = serverCount;
      const count = Math.max(clientCount, serverCount);

      const history = Array.isArray(conversationHistory) ? conversationHistory : [];
      const name = typeof visitorName === 'string' ? visitorName.trim() : '';
      const sport = typeof visitorSport === 'string' ? visitorSport.trim() : '';

      console.log(`[LANDING-CHAT] msg #${count} (client=${clientCount} server=${serverCount}): "${message.substring(0, 80)}" name=${name} sport=${sport}`);

      // Hard gate: after 6 messages, don't call Gemini — prompt signup only
      if (count > 6) {
        clearTimeout(requestTimeout);
        return res.json({
          message: "You've had a taste of what FLO can do. Create a free account to keep coaching — I'll remember everything we've talked about.",
          suggestions: [],
          urgencyLevel: "low",
          showSignupCta: true,
          previewEnded: true,
        });
      }

      if (count === 1 && /^(hi|hello|hey|yo|sup|hiya)\s*[!.?]*$/i.test(message.trim())) {
        clearTimeout(requestTimeout);
        return res.json({
          message: "Hey — I'm FLO. What sport are you in, and what's the main thing on your mind right now?",
          suggestions: [],
          urgencyLevel: "low",
        });
      }

      const salesDirective = buildLandingSalesDirective(count);

      const systemPrompt = await buildFloPrompt({
        userMessage: message.trim(),
        forChatApi: true,
        forLanding: true,
        visitorName: name || undefined,
        sport: sport || undefined,
        salesDirective,
      });

      const formattedHistory = history.slice(-12).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const response = await getCoachingResponse(message.trim(), formattedHistory, {
        sport: sport || "general",
        systemPromptOverride: systemPrompt
      });

      clearTimeout(requestTimeout);

      if (!res.headersSent) {
        res.json({
          message: response.message,
          suggestions: response.suggestions || [],
          urgencyLevel: response.urgencyLevel || "low",
          ...(count >= 6 ? { showSignupCta: true } : {}),
        });
      }

      console.log(`[LANDING-CHAT] Response sent (msg #${count})`);
    } catch (error: any) {
      clearTimeout(requestTimeout);
      console.error("Landing chat error:", error);

      if (!res.headersSent) {
        if (error.message?.includes('timeout')) {
          res.status(408).json({
            message: "I'm taking a bit longer to think. Try box breathing (4 counts in, hold 4, out 4, hold 4) while I catch up. What specific situation are you dealing with?"
          });
        } else {
          res.status(500).json({
            message: "I'm here to help with your mental game. Try asking about handling pressure, staying focused, or managing nerves before competition."
          });
        }
      }
    }
  });

  // Lead capture endpoint (scope §4.1–§4.3)
  app.post("/api/capture-lead", async (req, res) => {
    try {
      const { email, name, source, sportIndustry, businessName, country, phone } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email required" });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const leadSource = source || "Footer Form";

      const lead = await storage.captureLead({
        email: normalizedEmail,
        name: name?.trim() || null,
        source: leadSource,
        agent: leadSource === "Chat Interview" ? "FLO" : leadSource,
        sportIndustry: sportIndustry?.trim() || null,
        businessName: businessName?.trim() || null,
        country: country?.trim() || null,
        phone: phone?.trim() || null,
      });

      sendLeadRegistrationEmail({ name: lead.name, email: lead.email, source: leadSource });
      sendAdminLeadNotification({ name: lead.name, email: lead.email, source: leadSource, sportIndustry: lead.sportIndustry, businessName: lead.businessName });

      console.log(`[LEAD] Captured: ${lead.email} via ${leadSource}`);
      res.json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("[LEAD] Capture error:", error);
      res.status(500).json({ message: "Failed to capture lead" });
    }
  });

  // HQ Brain doc APIs (admin only)
  app.get("/api/hq/flo-brain", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const docs = await storage.getFloBrainDocuments();
      res.json(docs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch brain docs" });
    }
  });

  app.post("/api/hq/flo-brain", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { title, category, contentText } = req.body;
      if (!title || !contentText) {
        return res.status(400).json({ message: "Title and content required" });
      }
      const doc = await storage.createFloBrainDocument({
        title,
        category: category || "general",
        contentText,
        isActive: true,
        version: 1,
        uploadedBy: "admin",
        sourceType: "text",
        contentCharCount: contentText.length,
      });
      clearBrainDocsCache();
      console.log(`[FLO-BRAIN] Doc created: ${doc.title}`);
      res.json(doc);
    } catch (error) {
      console.error("[FLO-BRAIN] Create error:", error);
      res.status(500).json({ message: "Failed to create brain doc" });
    }
  });

  app.patch("/api/hq/flo-brain/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const doc = await storage.updateFloBrainDocument(id, updates);
      clearBrainDocsCache();
      res.json(doc);
    } catch (error) {
      res.status(500).json({ message: "Failed to update brain doc" });
    }
  });

  // PDF upload for FLO Brain
  app.post("/api/hq/flo-brain/upload", requireAuth, requireAdmin, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      if (req.file.mimetype !== "application/pdf") return res.status(400).json({ message: "Only PDF files accepted" });

      const parsed = await pdfParse(req.file.buffer);
      const contentText = parsed.text.trim();
      if (!contentText) return res.status(400).json({ message: "Could not extract text from PDF" });

      const title = req.body.title || req.file.originalname.replace(/\.pdf$/i, "");
      const category = req.body.category || "general";

      const doc = await storage.createFloBrainDocument({
        title,
        category,
        contentText,
        isActive: true,
        version: 1,
        uploadedBy: "admin",
        sourceType: "pdf",
        sourceFilename: req.file.originalname,
        contentCharCount: contentText.length,
      });
      clearBrainDocsCache();
      console.log(`[FLO-BRAIN] PDF ingested: ${doc.title} (${contentText.length} chars)`);
      res.json(doc);
    } catch (error) {
      console.error("[FLO-BRAIN] PDF upload error:", error);
      res.status(500).json({ message: "Failed to process PDF" });
    }
  });

  // HQ Sport Contexts CRUD
  app.get("/api/hq/flo-sports", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const contexts = await storage.getFloSportContexts();
      res.json(contexts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sport contexts" });
    }
  });

  app.post("/api/hq/flo-sports", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { slug, displayName, contextText } = req.body;
      if (!slug || !displayName || !contextText) return res.status(400).json({ message: "slug, displayName, contextText required" });
      const ctx = await storage.createFloSportContext({ slug, displayName, contextText, isActive: true });
      clearSportContextCache();
      console.log(`[FLO-SPORTS] Context created: ${ctx.slug}`);
      res.json(ctx);
    } catch (error) {
      console.error("[FLO-SPORTS] Create error:", error);
      res.status(500).json({ message: "Failed to create sport context" });
    }
  });

  app.patch("/api/hq/flo-sports/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ctx = await storage.updateFloSportContext(id, req.body);
      clearSportContextCache();
      res.json(ctx);
    } catch (error) {
      res.status(500).json({ message: "Failed to update sport context" });
    }
  });

  // Athlete Profile API (authenticated, own user only)
  app.get("/api/athlete-profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const profile = await storage.getAthleteProfile(userId);
      const goals = await storage.getUserGoals(userId);

      const shortTerm = goals.filter(g => g.category === "short_term");
      const mediumTerm = goals.filter(g => g.category === "medium_term");
      const longTerm = goals.filter(g => g.category === "long_term");

      res.json({
        bio: user.bio || "",
        achievements: profile?.achievements || [],
        challenges: profile?.challenges || [],
        goals: { shortTerm, mediumTerm, longTerm },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch athlete profile" });
    }
  });

  app.patch("/api/athlete-profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { bio, achievements, challenges } = req.body;

      if (bio !== undefined) {
        await storage.updateUser(userId, { bio });
      }

      if (achievements !== undefined || challenges !== undefined) {
        const updates: any = {};
        if (achievements !== undefined) updates.achievements = achievements;
        if (challenges !== undefined) updates.challenges = challenges;
        await storage.upsertAthleteProfile(userId, updates);
      }

      const user = await storage.getUser(userId);
      const profile = await storage.getAthleteProfile(userId);
      const goals = await storage.getUserGoals(userId);

      res.json({
        bio: user?.bio || "",
        achievements: profile?.achievements || [],
        challenges: profile?.challenges || [],
        goals: {
          shortTerm: goals.filter(g => g.category === "short_term"),
          mediumTerm: goals.filter(g => g.category === "medium_term"),
          longTerm: goals.filter(g => g.category === "long_term"),
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update athlete profile" });
    }
  });

  // Leads list for HQ console
  app.get("/api/hq/leads", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const allLeads = await storage.getAllLeads();
      res.json(allLeads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // requireAuth, not requirePremium: free athletes have durable conversations
  // too and must be able to rehydrate their own transcript after a refresh.
  // requireOwnUserOrAdmin still stops anyone reading someone else's.
  app.get("/api/chat/sessions/:userId", requireAuth, requireOwnUserOrAdmin('userId'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessions = await storage.getUserChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat sessions", error: (error as Error).message });
    }
  });

  // Progress routes
  app.post("/api/progress", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const data = insertUserProgressSchema.parse(req.body);
      if (req.user!.id !== data.userId && req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const progress = await storage.createUserProgress(data);
      res.json(progress);
    } catch (error) {
      res.status(400).json({ message: "Invalid progress data", error: (error as Error).message });
    }
  });

  app.get("/api/progress/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const days = parseInt(req.query.days as string) || 7;
      const progress = await storage.getUserProgress(userId, days);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress", error: (error as Error).message });
    }
  });

  // Technique routes
  app.get("/api/techniques", requireAuth, requirePremium, async (req, res) => {
    try {
      const category = req.query.category as string;
      const techniques = category 
        ? await storage.getTechniquesByCategory(category)
        : await storage.getAllTechniques();
      res.json(techniques);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch techniques", error: (error as Error).message });
    }
  });

  // Scenario routes
  app.get("/api/scenarios", requireAuth, requirePremium, async (req, res) => {
    try {
      const pressureLevel = req.query.pressureLevel as string;
      const scenarios = pressureLevel
        ? await storage.getScenariosByPressureLevel(pressureLevel)
        : await storage.getAllScenarios();
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scenarios", error: (error as Error).message });
    }
  });

  // Pre-shot routine routes
  app.post("/api/pre-shot-routines", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const data = insertPreShotRoutineSchema.parse(req.body);
      if (req.user!.id !== data.userId && req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const routine = await storage.createPreShotRoutine(data);
      res.status(201).json(routine);
    } catch (error) {
      res.status(400).json({ message: "Failed to create pre-shot routine", error: (error as Error).message });
    }
  });

  app.get("/api/pre-shot-routines/active/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const routine = await storage.getActivePreShotRoutine(userId);
      if (!routine) {
        return res.status(404).json({ message: "No active routine found" });
      }
      res.json(routine);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active routine", error: (error as Error).message });
    }
  });

  app.get("/api/pre-shot-routines/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const routines = await storage.getUserPreShotRoutines(userId);
      res.json(routines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user routines", error: (error as Error).message });
    }
  });

  // Mental Skills X-Check routes
  app.post("/api/mental-skills-xcheck", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      console.log(`Mental Skills X-Check POST request for user ${userId}:`, req.body);
      
      const xcheck = await storage.createMentalSkillsXCheck({
        userId,
        intensityScores: req.body.intensityScores || [75, 80, 85],
        decisionMakingScores: req.body.decisionMakingScores || [70, 75, 80],
        diversionsScores: req.body.diversionsScores || [65, 70, 75],
        executionScores: req.body.executionScores || [80, 85, 90],
        context: req.body.context || "Practice session",
        whatDidWell: req.body.whatDidWell || "Good focus",
        whatCouldDoBetter: req.body.whatCouldDoBetter || "Better tempo",
        actionPlan: req.body.actionPlan || "Practice more"
      });
      
      console.log(`Mental Skills X-Check created successfully for user ${userId}:`, xcheck);
      res.status(201).json(xcheck);
    } catch (error: any) {
      console.error("Mental Skills X-Check creation error:", error);
      res.status(400).json({ 
        message: "Failed to create mental skills x-check", 
        error: error.message
      });
    }
  });

  app.get("/api/mental-skills-xcheck/latest", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    console.log('🔍 ROUTE HIT: mental-skills-xcheck/latest');
    console.log('🔐 Auth state:', { 
      sessionUserId: req.session?.userId,
      reqUserId: req.userId,
      hasUser: !!req.user,
      userFromAuth: req.user?.id
    });
    
    try {
      const userId = req.userId;
      if (!userId) {
        console.log('❌ No userId found, this should not happen after requireAuth');
        return res.status(401).json({ message: "Authentication error - no user ID" });
      }
      
      console.log('✅ Using userId:', userId);
      const xcheck = await storage.getLatestMentalSkillsXCheck(userId);
      if (!xcheck) {
        return res.status(404).json({ message: "No x-check found" });
      }
      res.json(xcheck);
    } catch (error) {
      console.log('❌ Error in mental-skills-xcheck/latest:', error);
      res.status(500).json({ message: "Failed to fetch latest x-check", error: (error as Error).message });
    }
  });

  app.get("/api/mental-skills-xcheck", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const xchecks = await storage.getUserMentalSkillsXChecks(userId);
      res.json(xchecks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user x-checks", error: (error as Error).message });
    }
  });

  // Control Circles routes
  app.post("/api/control-circles", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      console.log(`Control Circles POST request for user ${userId}:`, req.body);
      
      const circle = await storage.createControlCircle({
        userId,
        context: req.body.context || "Practice session",
        reflections: req.body.reflections || "Good exercise",
        cantControl: req.body.cantControl || ["Weather", "Other players"],
        canInfluence: req.body.canInfluence || ["Course strategy", "Club selection"],
        canControl: req.body.canControl || ["Pre-shot routine", "Breathing"]
      });
      
      console.log(`Control Circle created successfully for user ${userId}:`, circle);
      res.status(201).json(circle);
    } catch (error: any) {
      console.error("Control Circle creation error:", error);
      res.status(400).json({ 
        message: "Failed to create control circle", 
        error: error.message
      });
    }
  });

  app.get("/api/control-circles/latest", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const circle = await storage.getLatestControlCircle(userId);
      if (!circle) {
        return res.status(404).json({ message: "No control circle found" });
      }
      res.json(circle);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch latest control circle", error: (error as Error).message });
    }
  });

  app.get("/api/control-circles", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const circles = await storage.getUserControlCircles(userId);
      res.json(circles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user control circles", error: (error as Error).message });
    }
  });

  // Coach dashboard routes - Admin/Coach only
  app.get("/api/coach/students", requireAuth, requireCoach, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const studentSummaries = await Promise.all(
        allUsers.map(async (user) => {
          const assessments = await storage.getUserAssessments(user.id);
          const latestAssessment = assessments[0];
          
          // Calculate risk level based on latest scores
          let riskLevel = 'low';
          if (latestAssessment) {
            const avgScore = (latestAssessment.intensityScore + latestAssessment.decisionMakingScore + 
                           latestAssessment.diversionsScore + latestAssessment.executionScore) / 4;
            if (avgScore < 60) riskLevel = 'high';
            else if (avgScore < 75) riskLevel = 'medium';
          }

          // Calculate trend direction
          let trends = { direction: 'stable', change: 0 };
          if (assessments.length >= 2) {
            const recent = assessments[0].totalScore;
            const previous = assessments[1].totalScore;
            const change = recent - previous;
            trends = {
              direction: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
              change
            };
          }

          return {
            id: user.id,
            username: user.username,
            email: user.email,
            lastAssessment: latestAssessment,
            assessmentCount: assessments.length,
            lastActivity: latestAssessment?.createdAt || user.createdAt,
            riskLevel,
            trends
          };
        })
      );

      res.json(studentSummaries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students", error: (error as Error).message });
    }
  });

  app.get("/api/coach/student-detail/:userId", requireAuth, requireCoach, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const assessments = await storage.getUserAssessments(userId);
      const progress = await storage.getUserProgress(userId, 30);
      const xchecks = await storage.getUserMentalSkillsXChecks(userId);
      const circles = await storage.getUserControlCircles(userId);
      const routines = await storage.getUserPreShotRoutines(userId);

      // Format assessment history for chart
      const assessmentHistory = assessments.slice(0, 10).reverse().map(a => ({
        date: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
        totalScore: a.totalScore,
        intensity: a.intensityScore,
        decisionMaking: a.decisionMakingScore,
        diversions: a.diversionsScore,
        execution: a.executionScore
      }));

      // Tool usage summary
      const toolUsage = [
        { name: "Mental Skills X-Check", lastUsed: xchecks[0]?.createdAt ? new Date(xchecks[0].createdAt).toLocaleDateString() : "Never" },
        { name: "Control Circles", lastUsed: circles[0]?.createdAt ? new Date(circles[0].createdAt).toLocaleDateString() : "Never" },
        { name: "Pre-Shot Routine", lastUsed: routines[0]?.createdAt ? new Date(routines[0].createdAt).toLocaleDateString() : "Never" }
      ];

      // Generate coaching recommendations based on latest assessment
      const recommendations = [];
      if (assessments[0]) {
        const latest = assessments[0];
        if (latest.intensityScore < 70) recommendations.push("Focus on intensity management techniques - practice breathing exercises");
        if (latest.decisionMakingScore < 70) recommendations.push("Work on decision-making clarity - use visualization drills");
        if (latest.diversionsScore < 70) recommendations.push("Improve focus and attention - practice mindfulness meditation");
        if (latest.executionScore < 70) recommendations.push("Build execution confidence - work on pre-shot routine consistency");
      }

      res.json({
        assessmentHistory,
        toolUsage,
        recommendations: recommendations.length > 0 ? recommendations : ["Continue current training program - performance is strong"]
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student details", error: (error as Error).message });
    }
  });

  // Daily mood tracking routes
  app.post("/api/daily-mood", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      // userId comes from the session, not the body — otherwise one athlete can
      // write mood entries into another's history (audit D3 table).
      const validatedData = insertDailyMoodSchema.parse({ ...req.body, userId: req.user!.id });
      const mood = await storage.createDailyMood(validatedData);
      res.status(201).json(mood);
    } catch (error) {
      console.error("Error creating daily mood:", error);
      res.status(500).json({ message: "Failed to save mood", error: (error as Error).message });
    }
  });

  app.get("/api/daily-mood/:userId/:date", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const date = req.params.date;
      const mood = await storage.getDailyMood(userId, date);
      if (!mood) {
        return res.status(404).json({ message: "No mood recorded for this date" });
      }
      res.json(mood);
    } catch (error) {
      console.error("Error fetching daily mood:", error);
      res.status(500).json({ message: "Failed to fetch mood", error: (error as Error).message });
    }
  });

  app.put("/api/daily-mood/:id", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { moodScore, notes } = req.body;

      const existing = await storage.getDailyMoodById(id);
      if (!existing || (existing.userId !== req.user!.id && req.user!.role !== "admin")) {
        return res.status(404).json({ message: "Mood entry not found" });
      }

      const mood = await storage.updateDailyMood(id, { moodScore, notes });
      res.json(mood);
    } catch (error) {
      console.error("Error updating daily mood:", error);
      res.status(500).json({ message: "Failed to update mood", error: (error as Error).message });
    }
  });

  app.get("/api/mood-correlation/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const days = parseInt(req.query.days as string) || 30;
      
      const moods = await storage.getUserMoods(userId, days);
      const assessments = await storage.getUserAssessments(userId);
      
      // Correlate mood data with assessment performance
      const correlation = moods.map(mood => {
        const moodDate = new Date(mood.date);
        const nearbyAssessment = assessments.find(assessment => {
          const assessmentDate = new Date(assessment.createdAt || '');
          const timeDiff = Math.abs(assessmentDate.getTime() - moodDate.getTime());
          return timeDiff <= 24 * 60 * 60 * 1000; // Within 24 hours
        });
        
        return {
          date: mood.date,
          moodScore: mood.moodScore,
          assessmentScore: nearbyAssessment?.totalScore || null,
          notes: mood.notes
        };
      });
      
      res.json(correlation);
    } catch (error) {
      console.error("Error fetching mood correlation:", error);
      res.status(500).json({ message: "Failed to fetch mood correlation", error: (error as Error).message });
    }
  });

  // Personalized plan generation
  app.post("/api/generate-plan/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { goals } = req.body;

      const assessments = await storage.getUserAssessments(userId);
      const progress = await storage.getUserProgress(userId, 30);
      const user = await storage.getUser(userId);
      const sport = user?.sport ?? "golf";
      // Note: generatePersonalizedPlan expects (userLevel, specificChallenges, availableTime, sport); adapt if calling with raw assessments/progress
      const plan = await generatePersonalizedPlan(
        "athlete",
        (goals && Array.isArray(goals) ? goals : [goals || "Improve mental game"]).map(String),
        "30 min daily",
        sport
      );
      
      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate plan", error: (error as Error).message });
    }
  });

  // Resilience Challenge Scoring Context Endpoint
  app.get("/api/resilience-context", requireAuth, requirePremium, async (req, res) => {
    try {
      const resilienceContext = {
        title: "Mental Resilience Challenge Scoring",
        description: "Understanding how your resilience scores are calculated based on key mental performance indicators",
        scoringCriteria: [
          {
            range: "90-100",
            level: "Elite Resilience",
            description: "Exceptional mental toughness with consistent performance under pressure",
            indicators: ["Maintains focus during setbacks", "Quick recovery from mistakes", "Thrives in high-pressure situations", "Positive self-talk dominance"]
          },
          {
            range: "80-89", 
            level: "High Resilience",
            description: "Strong mental game with good pressure management",
            indicators: ["Stays composed under pressure", "Good mistake recovery", "Effective stress management", "Mostly positive mindset"]
          },
          {
            range: "70-79",
            level: "Good Resilience", 
            description: "Solid mental foundation with room for pressure improvement",
            indicators: ["Generally maintains composure", "Moderate recovery time", "Some pressure sensitivity", "Mixed positive/negative thoughts"]
          },
          {
            range: "60-69",
            level: "Developing Resilience",
            description: "Building mental strength with inconsistent performance under pressure",
            indicators: ["Occasional composure lapses", "Slow mistake recovery", "Pressure affects performance", "Negative thoughts interfere"]
          },
          {
            range: "Below 60",
            level: "Building Resilience", 
            description: "Early stage resilience development requiring focused mental training",
            indicators: ["Frequent composure issues", "Poor mistake recovery", "High pressure sensitivity", "Negative thought patterns"]
          }
        ],
        assessmentFactors: [
          {
            factor: "Intensity Management",
            weight: "25%",
            description: "Ability to regulate arousal levels and maintain optimal performance intensity"
          },
          {
            factor: "Decision Making",
            weight: "25%", 
            description: "Quality of choices and thought processes under competitive pressure"
          },
          {
            factor: "Attention Control",
            weight: "25%",
            description: "Focus management and ability to avoid external/internal diversions"  
          },
          {
            factor: "Execution Under Pressure",
            weight: "25%",
            description: "Performance consistency and skill delivery in challenging situations"
          }
        ],
        improvementTips: [
          "Practice breathing techniques for intensity regulation",
          "Use visualization to improve decision-making under pressure", 
          "Develop pre-performance routines for better attention control",
          "Regular pressure training to build execution confidence"
        ]
      };
      
      res.json(resilienceContext);
    } catch (error) {
      res.status(500).json({ message: "Failed to get resilience context", error: (error as Error).message });
    }
  });

  // AI Recommendation Engine Routes
  app.get("/api/recommendations/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Generate fresh personalized recommendations
      const recommendations = await recommendationEngine.generatePersonalizedRecommendations(userId);
      
      res.json({ recommendations });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate recommendations", error: (error as Error).message });
    }
  });

  app.get("/api/recommendations/:userId/stored", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const isActive = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;
      
      const recommendations = await storage.getUserRecommendations(userId, isActive);
      
      res.json({ recommendations });
    } catch (error) {
      res.status(500).json({ message: "Failed to get stored recommendations", error: (error as Error).message });
    }
  });

  app.post("/api/recommendations/:id/feedback", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { feedback, comments, effectivenessMeasure } = req.body;

      const recommendation = await storage.getAiRecommendationById(id);
      if (!recommendation || (recommendation.userId !== req.user!.id && req.user!.role !== "admin")) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      if (feedback !== undefined) {
        await storage.updateRecommendationFeedback(id, feedback, comments);
      }
      
      if (effectivenessMeasure !== undefined) {
        await storage.markRecommendationApplied(id, effectivenessMeasure);
      }
      
      await recommendationEngine.trackRecommendationEffectiveness(id, feedback, comments);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update recommendation feedback", error: (error as Error).message });
    }
  });

  app.get("/api/chat/:sessionId/followup", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const userId = req.userId!;

      // generateChatFollowUp reads the session's messages, so an unchecked id
      // here leaks the contents of anyone's conversation (audit D3).
      const session = await storage.getChatSession(sessionId);
      if (!session || !userOwnsChatSession(req.user!, session)) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      const followUpQuestions = await recommendationEngine.generateChatFollowUp(userId, sessionId);
      
      res.json({ followUpQuestions });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate follow-up questions", error: (error as Error).message });
    }
  });

  app.get("/api/insights/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const isAcknowledged = req.query.acknowledged === 'true' ? true : req.query.acknowledged === 'false' ? false : undefined;
      
      const insights = await storage.getUserInsights(userId, isAcknowledged);
      
      res.json({ insights });
    } catch (error) {
      res.status(500).json({ message: "Failed to get insights", error: (error as Error).message });
    }
  });

  app.post("/api/insights/:id/acknowledge", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);

      const insight = await storage.getCoachingInsightById(id);
      if (!insight || (insight.userId !== req.user!.id && req.user!.role !== "admin")) {
        return res.status(404).json({ message: "Insight not found" });
      }

      await storage.acknowledgeInsight(id);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to acknowledge insight", error: (error as Error).message });
    }
  });

  app.get("/api/coaching-profile/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const profile = await storage.getUserCoachingProfile(userId);
      
      res.json({ profile });
    } catch (error) {
      res.status(500).json({ message: "Failed to get coaching profile", error: (error as Error).message });
    }
  });

  app.post("/api/coaching-profile/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const profileData = req.body;
      
      const existingProfile = await storage.getUserCoachingProfile(userId);
      
      let profile;
      if (existingProfile) {
        profile = await storage.updateUserCoachingProfile(userId, profileData);
      } else {
        profile = await storage.createUserCoachingProfile({ userId, ...profileData });
      }
      
      res.json({ profile });
    } catch (error) {
      res.status(500).json({ message: "Failed to update coaching profile", error: (error as Error).message });
    }
  });

  app.get("/api/engagement/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const days = parseInt(req.query.days as string) || 30;
      
      const metrics = await storage.getUserEngagementMetrics(userId, days);
      
      res.json({ metrics });
    } catch (error) {
      res.status(500).json({ message: "Failed to get engagement metrics", error: (error as Error).message });
    }
  });

  // Enhanced chat endpoint with FLO limitations and engagement tracking
  app.post("/api/chat", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { message, sessionId } = req.body;

      // The athlete is whoever the session cookie says they are. The client
      // still sends a userId and we deliberately ignore it: trusting it let any
      // authenticated user read someone else's coaching history, burn their
      // chat quota and pull their assessment scores into a prompt (audit D3).
      const userId = req.user!.id;

      if (!message) {
        return res.status(400).json({ message: "message is required" });
      }

      // Check FLO chat limitations
      const chatLimitations = await storage.getUserChatLimitations(userId);

      if (!chatLimitations.canChat) {
        return res.status(403).json({
          message: "Chat limit reached",
          limitations: chatLimitations,
          upgradeRequired: true
        });
      }

      let session;

      if (sessionId) {
        session = await storage.getChatSession(sessionId);
        // 404 rather than 403 on someone else's session: a 403 would confirm
        // the id exists and turn this into a session enumeration oracle.
        if (!session || !userOwnsChatSession(req.user!, session)) {
          return res.status(404).json({ message: "Chat session not found" });
        }
      } else {
        // Resume the athlete's most recent conversation rather than opening a
        // blank one. Memory has to survive a refresh, a new tab and a new
        // device — it cannot depend on the client holding a session id.
        const [mostRecent] = await storage.getUserChatSessions(userId);
        session = mostRecent ?? await storage.createChatSession({
          userId,
          messages: []
        });
      }

      const messages = session.messages as any[] || [];
      const userMessage = {
        role: "user",
        content: message,
        timestamp: new Date().toISOString()
      };

      const user = await storage.getUser(userId);
      const latestAssessment = await storage.getLatestAssessment(userId);
      const sport = user?.sport ?? "golf";

      const athleteProfile = await storage.getAthleteProfile(userId);
      const goals = await storage.getUserGoals(userId);
      const athleteContext = user ? formatAthleteContextForPrompt(user, athleteProfile, goals) : "";

      let assessmentContext = "";
      if (latestAssessment) {
        assessmentContext = `Latest X-Check: Intensity ${latestAssessment.intensityScore ?? 0}/100, Decision Making ${latestAssessment.decisionMakingScore ?? 0}/100, Diversions ${latestAssessment.diversionsScore ?? 0}/100, Execution ${latestAssessment.executionScore ?? 0}/100, Total ${latestAssessment.totalScore ?? 0}/400`;
      }

      const systemPrompt = await buildFloPrompt({
        forChatApi: true,
        sport,
        athleteContext: athleteContext || undefined,
        assessmentContext: assessmentContext || undefined,
      });

      const formattedHistory = messages.slice(-12).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      let aiResponse;
      try {
        aiResponse = await getCoachingResponse(message, formattedHistory, {
          sport,
          systemPromptOverride: systemPrompt,
          strict: true,
        });
      } catch (llmError: any) {
        // Signed-in coaching never fakes a reply. Surfacing the outage is the
        // only way an AI failure is distinguishable from FLO working (audit B3).
        console.error("[FLO-CHAT] LLM unavailable for user", userId, llmError?.message || llmError);
        return res.status(503).json({
          message: "FLO is briefly unavailable. Nothing you told me is lost — try again in a moment.",
          error: "llm_unavailable",
        });
      }
      const assistantMessage = {
        role: "assistant", 
        content: aiResponse.message,
        timestamp: new Date().toISOString(),
        suggestions: aiResponse.suggestions,
        urgencyLevel: aiResponse.urgencyLevel
      };

      const updatedMessages = [...messages, userMessage, assistantMessage];
      await storage.updateChatSession(session.id, updatedMessages);

      // Promote anything durable the athlete just disclosed into their profile,
      // so it reaches future prompts even after this conversation scrolls out
      // of the 12-message window. Never fail the reply over this.
      try {
        const learned = await applyAthleteFacts(userId, aiResponse.athleteFacts);
        if (learned.length) {
          console.log(`[FLO-MEMORY] user=${userId} learned: ${learned.join(", ")}`);
        }
      } catch (memoryError) {
        console.error("[FLO-MEMORY] Failed to persist athlete facts:", memoryError);
      }

      // Increment user's chat count for free users
      if (chatLimitations.subscriptionStatus === "free" || chatLimitations.subscriptionStatus === "expired") {
        await storage.incrementUserChatCount(userId);
      }

      // Track engagement metrics
      const today = new Date().toISOString().split('T')[0];
      try {
        await storage.updateEngagementMetric(userId, today, {
          chatMessages: 1,
          sessionDuration: 5 // approximate
        });
      } catch (engagementError) {
        console.warn("Failed to update engagement metrics:", engagementError);
      }

      // Get updated limitations for response
      const updatedLimitations = await storage.getUserChatLimitations(userId);

      res.json({ 
        session: { ...session, messages: updatedMessages },
        response: aiResponse,
        limitations: updatedLimitations
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process chat message", error: (error as Error).message });
    }
  });

  // Get user's FLO chat limitations
  app.get("/api/chat/limitations/:userId", requireAuth, requireOwnUserOrAdmin('userId'), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limitations = await storage.getUserChatLimitations(userId);
      res.json(limitations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat limitations", error: (error as Error).message });
    }
  });

  // Debug endpoint to check storage state (admin only)
  app.get("/api/debug/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const userInfo = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        passwordExists: !!user.password
      }));
      res.json({ users: userInfo, count: users.length });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get users", error: error.message });
    }
  });

  // Emergency Relief route
  app.post("/api/emergency-relief", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      
      // Log the emergency relief practice
      const today = new Date().toISOString().split('T')[0];
      const progressList = await storage.getUserProgress(userId, 1);
      const dateMatch = (p: { date: unknown }) => (p.date ? new Date(p.date as string | Date).toISOString().split('T')[0] : "") === today;
      let progress = progressList.find(dateMatch);

      if (!progress) {
        progress = await storage.createUserProgress({
          userId,
          date: new Date(today),
          emergencyRelief: 1,
        });
      } else {
        progress = await storage.updateUserProgress(progress.id, {
          emergencyRelief: (progress.emergencyRelief ?? 0) + 1,
        });
      }

      res.json({ message: "Emergency relief session logged successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to log emergency relief", error: (error as Error).message });
    }
  });

  // Practice technique route
  app.post("/api/practice-technique", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const { techniqueId } = req.body;
      
      // Log the practice session
      const today = new Date().toISOString().split('T')[0];
      const progressList = await storage.getUserProgress(userId, 1);
      const dateMatch = (p: { date: unknown }) => (p.date ? new Date(p.date as string | Date).toISOString().split('T')[0] : "") === today;
      let progress = progressList.find(dateMatch);

      if (!progress) {
        progress = await storage.createUserProgress({
          userId,
          date: new Date(today),
          practiceMinutes: 5, // assume 5 minutes per practice session
        });
      } else {
        progress = await storage.updateUserProgress(progress.id, {
          practiceMinutes: (progress.practiceMinutes ?? 0) + 5,
        });
      }

      res.json({ message: "Practice session logged successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to log practice session", error: (error as Error).message });
    }
  });

  // Share idea route
  app.post("/api/share-idea", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const { idea } = req.body;
      
      if (!idea || idea.trim().length === 0) {
        return res.status(400).json({ message: "Idea content is required" });
      }

      // Get user info for Flo integration
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create a chat session with Flo about the shared idea (schema: userId + messages array)
      const assistantReply = `Thank you for sharing your technique idea! I've received: "${idea}". This is valuable feedback that helps me understand what works for athletes like you. I'll consider incorporating elements of this approach into future coaching sessions. Your experience and insights make the Red2Blue system better for everyone.`;
      const now = new Date();
      const chatSession = await storage.createChatSession({
        userId,
        messages: [
          { role: "user", content: `User shared technique idea: "${idea}"`, timestamp: now },
          { role: "assistant", content: assistantReply, timestamp: now }
        ]
      });

      // Track idea-sharing in user_progress engagement (Phase 3)
      const today = new Date().toISOString().split("T")[0];
      const progressList = await storage.getUserProgress(userId, 1);
      const dateMatch = (p: { date: unknown }) => (p.date ? new Date(p.date as string | Date).toISOString().split("T")[0] : "") === today;
      let progress = progressList.find(dateMatch);
      if (!progress) {
        progress = await storage.createUserProgress({
          userId,
          date: new Date(today),
          chatMessages: 1,
          engagementScore: 10,
        });
      } else {
        await storage.updateUserProgress(progress.id, {
          chatMessages: (progress.chatMessages ?? 0) + 1,
          engagementScore: (progress.engagementScore ?? 0) + 10,
        });
      }

      res.json({ 
        message: "Idea shared successfully with Flo and community",
        chatSessionId: chatSession.id
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to share idea", error: (error as Error).message });
    }
  });

  // Goal tracking API routes
  app.get("/api/goals", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const goals = await storage.getUserGoals(req.user!.id);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch goals", error: (error as Error).message });
    }
  });

  app.get("/api/goals/:userId", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (req.user!.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const goals = await storage.getUserGoals(userId);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch goals", error: (error as Error).message });
    }
  });

  app.post("/api/goals", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertUserGoalSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const goal = await storage.createUserGoal(validatedData);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create goal", error: (error as Error).message });
    }
  });

  app.put("/api/goals/:id", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // First check if the goal belongs to the user
      const userGoals = await storage.getUserGoals(userId);
      const existingGoal = userGoals.find(g => g.id === goalId);
      
      if (!existingGoal) {
        return res.status(404).json({ message: "Goal not found or access denied" });
      }
      
      const updates = req.body;
      delete updates.id; // Prevent ID modification
      delete updates.userId; // Prevent user modification
      delete updates.createdAt; // Prevent creation date modification
      
      const updatedGoal = await storage.updateUserGoal(goalId, updates);
      res.json(updatedGoal);
    } catch (error) {
      res.status(500).json({ message: "Failed to update goal", error: (error as Error).message });
    }
  });

  app.patch("/api/goals/:id/toggle", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { isCompleted } = req.body;
      
      // First check if the goal belongs to the user
      const userGoals = await storage.getUserGoals(userId);
      const existingGoal = userGoals.find(g => g.id === goalId);
      
      if (!existingGoal) {
        return res.status(404).json({ message: "Goal not found or access denied" });
      }
      
      const updatedGoal = await storage.toggleGoalCompletion(goalId, isCompleted);
      res.json(updatedGoal);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle goal completion", error: (error as Error).message });
    }
  });

  app.delete("/api/goals/:id", requireAuth, requirePremium, async (req: AuthRequest, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // First check if the goal belongs to the user
      const userGoals = await storage.getUserGoals(userId);
      const existingGoal = userGoals.find(g => g.id === goalId);
      
      if (!existingGoal) {
        return res.status(404).json({ message: "Goal not found or access denied" });
      }
      
      await storage.deleteUserGoal(goalId);
      res.json({ message: "Goal deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete goal", error: (error as Error).message });
    }
  });

  // Get community ideas route (anonymous)
  app.get("/api/community-ideas", requireAuth, requirePremium, async (req, res) => {
    try {
      // For now, return some sample community ideas
      // In the future, this would pull from a community_ideas table
      const sampleIdeas = [
        {
          id: 1,
          content: "I take three deep breaths and visualize the ball's perfect path before every shot. This helps me stay calm under pressure.",
          category: "visualization",
          helpfulCount: 24,
          createdAt: new Date(Date.now() - 86400000 * 3) // 3 days ago
        },
        {
          id: 2,
          content: "When I feel tension building, I do a quick body scan and consciously relax my shoulders and jaw. Game changer!",
          category: "body_awareness",
          helpfulCount: 18,
          createdAt: new Date(Date.now() - 86400000 * 7) // 1 week ago
        },
        {
          id: 3,
          content: "I use a specific word or phrase as my mental anchor. When pressure builds, I repeat it to center myself.",
          category: "mental_anchor",
          helpfulCount: 31,
          createdAt: new Date(Date.now() - 86400000 * 2) // 2 days ago
        },
        {
          id: 4,
          content: "Between shots, I focus on one thing I can control in the next shot instead of thinking about score or outcomes.",
          category: "focus",
          helpfulCount: 27,
          createdAt: new Date(Date.now() - 86400000 * 5) // 5 days ago
        }
      ];

      res.json(sampleIdeas);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch community ideas", error: (error as Error).message });
    }
  });

  // ── Human Coaching (Ultimate tier only) ───────────────────────────
  //
  // These three used to build an object, drop it on the floor and answer
  // "sent". The request now leaves the building: it is emailed to the coach
  // declared in shared/human-coach.ts, with Mark copied. A Postmark rejection
  // is answered 502 rather than swallowed, because telling an athlete their
  // message reached a coach when it did not is the same lie the old handlers
  // told. There is no coaching-request table to write to, and adding schema for
  // one coach and a handful of athletes would be schema for its own sake.

  /** Shared by all three: same delivery, same failure answer, different subject. */
  async function forwardToCoach(
    req: AuthRequest,
    res: Response,
    kind: string,
    body: string
  ) {
    try {
      const messageId = await sendCoachingRequestEmail({
        coachEmail: PRIMARY_HUMAN_COACH.notifyEmail,
        coachName: PRIMARY_HUMAN_COACH.name,
        kind,
        athleteName: athleteDisplayName(req.user!),
        athleteEmail: req.user!.email,
        body,
      });
      res.json({
        success: true,
        message: `Sent to ${PRIMARY_HUMAN_COACH.name}. ${PRIMARY_HUMAN_COACH.responseTarget.toLowerCase()}.`,
        messageId,
      });
    } catch (error) {
      // The only place a rejected send becomes visible — the athlete gets a
      // failure, not a reason. Message, not object: this is what gets grepped.
      console.error(
        `[COACHING] ${kind} for user ${req.user!.id} not delivered: ${(error as Error)?.message || error}`
      );
      res.status(502).json({ message: "That didn't reach your coach. Please try again." });
    }
  }

  app.post("/api/human-coaching/message", requireAuth, requireUltimate, async (req: AuthRequest, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      return res.status(400).json({ message: "A message is required" });
    }
    await forwardToCoach(req, res, "Message from an athlete", message);
  });

  app.post("/api/human-coaching/progress-review", requireAuth, requireUltimate, async (req: AuthRequest, res) => {
    const request = typeof req.body?.request === "string" ? req.body.request.trim() : "";
    if (!request) {
      return res.status(400).json({ message: "Tell your coach what to review" });
    }
    await forwardToCoach(req, res, "Progress review request", request);
  });

  app.post("/api/human-coaching/schedule-request", requireAuth, requireUltimate, async (req: AuthRequest, res) => {
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    // No calendar is consulted and no time is held. This is an ask, and the
    // athlete is told exactly that on the button and in the toast.
    await forwardToCoach(
      req,
      res,
      "Session request",
      note || "Asked to arrange a 1-on-1 session. No time proposed — please follow up directly."
    );
  });

  // Admin API routes - properly secured with requireAuth and requireAdmin
  app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      console.error('Admin stats error:', error);
      res.status(500).json({ message: 'Failed to fetch admin statistics' });
    }
  });

  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { filter, search } = req.query;
      const users = await storage.getAllUsers(filter as string, search as string);
      res.json(users.map(stripPassword));
    } catch (error: any) {
      console.error('Admin users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Create an athlete from HQ. registerUser still forces free/student; any tier
  // or role the CEO asks for is applied afterwards through the same allowlist
  // the PATCH route uses, so there is exactly one place that can grant
  // entitlement without a payment.
  app.post("/api/admin/users", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      if (!email.includes('@')) {
        return res.status(400).json({ message: 'A valid email is required' });
      }

      // Only the entitlement fields go through the allowlist here; name and
      // email are already carried by registerUser below.
      const grant = pickAdminUserUpdates({
        subscriptionTier: body.subscriptionTier,
        role: body.role,
        isSubscribed: body.isSubscribed,
      });
      if ('error' in grant) return res.status(400).json({ message: grant.error });

      // A supplied password is used as-is; otherwise HQ gets a one-time temp
      // password back in this response. It is hashed on the way in and never
      // logged, so this response is the only place it exists in clear text.
      const supplied = typeof body.password === 'string' ? body.password : '';
      const tempPassword = supplied.length >= MIN_PASSWORD_LENGTH ? null : randomBytes(9).toString('base64url');
      const username = typeof body.username === 'string' && body.username.trim()
        ? body.username.trim()
        : await uniqueUsernameFromEmail(email);

      const created = await registerUser({
        username,
        firstName: typeof body.firstName === 'string' ? body.firstName : undefined,
        lastName: typeof body.lastName === 'string' ? body.lastName : undefined,
        email,
        password: tempPassword ?? supplied,
      });

      const user = Object.keys(grant.updates).length
        ? await storage.updateUser(created.id, grant.updates)
        : created;

      const { pool } = await import('./db');
      await pool.query(
        `INSERT INTO admin_audit_log (admin_user_id, action, target_table, target_id, details) VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'create_user', 'users', user.id, JSON.stringify({ email, ...grant.updates })]
      );

      res.status(201).json({ ...stripPassword(user), tempPassword });
    } catch (error: any) {
      console.error('Admin user create error:', error.message);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/users/:userId", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (Number.isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });

      const picked = pickAdminUserUpdates(req.body);
      if ('error' in picked) return res.status(400).json({ message: picked.error });
      if (!Object.keys(picked.updates).length) {
        return res.status(400).json({ message: 'No updatable fields supplied' });
      }

      // Deactivating yourself locks you out of the console that undoes it,
      // and only SQL gets you back in. Refuse.
      if (picked.updates.isActive === false && userId === req.userId) {
        return res.status(400).json({ message: 'You cannot deactivate your own account' });
      }

      const updatedUser = await storage.updateUser(userId, picked.updates);

      const { pool } = await import('./db');
      await pool.query(
        `INSERT INTO admin_audit_log (admin_user_id, action, target_table, target_id, details) VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'update_user', 'users', userId, JSON.stringify(picked.updates)]
      );

      res.json(stripPassword(updatedUser));
    } catch (error: any) {
      console.error('Admin user update error:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  app.get("/api/admin/payments", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { filter } = req.query;
      const payments = await storage.getPaymentHistory(filter as string);
      res.json(payments);
    } catch (error: any) {
      console.error('Admin payments error:', error);
      res.status(500).json({ message: 'Failed to fetch payment history' });
    }
  });

  app.post("/api/admin/send-email", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { userIds, subject, message } = req.body;
      // TODO: Implement email sending functionality
      res.json({ success: true, message: 'Emails sent successfully' });
    } catch (error: any) {
      console.error('Admin email error:', error);
      res.status(500).json({ message: 'Failed to send emails' });
    }
  });

  // Admin endpoints for detailed user progress monitoring
  app.get("/api/admin/users/:userId/moods", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { days = 30 } = req.query;
      const moods = await storage.getUserMoods(userId, parseInt(days as string));
      res.json(moods);
    } catch (error: any) {
      console.error('Admin user moods error:', error);
      res.status(500).json({ message: 'Failed to fetch user mood data' });
    }
  });

  app.get("/api/admin/users/:userId/assessments", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const assessments = await storage.getUserAssessments(userId);
      res.json(assessments);
    } catch (error: any) {
      console.error('Admin user assessments error:', error);
      res.status(500).json({ message: 'Failed to fetch user assessment data' });
    }
  });

  app.get("/api/admin/users/:userId/progress", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { days = 30 } = req.query;
      const progress = await storage.getUserProgress(userId, parseInt(days as string));
      res.json(progress);
    } catch (error: any) {
      console.error('Admin user progress error:', error);
      res.status(500).json({ message: 'Failed to fetch user progress data' });
    }
  });

  app.get("/api/admin/users/:userId/goals", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const goals = await storage.getUserGoals(userId);
      res.json(goals);
    } catch (error: any) {
      console.error('Admin user goals error:', error);
      res.status(500).json({ message: 'Failed to fetch user goals data' });
    }
  });

  app.get("/api/admin/users/:userId/chat-sessions", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const chatSessions = await storage.getUserChatSessions(userId);
      const sessionStats = {
        totalSessions: chatSessions.length,
        totalMessages: chatSessions.reduce((total, session) => {
          const messages = session.messages as any[] || [];
          return total + messages.length;
        }, 0),
        lastActivity: chatSessions.length > 0 ? chatSessions[0].updatedAt : null,
        sessions: chatSessions.map(session => ({
          id: session.id,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          messageCount: (session.messages as any[] || []).length
        }))
      };
      res.json(sessionStats);
    } catch (error: any) {
      console.error('Admin user chat sessions error:', error);
      res.status(500).json({ message: 'Failed to fetch user chat session data' });
    }
  });

  // The list route above returns counts only. This one returns the transcript,
  // so HQ can read what FLO actually said rather than trusting a number.
  app.get("/api/admin/chat-sessions/:sessionId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId, 10);
      if (Number.isNaN(sessionId)) return res.status(400).json({ message: 'Invalid session ID' });
      const chatSession = await storage.getChatSession(sessionId);
      if (!chatSession) return res.status(404).json({ message: 'Chat session not found' });

      const messages = Array.isArray(chatSession.messages) ? chatSession.messages : [];
      res.json({
        id: chatSession.id,
        userId: chatSession.userId,
        createdAt: chatSession.createdAt,
        updatedAt: chatSession.updatedAt,
        messageCount: messages.length,
        messages,
      });
    } catch (error: any) {
      console.error('Admin chat session error:', error);
      res.status(500).json({ message: 'Failed to fetch chat session' });
    }
  });

  app.get("/api/admin/users/:userId/engagement", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      try {
        const engagement = await storage.getUserEngagementMetrics(userId);
        res.json(engagement);
      } catch (methodError) {
        // If method not implemented, return placeholder data
        res.json({
          message: "Engagement metrics not yet implemented",
          totalSessions: "N/A",
          averageSessionLength: "N/A", 
          lastActiveDate: "N/A"
        });
      }
    } catch (error: any) {
      console.error('Admin user engagement error:', error);
      res.status(500).json({ message: 'Failed to fetch user engagement data' });
    }
  });

  app.get("/api/admin/users/:userId/details", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Fetch comprehensive user data - handle missing methods gracefully
      const [user, moods, assessments, progress, goals, chatSessions] = await Promise.all([
        storage.getUser(userId),
        storage.getUserMoods(userId, 30),
        storage.getUserAssessments(userId),
        storage.getUserProgress(userId, 30),
        storage.getUserGoals(userId),
        storage.getUserChatSessions(userId)
      ]);

      // Try to get engagement metrics, fallback if not implemented
      let engagement = null;
      try {
        engagement = await storage.getUserEngagementMetrics(userId);
      } catch (error) {
        engagement = {
          message: "Engagement metrics not yet implemented",
          totalSessions: "N/A",
          averageSessionLength: "N/A",
          lastActiveDate: "N/A"
        };
      }

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Calculate summary stats
      const chatStats = {
        totalSessions: chatSessions.length,
        totalMessages: chatSessions.reduce((total, session) => {
          const messages = session.messages as any[] || [];
          return total + messages.length;
        }, 0),
        lastActivity: chatSessions.length > 0 ? chatSessions[0].updatedAt : null
      };

      const userDetails = {
        user: stripPassword(user),
        recentMoods: moods.slice(0, 10),
        latestAssessment: assessments[0] || null,
        assessmentCount: assessments.length,
        recentProgress: progress.slice(0, 10),
        activeGoals: goals.filter(g => !g.isCompleted),
        completedGoals: goals.filter(g => g.isCompleted),
        chatActivity: chatStats,
        engagement: engagement || null
      };

      res.json(userDetails);
    } catch (error: any) {
      console.error('Admin user details error:', error);
      res.status(500).json({ message: 'Failed to fetch comprehensive user details' });
    }
  });

  // DB Explorer — paginated table query
  app.get("/api/admin/db-explorer/:table", requireAuth, requireAdmin, async (req, res) => {
    const ALLOWED_TABLES = [
      'users','assessments','mental_skills_x_checks','recognition_assessments',
      'control_circles','what_if_planning','screw_up_cascade','priority_planning',
      'pre_shot_routines','certification_progress','chat_sessions','user_coaching_profiles',
      'ai_recommendations','coaching_insights','user_engagement_metrics','user_progress',
      'daily_moods','daily_check_ins','user_goals','notifications','flo_subscriptions',
      'techniques','scenarios','technique_progress','calendar_reminders',
      'admin_audit_log','feature_flags'
    ];
    const table = req.params.table;
    if (!ALLOWED_TABLES.includes(table)) {
      return res.status(400).json({ message: 'Table not allowed' });
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;
    const sortCol = req.query.sortCol as string | undefined;
    const sortDir = (req.query.sortDir as string) === 'desc' ? 'DESC' : 'ASC';

    try {
      const { pool } = await import('./db');
      const orderClause = sortCol ? `ORDER BY "${sortCol}" ${sortDir}` : 'ORDER BY id DESC';
      const countResult = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
      const rowsResult = await pool.query(
        `SELECT * FROM "${table}" ${orderClause} LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      res.json({
        rows: rowsResult.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Feature flags — get
  app.get("/api/admin/feature-flags", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { pool } = await import('./db');
      const result = await pool.query('SELECT * FROM feature_flags ORDER BY flag_key');
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Feature flags — update
  app.post("/api/admin/feature-flags", requireAuth, requireAdmin, async (req, res) => {
    const { flag_key, flag_value } = req.body;
    if (typeof flag_key !== 'string' || typeof flag_value !== 'boolean') {
      return res.status(400).json({ message: 'Invalid input' });
    }
    try {
      const { pool } = await import('./db');
      await pool.query(
        `UPDATE feature_flags SET flag_value = $1, updated_by = $2, updated_at = now() WHERE flag_key = $3`,
        [flag_value, (req as AuthRequest).userId, flag_key]
      );
      await pool.query(
        `INSERT INTO admin_audit_log (admin_user_id, action, target_table, details) VALUES ($1, $2, $3, $4)`,
        [(req as AuthRequest).userId, 'update_feature_flag', 'feature_flags', JSON.stringify({ flag_key, flag_value })]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── LMS / Learning Curriculum ───────────────────────────────────
  // Read endpoints use requireAuth (not requirePremium) so free users can
  // browse the curriculum and see locked lessons as an upsell. Access to
  // lesson content + progress is gated per-lesson: full access via the
  // "curriculum" entitlement, or individual lessons flagged isFreePreview.

  const userHasCurriculumAccess = (user: { subscriptionTier?: string | null; role?: string | null }) =>
    hasFeatureAccess((user.subscriptionTier as any) ?? "free", user.role, "curriculum");

  const lessonIsAccessible = (
    user: { subscriptionTier?: string | null; role?: string | null },
    lesson: { isFreePreview: boolean }
  ) => lesson.isFreePreview || userHasCurriculumAccess(user);

  // GET /api/learn/courses — list published courses with access + progress summary
  app.get("/api/learn/courses", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const allCourses = await storage.getPublishedCourses();
      const progress = await storage.getLessonProgressForUser(user.id);
      const completedIds = new Set(progress.filter((p) => p.status === "completed").map((p) => p.lessonId));
      const result = await Promise.all(allCourses.map(async (course) => {
        const courseLessons = await storage.getLessonsForCourse(course.id);
        const completed = courseLessons.filter((l) => completedIds.has(l.id)).length;
        return {
          ...course,
          hasAccess: userHasCurriculumAccess(user),
          lessonCount: courseLessons.length,
          completedCount: completed,
          percentComplete: courseLessons.length ? Math.round((completed / courseLessons.length) * 100) : 0,
        };
      }));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses", error: (error as Error).message });
    }
  });

  // GET /api/learn/courses/:slug — full course outline (modules + lessons, no content) with per-lesson lock/status
  app.get("/api/learn/courses/:slug", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const course = await storage.getCourseBySlug(req.params.slug);
      if (!course || !course.isPublished) {
        return res.status(404).json({ message: "Course not found" });
      }
      const hasAccess = userHasCurriculumAccess(user);
      const modules = await storage.getModulesForCourse(course.id);
      const courseLessons = await storage.getLessonsForCourse(course.id);
      const progress = await storage.getLessonProgressForCourse(user.id, course.id);
      const statusByLesson = new Map(progress.map((p) => [p.lessonId, p.status]));

      const modulesOut = modules.map((m) => ({
        id: m.id,
        slug: m.slug,
        title: m.title,
        subtitle: m.subtitle,
        summary: m.summary,
        sortOrder: m.sortOrder,
        lessons: courseLessons
          .filter((l) => l.moduleId === m.id)
          .map((l) => ({
            id: l.id,
            slug: l.slug,
            title: l.title,
            lessonType: l.lessonType,
            summary: l.summary,
            estimatedMinutes: l.estimatedMinutes,
            toolKey: l.toolKey,
            isFreePreview: l.isFreePreview,
            locked: !lessonIsAccessible(user, l),
            status: statusByLesson.get(l.id) ?? "not_started",
          })),
      }));

      const completed = courseLessons.filter((l) => statusByLesson.get(l.id) === "completed").length;
      const certificate = await storage.getCertificate(user.id, course.id);

      res.json({
        course,
        hasAccess,
        modules: modulesOut,
        progress: {
          total: courseLessons.length,
          completed,
          percent: courseLessons.length ? Math.round((completed / courseLessons.length) * 100) : 0,
        },
        certificate: certificate ?? null,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course", error: (error as Error).message });
    }
  });

  // GET /api/learn/lessons/:slug — single lesson with content (withheld if locked)
  app.get("/api/learn/lessons/:slug", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const lesson = await storage.getLessonBySlug(req.params.slug);
      if (!lesson || !lesson.isPublished) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      const course = await storage.getCourseById(lesson.courseId);
      const modules = await storage.getModulesForCourse(lesson.courseId);
      const module = modules.find((m) => m.id === lesson.moduleId);
      const courseLessons = await storage.getLessonsForCourse(lesson.courseId);
      const idx = courseLessons.findIndex((l) => l.id === lesson.id);
      const prev = idx > 0 ? courseLessons[idx - 1] : null;
      const next = idx >= 0 && idx < courseLessons.length - 1 ? courseLessons[idx + 1] : null;
      const locked = !lessonIsAccessible(user, lesson);
      const [progressRow] = (await storage.getLessonProgressForCourse(user.id, lesson.courseId))
        .filter((p) => p.lessonId === lesson.id);

      res.json({
        lesson: {
          id: lesson.id,
          slug: lesson.slug,
          title: lesson.title,
          lessonType: lesson.lessonType,
          summary: lesson.summary,
          estimatedMinutes: lesson.estimatedMinutes,
          toolKey: locked ? null : lesson.toolKey,
          content: locked ? [] : lesson.content,
          isFreePreview: lesson.isFreePreview,
        },
        course: course ? { id: course.id, slug: course.slug, title: course.title } : null,
        module: module ? { id: module.id, slug: module.slug, title: module.title } : null,
        locked,
        status: progressRow?.status ?? "not_started",
        prev: prev ? { slug: prev.slug, title: prev.title } : null,
        next: next ? { slug: next.slug, title: next.title } : null,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lesson", error: (error as Error).message });
    }
  });

  // POST /api/learn/lessons/:id/progress — mark a lesson in_progress or completed
  app.post("/api/learn/lessons/:id/progress", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const lessonId = parseInt(req.params.id, 10);
      if (Number.isNaN(lessonId)) return res.status(400).json({ message: "Invalid lesson id" });
      const lesson = await storage.getLessonById(lessonId);
      if (!lesson || !lesson.isPublished) return res.status(404).json({ message: "Lesson not found" });
      if (!lessonIsAccessible(user, lesson)) {
        return res.status(403).json({ message: "Upgrade required to track this lesson" });
      }
      const status = req.body?.status === "completed" ? "completed" : "in_progress";
      const updated = await storage.upsertLessonProgress(user.id, lessonId, status);

      // Recompute course progress; auto-issue certificate when every accessible lesson is done.
      const courseLessons = await storage.getLessonsForCourse(lesson.courseId);
      const accessibleLessons = courseLessons.filter((l) => lessonIsAccessible(user, l));
      const progress = await storage.getLessonProgressForCourse(user.id, lesson.courseId);
      const completedIds = new Set(progress.filter((p) => p.status === "completed").map((p) => p.lessonId));
      const allDone =
        accessibleLessons.length > 0 &&
        userHasCurriculumAccess(user) &&
        accessibleLessons.every((l) => completedIds.has(l.id));

      let certificate = await storage.getCertificate(user.id, lesson.courseId);
      if (allDone && !certificate) {
        const code = `R2B-${lesson.courseId}-${user.id}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        certificate = await storage.issueCertificate(user.id, lesson.courseId, code);
      }

      res.json({
        progress: updated,
        courseProgress: {
          total: courseLessons.length,
          completed: courseLessons.filter((l) => completedIds.has(l.id)).length,
        },
        certificate: certificate ?? null,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update progress", error: (error as Error).message });
    }
  });

  // GET /api/learn/me — the user's curriculum progress + certificates
  app.get("/api/learn/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const allCourses = await storage.getPublishedCourses();
      const progress = await storage.getLessonProgressForUser(user.id);
      const completedIds = new Set(progress.filter((p) => p.status === "completed").map((p) => p.lessonId));
      const certificates = await storage.getCertificatesForUser(user.id);
      const courses = await Promise.all(allCourses.map(async (course) => {
        const courseLessons = await storage.getLessonsForCourse(course.id);
        const completed = courseLessons.filter((l) => completedIds.has(l.id)).length;
        return {
          slug: course.slug,
          title: course.title,
          total: courseLessons.length,
          completed,
          percent: courseLessons.length ? Math.round((completed / courseLessons.length) * 100) : 0,
        };
      }));
      res.json({ courses, certificates });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch learning progress", error: (error as Error).message });
    }
  });

  // ── Admin: LMS progress ─────────────────────────────────────────
  // Read-only views over lesson_progress. Nothing here is derived or
  // estimated: every number is a row count.

  // GET /api/admin/users/:userId/curriculum — one athlete's lesson-by-lesson state
  app.get("/api/admin/users/:userId/curriculum", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (Number.isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const [allCourses, progress, certificates] = await Promise.all([
        storage.getPublishedCourses(),
        storage.getLessonProgressForUser(userId),
        storage.getCertificatesForUser(userId),
      ]);
      const progressByLesson = new Map(progress.map((p) => [p.lessonId, p]));

      const courses = await Promise.all(allCourses.map(async (course) => {
        const [modules, courseLessons] = await Promise.all([
          storage.getModulesForCourse(course.id),
          storage.getLessonsForCourse(course.id),
        ]);
        const moduleTitle = new Map(modules.map((m) => [m.id, m.title]));
        const lessons = courseLessons.map((l) => {
          const row = progressByLesson.get(l.id);
          return {
            id: l.id,
            slug: l.slug,
            title: l.title,
            moduleTitle: moduleTitle.get(l.moduleId) ?? null,
            isFreePreview: l.isFreePreview,
            status: row?.status ?? "not_started",
            completedAt: row?.completedAt ?? null,
          };
        });
        const completed = lessons.filter((l) => l.status === "completed").length;
        return {
          slug: course.slug,
          title: course.title,
          total: lessons.length,
          completed,
          inProgress: lessons.filter((l) => l.status === "in_progress").length,
          percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
          certificate: certificates.find((c) => c.courseId === course.id) ?? null,
          lessons,
        };
      }));

      res.json({
        user: { id: user.id, email: user.email, role: user.role, subscriptionTier: user.subscriptionTier },
        courses,
      });
    } catch (error: any) {
      console.error('Admin user curriculum error:', error);
      res.status(500).json({ message: 'Failed to fetch curriculum progress' });
    }
  });

  // GET /api/admin/curriculum/summary — how many athletes started/finished each course
  app.get("/api/admin/curriculum/summary", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const { pool } = await import('./db');
      const { rows } = await pool.query(`
        WITH lesson_counts AS (
          SELECT course_id, COUNT(*)::int AS total
          FROM lessons WHERE is_published = true
          GROUP BY course_id
        ),
        per_user AS (
          SELECT l.course_id,
                 lp.user_id,
                 COUNT(*) FILTER (WHERE lp.status = 'completed')::int AS completed
          FROM lesson_progress lp
          JOIN lessons l ON l.id = lp.lesson_id
          WHERE l.is_published = true
          GROUP BY l.course_id, lp.user_id
        )
        SELECT c.slug,
               c.title,
               lc.total AS "lessonCount",
               COUNT(pu.user_id)::int AS "athletesStarted",
               COUNT(pu.user_id) FILTER (WHERE pu.completed >= lc.total)::int AS "athletesCompleted",
               COALESCE(SUM(pu.completed), 0)::int AS "lessonsCompleted",
               (SELECT COUNT(*)::int FROM course_certificates cc WHERE cc.course_id = c.id) AS "certificatesIssued"
        FROM courses c
        JOIN lesson_counts lc ON lc.course_id = c.id
        LEFT JOIN per_user pu ON pu.course_id = c.id
        WHERE c.is_published = true
        GROUP BY c.id, c.slug, c.title, lc.total
        ORDER BY c.sort_order, c.id
      `);
      res.json(rows);
    } catch (error: any) {
      console.error('Admin curriculum summary error:', error);
      res.status(500).json({ message: 'Failed to fetch curriculum summary' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
