import bcrypt from 'bcrypt';
import crypto from 'crypto';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { generateAIProfile } from './openai';
import { debugLogger, withErrorLogging } from './debug';

// ── Google OAuth Config ───────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'https://cerosity.com/api/auth/google/callback';

export function isGoogleOAuthConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    oauthState?: string;
    /** Server-side count of anonymous landing-chat turns (audit B5). */
    landingChatCount?: number;
  }
}

// PostgreSQL session store to prevent memory leaks
const PgSession = connectPg(session);

let sessionStore;
try {
  debugLogger.success('auth', 'Initializing PostgreSQL session store...');
  sessionStore = new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: 'sessions',
  });
  debugLogger.success('auth', 'PostgreSQL session store initialized successfully');
} catch (error: any) {
  debugLogger.error('auth', 'Failed to initialize PostgreSQL session store', {
    error: error.message,
    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'MISSING'
  });
  throw error;
}

// Session configuration with logging
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  debugLogger.error('auth', 'SESSION_SECRET environment variable is missing');
  throw new Error('SESSION_SECRET must be set. Add it to your .env file.');
}
debugLogger.success('auth', 'SESSION_SECRET found and configured');

const isProduction = process.env.NODE_ENV === 'production';

export const sessionConfig = {
  store: sessionStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true, // Prevent XSS access to session cookies
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    // 'lax', not 'none'. The old value existed to survive the Replit preview
    // iframe; Replit is gone (CLAUDE.md Rule 4) and the only remaining mention
    // of an iframe anywhere in this repo was the comment on this line. With
    // 'none' the session cookie rides along on every cross-site request, which
    // is what made every state-changing endpoint CSRF-reachable (audit D4).
    // 'lax' still sends the cookie on top-level navigations, so normal sign-in
    // and email links are unaffected.
    sameSite: 'lax' as const,
  },
  name: 'connect.sid', // Explicit session name
};

export interface AuthRequest extends Request {
  userId?: number;
  user?: any;
}

export const requireAuth = withErrorLogging('auth', 'authentication check', async (req: AuthRequest, res: Response, next: NextFunction) => {
  debugLogger.log('auth', 'success', `Auth check for ${req.method} ${req.path}`, {
    sessionId: req.session.id,
    hasUserId: !!req.session.userId,
    userAgent: req.get('User-Agent')
  });

  if (!req.session.userId) {
    debugLogger.warning('auth', 'Authentication required - no session userId', {
      sessionId: req.session.id,
      path: req.path
    });
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    debugLogger.log('auth', 'success', `Looking up user ${req.session.userId}`);
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      debugLogger.warning('auth', 'User not found in database', {
        userId: req.session.userId,
        sessionId: req.session.id
      });
      return res.status(401).json({ message: 'User not found' });
    }

    // Deactivating has to cut off the sessions already open, otherwise turning
    // an athlete off does nothing until their cookie happens to expire.
    if (user.isActive === false) {
      debugLogger.warning('auth', 'Session refused - account deactivated', {
        userId: user.id,
        path: req.path
      });
      return res.status(401).json({ message: 'This account has been deactivated. Contact Cerosity support.' });
    }

    req.userId = user.id;
    req.user = user;
    debugLogger.success('auth', `User authenticated: ${user.email} (ID: ${user.id})`);
    next();
  } catch (error: any) {
    debugLogger.error('auth', 'Authentication error during user lookup', {
      userId: req.session.userId,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ message: 'Authentication error' });
  }
});

/** Allow premium or ultimate (and admin/coach). Use for all premium-only features. */
export const requirePremium = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.user.role === 'admin' || req.user.role === 'coach') {
    return next();
  }
  const tier = req.user.subscriptionTier || 'free';
  if (tier !== 'premium' && tier !== 'ultimate') {
    return res.status(403).json({
      message: 'Premium subscription required',
      upgradeRequired: true,
      currentTier: tier
    });
  }
  next();
};

/** Ultimate only (and admin/coach). Use for human-coaching and other ultimate-only features. */
export const requireUltimate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.user.role === 'admin' || req.user.role === 'coach') {
    return next();
  }
  const tier = req.user.subscriptionTier || 'free';
  if (tier !== 'ultimate') {
    return res.status(403).json({
      message: 'Ultimate subscription required',
      upgradeRequired: true,
      currentTier: tier
    });
  }
  next();
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

export const requireCoach = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'coach' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Coach access required' });
  }

  next();
};

