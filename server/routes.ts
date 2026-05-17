import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import Stripe from "stripe";
import { z } from "zod";
import { storage } from "./storage";
import { insertAssessmentSchema, insertChatSessionSchema, insertUserProgressSchema, insertPreShotRoutineSchema, insertMentalSkillsXCheckSchema, insertControlCircleSchema, insertDailyMoodSchema, insertUserGoalSchema } from "@shared/schema";
import { getCoachingResponse, analyzeAssessmentResults, generatePersonalizedPlan } from "./gemini";
import { sessionConfig, requireAuth, requirePremium, requireUltimate, requireAdmin, requireCoach, requireOwnUserOrAdmin, registerUser, loginUser, AuthRequest } from "./auth";
import { recommendationEngine } from "./recommendationEngine";
import { debugLogger, withErrorLogging } from "./debug";

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
      console.log('Registration data:', req.body);
      const user = await registerUser(req.body);
      
      // Set session
      req.session.userId = user.id;
      
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: 'Session creation failed' });
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        console.log('User registered successfully:', userWithoutPassword.id);
        res.json(userWithoutPassword);
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
      req.session.userId = user.id;
      
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('Session save error on login:', err);
          return res.status(500).json({ message: 'Session creation failed' });
        }
        
        console.log('Session saved successfully for user:', user.username);
        res.json(user);
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

  app.get("/api/auth/me", async (req: AuthRequest, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });



  // Stripe payment route for tier purchases
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, tier, description } = req.body;
      
      if (!amount || !tier) {
        return res.status(400).json({ message: "Amount and tier are required" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        description: description || `Red2Blue ${tier} Access`,
        metadata: {
          tier: tier,
          product: 'red2blue_access'
        }
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Payment intent creation error:', error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe hosted checkout session for tier purchases
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { tier, amount, success_url, cancel_url } = req.body;
      
      console.log('Creating checkout session with:', { tier, amount, success_url, cancel_url });
      
      if (!tier || !amount) {
        return res.status(400).json({ message: "Tier and amount are required" });
      }

      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: tier === 'ultimate' ? 'Red2Blue Ultimate Access' : 'Red2Blue Premium Access',
                description: tier === 'ultimate' 
                  ? 'Lifetime access to all Red2Blue tools + human coaching' 
                  : 'Lifetime access to all Red2Blue tools and AI coaching',
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment' as const,
        success_url: success_url || `https://${req.headers.host}/signup-after-payment?tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `https://${req.headers.host}/checkout-hosted?tier=${tier}`,
        metadata: {
          tier: tier,
          product: 'red2blue_access'
        }
      };

      console.log('Session config:', JSON.stringify(sessionConfig, null, 2));

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

  // Demo route to upgrade subscription tier
  app.post("/api/auth/upgrade-tier", async (req: AuthRequest, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { tier } = req.body;
      if (!['free', 'premium', 'ultimate'].includes(tier)) {
        return res.status(400).json({ message: 'Invalid tier' });
      }
      
      const updatedUser = await storage.updateUser(req.session.userId, { 
        subscriptionTier: tier,
        isSubscribed: tier !== 'free'
      });
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Upgrade tier error:', error);
      res.status(500).json({ message: 'Failed to upgrade tier' });
    }
  });

  // User profile update endpoint
  app.patch("/api/users/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updateData = req.body;

      // Ensure user can only update their own profile
      if (req.session.userId !== userId) {
        return res.status(403).json({ message: "Cannot update another user's profile" });
      }

      // Remove sensitive fields that shouldn't be updated via this endpoint
      const { password, stripeCustomerId, stripeSubscriptionId, ...safeUpdateData } = updateData;

      const updatedUser = await storage.updateUser(userId, safeUpdateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
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

      // Define pricing based on tier using your product IDs
      const productPricing = {
        premium: {
          productId: 'prod_SR3rZuRQG7JnqR',
          amount: 69000, // $690.00 in cents
          description: 'Premium Access - Lifetime',
        },
        ultimate: {
          productId: 'prod_SR3txKbR55uws2',
          amount: 159000, // $1590.00 in cents
          description: 'Ultimate Access - Lifetime',
        },
      };

      const pricing = productPricing[tier as keyof typeof productPricing];
      if (!pricing) {
        return res.status(400).json({ message: 'Invalid access tier' });
      }

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

  // Webhook for Stripe events
  app.post("/api/webhook/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle payment events
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handlePaymentSuccess(session);
        break;
    }

    res.json({ received: true });
  });

  async function handlePaymentSuccess(session: any) {
    // Get user ID and tier from session metadata
    const userId = parseInt(session.metadata.userId);
    const tier = session.metadata.tier;
    
    if (userId && tier) {
      await storage.updateUser(userId, {
        isSubscribed: true,
        subscriptionTier: tier,
        stripeCustomerId: session.customer,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: null, // Lifetime access
      });
    }
  }

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
      const { message, messageCount, conversationHistory } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        clearTimeout(requestTimeout);
        return res.status(400).json({ message: "Please provide a valid message" });
      }

      if (message.length > 500) {
        clearTimeout(requestTimeout);
        return res.status(400).json({ message: "Message too long. Please keep it under 500 characters." });
      }

      const count = typeof messageCount === 'number' ? messageCount : 1;
      const history = Array.isArray(conversationHistory) ? conversationHistory : [];

      console.log(`[LANDING-CHAT] msg #${count}: "${message.substring(0, 80)}"`);

      // Build staged system prompt based on message count
      let salesDirective = '';
      if (count <= 1) {
        salesDirective = `This is the visitor's FIRST message. After helping them, naturally ask: "By the way — what's your name, and what sport or performance area do you focus on?" Frame it as needing to know to give better advice.`;
      } else if (count === 3) {
        salesDirective = `This is message 3. You've been helpful. Now weave in a SOFT pitch: mention that Cerosity's full Red2Blue programme has helped athletes cut performance anxiety by 40%, and that there's a free trial available. Keep it natural — don't hard sell. Continue helping with their question.`;
      } else if (count >= 5) {
        salesDirective = `This is message ${count}. The visitor is engaged. Make a WARM close: say something like "I'd love to keep working with you on this. If you drop your email, I can send you a free Red2Blue starter guide and early access to the full platform. What's your best email?" If they've already given their email, just keep coaching — no repeated asks.`;
      }

      const systemPrompt = `You are FLO — Cerosity's AI mental performance coach. You use the Red2Blue methodology (Red Head = overthinking/anxiety, Blue Head = calm/focused/present).

Your personality: Direct, warm, no-nonsense. You're like a trusted coach — empathetic but push people to take action. Use short punchy sentences. No corporate speak. Light humour when appropriate.

CURRENT COACHING CONTEXT:
- This is a free landing page conversation (visitor not yet signed up)
- Help them genuinely with whatever mental performance challenge they raise
- Use Red2Blue concepts naturally: control circles, breathing, visualization, self-talk reframe
${salesDirective ? `\nSALES STAGE INSTRUCTION:\n${salesDirective}` : ''}

RULES:
- Keep responses under 120 words
- Always be genuinely helpful FIRST, sales second
- Never be pushy or fake
- If they share name/sport, acknowledge it and use their name going forward
- Reference specific R2B techniques relevant to their situation

USER'S MESSAGE: "${message.trim()}"

Format your response as JSON:
{
  "message": "Your coaching response with natural sales weave",
  "suggestions": ["2-3 follow-up prompts the user might want to ask"],
  "urgencyLevel": "low"
}`;

      const formattedHistory = history.slice(-8).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const response = await getCoachingResponse(message.trim(), formattedHistory, {
        latestAssessment: null,
        recentProgress: [],
        sport: "general",
        systemPromptOverride: systemPrompt
      });

      clearTimeout(requestTimeout);

      if (!res.headersSent) {
        res.json({
          message: response.message,
          suggestions: response.suggestions || [],
          urgencyLevel: response.urgencyLevel || "low"
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

  app.get("/api/chat/sessions/:userId", requireAuth, requirePremium, requireOwnUserOrAdmin('userId'), async (req, res) => {
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
      const validatedData = insertDailyMoodSchema.parse(req.body);
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
      const { userId, message, sessionId } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ message: "userId and message are required" });
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
        if (!session) {
          return res.status(404).json({ message: "Chat session not found" });
        }
      } else {
        session = await storage.createChatSession({
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

      const latestAssessment = await storage.getLatestAssessment(userId);
      const recentProgress = await storage.getUserProgress(userId, 7);
      const sport = (req.user as any)?.sport ?? "golf";
      const userContext = { latestAssessment, recentProgress, sport };
      const aiResponse = await getCoachingResponse(message, messages, userContext);
      const assistantMessage = {
        role: "assistant", 
        content: aiResponse.message,
        timestamp: new Date().toISOString(),
        suggestions: aiResponse.suggestions,
        urgencyLevel: aiResponse.urgencyLevel
      };

      const updatedMessages = [...messages, userMessage, assistantMessage];
      await storage.updateChatSession(session.id, updatedMessages);

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

  // Human Coaching API routes (Ultimate tier only)
  app.post("/api/human-coaching/message", requireAuth, requireUltimate, async (req: AuthRequest, res) => {
    try {
      const { message } = req.body;
      const userId = req.user!.id;
      
      // In a real implementation, this would send the message to the coach
      // For now, we'll just acknowledge receipt
      const response = {
        id: Date.now(),
        userId,
        message,
        status: "sent",
        timestamp: new Date(),
        coachResponse: null
      };
      
      res.json({ 
        success: true, 
        message: "Message sent to your coach. They will respond within 24 hours.",
        data: response 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to send message", error: (error as Error).message });
    }
  });

  app.post("/api/human-coaching/progress-review", requireAuth, requireUltimate, async (req: AuthRequest, res) => {
    try {
      const { request } = req.body;
      const userId = req.user!.id;
      
      // In a real implementation, this would trigger a coach review process
      const response = {
        id: Date.now(),
        userId,
        reviewRequest: request,
        status: "pending",
        timestamp: new Date(),
        estimatedCompletion: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
      };
      
      res.json({ 
        success: true, 
        message: "Progress review request submitted. Your coach will provide feedback within 48 hours.",
        data: response 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to request review", error: (error as Error).message });
    }
  });

  app.post("/api/human-coaching/schedule-request", requireAuth, requireUltimate, async (req: AuthRequest, res) => {
    try {
      const { requestType } = req.body;
      const userId = req.user!.id;
      
      // In a real implementation, this would integrate with a calendar booking system
      const response = {
        id: Date.now(),
        userId,
        requestType,
        status: "pending",
        timestamp: new Date(),
        message: "Your coach will contact you within 24 hours to schedule your session."
      };
      
      res.json({ 
        success: true, 
        message: "Session request sent. Your coach will contact you within 24 hours to schedule.",
        data: response 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to request session", error: (error as Error).message });
    }
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
      res.json(users);
    } catch (error: any) {
      console.error('Admin users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.patch("/api/admin/users/:userId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const updates = req.body;
      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
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

      const { password, ...userWithoutPassword } = user;
      
      const userDetails = {
        user: userWithoutPassword,
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

  const httpServer = createServer(app);
  return httpServer;
}
