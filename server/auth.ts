import bcrypt from 'bcrypt';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { generateAIProfile } from './openai';
import { debugLogger, withErrorLogging } from './debug';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
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
    sameSite: isProduction ? 'none' : 'lax', // Allow cross-site in iframe
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
  subscriptionTier?: string;
  isSubscribed?: boolean;
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
    isSubscribed: userData.isSubscribed || false,
    subscriptionTier: userData.subscriptionTier || 'free'
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

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;
  console.log('Login successful for user:', userWithoutPassword.username);
  return userWithoutPassword;
}