/** Use after requireAuth. Ensures the request targets the current user or the user is admin. */
export function requireOwnUserOrAdmin(paramName = 'userId') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const paramId = parseInt(req.params[paramName] ?? req.body?.[paramName], 10);
    if (Number.isNaN(paramId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (req.user.id !== paramId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function registerUser(userData: {
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  dateOfBirth?: string;
  dexterity?: string;
  gender?: string;
  golfHandicap?: number;
  golfExperience?: string;
  goals?: string;
  bio?: string;
  // Deliberately no subscriptionTier / isSubscribed. Registration always
  // creates a free account; entitlement is granted by payment, never by the
  // client asking for it (audit A3).
}) {
  // Check if user already exists by username or email
  const existingUserByUsername = await storage.getUserByUsername(userData.username);
  if (existingUserByUsername) {
    throw new Error('Username already exists');
  }

  const existingUserByEmail = await storage.getUserByEmail(userData.email);
  if (existingUserByEmail) {
    throw new Error('Email already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(userData.password);

  // Generate AI profile from bio if provided
  let aiGeneratedProfile = null;
  // TODO: Fix AI profile generation - temporarily disabled
  // if (userData.bio) {
  //   try {
  //     aiGeneratedProfile = await generateAIProfile(userData.bio, {
  //       username: userData.username,
  //       dexterity: userData.dexterity,
  //       gender: userData.gender,
  //       golfHandicap: userData.golfHandicap
  //     });
  //   } catch (error) {
  //     console.error('Failed to generate AI profile:', error);
  //     // Continue without AI profile if generation fails
  //   }
  // }

  // Create user
  const newUser = await storage.createUser({
    username: userData.username,
    firstName: userData.firstName || null,
    lastName: userData.lastName || null,
    email: userData.email,
    password: hashedPassword,
    dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
    dexterity: userData.dexterity || null,
    gender: userData.gender || null,
    golfHandicap: userData.golfHandicap || null,
    golfExperience: userData.golfExperience || null,
    goals: userData.goals || null,
    bio: userData.bio || null,
    aiGeneratedProfile,
    // Forced, not derived from input. Upgrades happen through the payment
    // flow; nothing a registration request says can change these.
    isSubscribed: false,
    subscriptionTier: 'free'
  });

  return newUser;
}

export async function loginUser(email: string, password: string) {
  console.log('Login attempt for email:', email);
  const user = await storage.getUserByEmail(email);
  
  console.log('User found:', !!user, user ? 'with email: ' + user.email : 'not found');
  
  if (!user) {
    console.log('No user found with email:', email);
    throw new Error('Invalid email or password');
  }

  console.log('Verifying password for user:', user.username);
  const isValid = await verifyPassword(password, user.password);
  console.log('Password verification result:', isValid);

  if (!isValid) {
    console.log('Password verification failed for user:', user.username);
    throw new Error('Invalid email or password');
  }

  // Deactivated accounts keep their history but cannot get back in. Said
  // plainly rather than as "invalid password" so the athlete calls support
  // instead of resetting a password that was never the problem.
  if (user.isActive === false) {
    console.log('Login refused — account deactivated:', user.username);
    throw new Error('This account has been deactivated. Contact Cerosity support.');
  }

  // Never leaves the server: the bcrypt hash, and the reset digest — the one
  // secret that could be replayed into taking the account over.
  const {
    password: _,
    passwordResetTokenHash: __,
    passwordResetExpiresAt: ___,
    ...userWithoutSecrets
  } = user;
  console.log('Login successful for user:', userWithoutSecrets.username);
  return userWithoutSecrets;
}

// ── Google OAuth ──────────────────────────────────────────────────

/** Build Google OAuth authorization URL (no passport dependency) */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    state,
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Exchange authorization code for tokens, return Google profile */
async function exchangeGoogleCode(code: string): Promise<{
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  sub: string;
}> {
  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }
  const tokens = await tokenRes.json();

  // Fetch user info
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userInfoRes.ok) throw new Error('Failed to fetch Google user info');
  return userInfoRes.json();
}

/** Handle Google OAuth callback — find or create user, set session */
export async function handleGoogleCallback(code: string, req: Request): Promise<{ user: any; isNew: boolean }> {
  const profile = await exchangeGoogleCode(code);

  // Try find existing user by email
  let user = await storage.getUserByEmail(profile.email);
  let isNew = false;

  if (user) {
    // Existing user — log them in, unless the account has been turned off.
    // Google is a second front door; it has to honour the same lock.
    if (user.isActive === false) {
      debugLogger.warning('auth', `Google SSO refused - account deactivated: ${profile.email}`);
      throw new Error('This account has been deactivated. Contact Cerosity support.');
    }
    debugLogger.success('auth', `Google SSO login: ${profile.email}`);
  } else {
    // New user — create account
    const username = `${(profile.given_name || 'user').toLowerCase()}${(profile.family_name || '').toLowerCase()}${Math.floor(Math.random() * 100)}`;
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await hashPassword(randomPassword);

    user = await storage.createUser({
      username,
      firstName: profile.given_name || null,
      lastName: profile.family_name || null,
      email: profile.email,
      password: hashedPassword,
      subscriptionTier: 'free',
      isSubscribed: false,
    });
    isNew = true;
    debugLogger.success('auth', `Google SSO new account: ${profile.email} (${username})`);
  }

  // Set session
  req.session.userId = user.id;

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, isNew };
}