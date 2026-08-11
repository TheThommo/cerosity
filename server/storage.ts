import {
  users, assessments, chatSessions, userProgress, techniques, scenarios,
  preShotRoutines, mentalSkillsXChecks, controlCircles, userCoachingProfiles,
  aiRecommendations, coachingInsights, userEngagementMetrics, dailyMoods,
  floSubscriptions, userGoals, notifications, leads, floBrainDocuments,
  type User, type InsertUser, type Assessment, type InsertAssessment,
  type ChatSession, type InsertChatSession, type UserProgress, type InsertUserProgress,
  type Technique, type InsertTechnique, type Scenario, type InsertScenario,
  type PreShotRoutine, type InsertPreShotRoutine, type MentalSkillsXCheck,
  type InsertMentalSkillsXCheck, type ControlCircle, type InsertControlCircle,
  type UserCoachingProfile, type InsertUserCoachingProfile, type AiRecommendation,
  type InsertAiRecommendation, type CoachingInsight, type InsertCoachingInsight,
  type UserEngagementMetric, type InsertUserEngagementMetric, type DailyMood,
  type InsertDailyMood, type UserGoal, type InsertUserGoal,
  type FloSubscription, type InsertFloSubscription, type ChatLimitations,
  type AdminStats, type PaymentRecord, type Notification, type InsertNotification,
  type Lead, type InsertLead, type FloBrainDocument, type InsertFloBrainDocument,
  floSportContexts, athleteProfiles,
  type FloSportContext, type InsertFloSportContext,
  type AthleteProfile, type InsertAthleteProfile,
  courses, courseModules, lessons, lessonProgress, courseCertificates,
  type Course, type CourseModule, type Lesson,
  type LessonProgress, type CourseCertificate
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, asc, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getLatestAssessment(userId: number): Promise<Assessment | undefined>;
  getUserAssessments(userId: number): Promise<Assessment[]>;

  // Chat operations
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: number): Promise<ChatSession | undefined>;
  getUserChatSessions(userId: number): Promise<ChatSession[]>;
  updateChatSession(id: number, messages: any[]): Promise<ChatSession>;

  // Progress operations
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  getUserProgress(userId: number, days?: number): Promise<UserProgress[]>;
  updateUserProgress(id: number, updates: Partial<Pick<UserProgress, "overallScore" | "redHeadInstances" | "blueHeadInstances" | "techniquesUsed" | "emergencyRelief" | "practiceMinutes" | "chatMessages" | "engagementScore">>): Promise<UserProgress>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUserId(userId: number): Promise<Notification[]>;
  updateNotification(id: number, updates: Partial<Pick<Notification, "isRead" | "title" | "message">>): Promise<Notification>;

  // Technique operations
  getAllTechniques(): Promise<Technique[]>;
  getTechniquesByCategory(category: string): Promise<Technique[]>;
  createTechnique(technique: InsertTechnique): Promise<Technique>;

  // Scenario operations
  getAllScenarios(): Promise<Scenario[]>;
  getScenariosByPressureLevel(level: string): Promise<Scenario[]>;
  createScenario(scenario: InsertScenario): Promise<Scenario>;

  // Pre-shot routine operations
  createPreShotRoutine(routine: InsertPreShotRoutine): Promise<PreShotRoutine>;
  getUserPreShotRoutines(userId: number): Promise<PreShotRoutine[]>;
  getActivePreShotRoutine(userId: number): Promise<PreShotRoutine | undefined>;
  updatePreShotRoutine(id: number, routine: Partial<PreShotRoutine>): Promise<PreShotRoutine>;

  // Mental Skills X-Check operations
  createMentalSkillsXCheck(xcheck: InsertMentalSkillsXCheck): Promise<MentalSkillsXCheck>;
  getUserMentalSkillsXChecks(userId: number): Promise<MentalSkillsXCheck[]>;
  getLatestMentalSkillsXCheck(userId: number): Promise<MentalSkillsXCheck | undefined>;

  // Control Circle operations
  createControlCircle(circle: InsertControlCircle): Promise<ControlCircle>;
  getUserControlCircles(userId: number): Promise<ControlCircle[]>;
  getLatestControlCircle(userId: number): Promise<ControlCircle | undefined>;

  // Daily Mood operations
  createDailyMood(mood: InsertDailyMood): Promise<DailyMood>;
  getDailyMood(userId: number, date: string): Promise<DailyMood | undefined>;
  updateDailyMood(id: number, updates: Partial<DailyMood>): Promise<DailyMood>;
  // By-id lookups exist so routes that take a row id can prove ownership
  // before mutating. Without them an :id route is an IDOR (audit D3 table).
  getDailyMoodById(id: number): Promise<DailyMood | undefined>;
  getUserMoods(userId: number, days?: number): Promise<DailyMood[]>;

  // AI Recommendation Engine operations
  createUserCoachingProfile(profile: InsertUserCoachingProfile): Promise<UserCoachingProfile>;
  getUserCoachingProfile(userId: number): Promise<UserCoachingProfile | undefined>;
  updateUserCoachingProfile(userId: number, updates: Partial<UserCoachingProfile>): Promise<UserCoachingProfile>;
  
  createAiRecommendation(recommendation: InsertAiRecommendation): Promise<AiRecommendation>;
  getUserRecommendations(userId: number, isActive?: boolean): Promise<AiRecommendation[]>;
  updateRecommendationFeedback(id: number, feedback: number, comments?: string): Promise<AiRecommendation>;
  markRecommendationApplied(id: number, effectivenessMeasure?: number): Promise<AiRecommendation>;
  getAiRecommendationById(id: number): Promise<AiRecommendation | undefined>;
  
  createCoachingInsight(insight: InsertCoachingInsight): Promise<CoachingInsight>;
  getUserInsights(userId: number, isAcknowledged?: boolean): Promise<CoachingInsight[]>;
  acknowledgeInsight(id: number): Promise<CoachingInsight>;
  getCoachingInsightById(id: number): Promise<CoachingInsight | undefined>;
  
  createEngagementMetric(metric: InsertUserEngagementMetric): Promise<UserEngagementMetric>;
  getUserEngagementMetrics(userId: number, days?: number): Promise<UserEngagementMetric[]>;
  updateEngagementMetric(userId: number, date: string, updates: Partial<UserEngagementMetric>): Promise<UserEngagementMetric>;
  
  // Goal tracking operations
  createUserGoal(goal: InsertUserGoal): Promise<UserGoal>;
  getUserGoals(userId: number): Promise<UserGoal[]>;
  updateUserGoal(id: number, updates: Partial<UserGoal>): Promise<UserGoal>;
  toggleGoalCompletion(id: number, isCompleted: boolean): Promise<UserGoal>;
  deleteUserGoal(id: number): Promise<void>;

  // FLO Chat Limitation operations
  getUserChatLimitations(userId: number): Promise<ChatLimitations>;
  incrementUserChatCount(userId: number): Promise<void>;
  createFloSubscription(subscription: InsertFloSubscription): Promise<FloSubscription>;
  getUserFloSubscription(userId: number): Promise<FloSubscription | undefined>;
  checkFloAccessRenewal(userId: number): Promise<boolean>;

  // Admin operations
  getAdminStats(): Promise<AdminStats>;
  getAllUsers(filter?: string, search?: string): Promise<User[]>;
  getPaymentHistory(filter?: string): Promise<PaymentRecord[]>;

  // Lead capture operations
  captureLead(lead: InsertLead): Promise<Lead>;
  getLeadByEmail(email: string): Promise<Lead | undefined>;
  getAllLeads(): Promise<Lead[]>;

  // FLO Brain document operations
  getFloBrainDocuments(activeOnly?: boolean): Promise<FloBrainDocument[]>;
  createFloBrainDocument(doc: InsertFloBrainDocument): Promise<FloBrainDocument>;
  updateFloBrainDocument(id: number, updates: Partial<FloBrainDocument>): Promise<FloBrainDocument>;

  // Sport context operations
  getFloSportContexts(activeOnly?: boolean): Promise<FloSportContext[]>;
  getFloSportContextBySlug(slug: string): Promise<FloSportContext | undefined>;
  createFloSportContext(ctx: InsertFloSportContext): Promise<FloSportContext>;
  updateFloSportContext(id: number, updates: Partial<FloSportContext>): Promise<FloSportContext>;

  // Athlete profile operations
  getAthleteProfile(userId: number): Promise<AthleteProfile | undefined>;
  upsertAthleteProfile(userId: number, updates: Partial<InsertAthleteProfile>): Promise<AthleteProfile>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private assessments: Map<number, Assessment>;
  private chatSessions: Map<number, ChatSession>;
  private userProgress: Map<number, UserProgress>;
  private techniques: Map<number, Technique>;
  private scenarios: Map<number, Scenario>;
  private preShotRoutines: Map<number, PreShotRoutine>;
  private mentalSkillsXChecks: Map<number, MentalSkillsXCheck>;
  private controlCircles: Map<number, ControlCircle>;
  private userCoachingProfiles: Map<number, UserCoachingProfile>;
  private aiRecommendations: Map<number, AiRecommendation>;
  private coachingInsights: Map<number, CoachingInsight>;
  private userEngagementMetrics: Map<number, UserEngagementMetric>;
  private dailyMoods: Map<number, DailyMood>;
  private userGoals: Map<number, UserGoal>;
  private notifications: Map<number, Notification>;
  private currentId: number;

  private initialized = false;

  constructor() {
    this.users = new Map();
    this.assessments = new Map();
    this.chatSessions = new Map();
    this.userProgress = new Map();
    this.techniques = new Map();
    this.scenarios = new Map();
    this.preShotRoutines = new Map();
    this.mentalSkillsXChecks = new Map();
    this.controlCircles = new Map();
    this.userCoachingProfiles = new Map();
    this.aiRecommendations = new Map();
    this.coachingInsights = new Map();
    this.userEngagementMetrics = new Map();
    this.dailyMoods = new Map();
    this.userGoals = new Map();
    this.notifications = new Map();
    this.currentId = 1;
    this.seedData().catch(console.error);
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.seedData();
    }
  }

  private async seedData() {
    if (this.initialized) return;
    
    try {
      // Seed admin user
      const { hashPassword } = await import('./auth');
      const adminPassword = await hashPassword('mindsetskills101');
      
      const adminUser: User = {
        id: 1,
        username: 'mark',
        email: 'mark@cero-international.com',
        password: adminPassword,
        dateOfBirth: new Date('1980-01-01'),
        dexterity: 'right',
        gender: 'male',
        golfHandicap: 5,
        sportExperience: 'expert',
        goals: 'Help athletes achieve peak mental performance through Red2Blue methodology',
        bio: 'System Administrator and Sports Mental Performance Expert',
        aiGeneratedProfile: null,
        profileImageUrl: null,
        isSubscribed: true,
        subscriptionTier: 'ultimate',
        role: 'admin',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.users.set(1, adminUser);
      
      // Add test users for coach dashboard demonstration
      const testUser1Password = await hashPassword('password123');
      const testUser1: User = {
        id: 2,
        username: 'test1',
        email: 'test1@example.com',
        password: testUser1Password,
        dateOfBirth: new Date('1990-05-15'),
        dexterity: 'right',
        gender: 'male',
        golfHandicap: 12,
        sportExperience: 'intermediate',
        goals: 'Improve mental toughness and reduce competition anxiety',
        bio: 'Aspiring athlete working on mental game',
        aiGeneratedProfile: null,
        profileImageUrl: null,
        isSubscribed: true,
        subscriptionTier: 'premium',
        role: 'student',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const floPassword = await hashPassword('password123');
      const floUser: User = {
        id: 3,
        username: 'flo',
        email: 'flo@example.com',
        password: floPassword,
        dateOfBirth: new Date('1985-03-20'),
        dexterity: 'left',
        gender: 'male',
        golfHandicap: 8,
        sportExperience: 'advanced',
        goals: 'Achieve elite performance level and improve competitive performance',
        bio: 'Advanced athlete focusing on competitive mental performance',
        aiGeneratedProfile: null,
        profileImageUrl: null,
        isSubscribed: true,
        subscriptionTier: 'ultimate',
        role: 'student',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.users.set(2, testUser1);
      this.users.set(3, floUser);
      this.currentId = 4;

    // Seed default techniques
    const defaultTechniques: InsertTechnique[] = [
      {
        name: "Box Breathing",
        category: "breathing",
        description: "4-4-4-4 breathing pattern to instantly calm your nervous system",
        instructions: "Breathe in for 4 counts, hold for 4, breathe out for 4, hold for 4. Repeat 3-5 times.",
        duration: 60,
        difficulty: "beginner"
      },
      {
        name: "3-2-1 Focus Reset",
        category: "focus",
        description: "Quick technique to regain concentration after distractions",
        instructions: "Notice 3 things you can see, 2 things you can hear, 1 thing you can feel. Then refocus on your target.",
        duration: 30,
        difficulty: "beginner"
      },
      {
        name: "Pressure Valve",
        category: "pressure",
        description: "Release tension and embrace the challenge in high-stakes moments",
        instructions: "Take a deep breath, roll your shoulders, and say 'I embrace this challenge' before your shot.",
        duration: 15,
        difficulty: "intermediate"
      },
      {
        name: "Performance Anchor",
        category: "anchor",
        description: "Create a physical trigger to access your best mental state",
        instructions: "Choose a physical gesture (tap glove, touch ball). Practice it during good shots to create a confidence anchor.",
        duration: 0,
        difficulty: "advanced"
      }
    ];

    defaultTechniques.forEach(technique => {
      const id = this.currentId++;
      this.techniques.set(id, { ...technique, id, duration: technique.duration || null });
    });

    // Seed default scenarios
    const defaultScenarios: InsertScenario[] = [
      {
        title: "Championship Final Moment",
        description: "You're leading by a small margin in the final moments. Your heart is racing and you're thinking about winning.",
        pressureLevel: "high",
        category: "tournament",
        redHeadTriggers: ["thinking about outcome", "heart racing", "fear of losing lead"],
        blueHeadTechniques: ["box breathing", "process focus", "one play at a time"]
      },
      {
        title: "Recovery After Mistake",
        description: "You just made a critical error. Anger and frustration are building as you prepare for the next play.",
        pressureLevel: "medium",
        category: "recovery",
        redHeadTriggers: ["anger", "frustration", "dwelling on mistake"],
        blueHeadTechniques: ["pressure valve", "reset routine", "forward focus"]
      },
      {
        title: "Critical Performance Moment",
        description: "You need to execute perfectly in this crucial moment. The outcome will determine your advancement.",
        pressureLevel: "high",
        category: "execution",
        redHeadTriggers: ["outcome pressure", "career implications", "technical overthinking"],
        blueHeadTechniques: ["3-2-1 reset", "routine trust", "performance anchor"]
      }
    ];

    defaultScenarios.forEach(scenario => {
      const id = this.currentId++;
      this.scenarios.set(id, { 
        ...scenario, 
        id,
        redHeadTriggers: scenario.redHeadTriggers || null,
        blueHeadTechniques: scenario.blueHeadTechniques || null
      });
    });

    // Seed default pre-performance routines
    const defaultRoutine: InsertPreShotRoutine = {
      userId: 1, // Demo user
      name: "Red2Blue Performance Routine",
      steps: [
        { name: "Ritual Physical Action", duration: 10, description: "Deep breath (4 in, 6 out) + centering movement for balance" },
        { name: "Visualize the Performance", duration: 6, description: "Picture execution, timing, technique with keyword 'Smooth'" },
        { name: "Align and Commit", duration: 4, description: "Position yourself, align to target, commit fully" },
        { name: "Practice Motion", duration: 3, description: "One purposeful rehearsal with intended feel and tempo" },
        { name: "Execute", duration: 5, description: "Step up, settle, execute with complete trust" }
      ],
      totalDuration: 28,
      isActive: true
    };

    const routineId = this.currentId++;
    this.preShotRoutines.set(routineId, { 
      ...defaultRoutine, 
      id: routineId, 
      isActive: defaultRoutine.isActive || false,
      createdAt: new Date() 
    });

    // Add sample assessments for test users
    const testAssessment1: Assessment = {
      id: this.currentId++,
      userId: 2, // test1 user
      intensityScore: 65,
      decisionMakingScore: 72,
      diversionsScore: 58,
      executionScore: 68,
      totalScore: 66,
      responses: {
        intensity: ["3", "4", "3", "3", "4"],
        decisionMaking: ["4", "3", "4", "4", "3"],
        diversions: ["2", "3", "3", "3", "3"],
        execution: ["3", "4", "3", "4", "3"]
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    };

    const testAssessment2: Assessment = {
      id: this.currentId++,
      userId: 3, // theflo user
      intensityScore: 82,
      decisionMakingScore: 78,
      diversionsScore: 85,
      executionScore: 80,
      totalScore: 81,
      responses: {
        intensity: ["4", "4", "4", "5", "4"],
        decisionMaking: ["4", "4", "3", "4", "4"],
        diversions: ["4", "5", "4", "4", "4"],
        execution: ["4", "4", "4", "4", "4"]
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    };

    this.assessments.set(testAssessment1.id, testAssessment1);
    this.assessments.set(testAssessment2.id, testAssessment2);
    
    this.initialized = true;
    console.log('Storage initialized with admin user:', this.users.get(1)?.email);
    } catch (error) {
      console.error('Failed to seed data:', error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error('User not found');
    }
    const updatedUser = { ...existingUser, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id, 
      email: insertUser.email || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async createAssessment(insertAssessment: InsertAssessment): Promise<Assessment> {
    const id = this.currentId++;
    const assessment: Assessment = {
      ...insertAssessment,
      id,
      createdAt: new Date()
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  async getLatestAssessment(userId: number): Promise<Assessment | undefined> {
    const userAssessments = Array.from(this.assessments.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    return userAssessments[0];
  }

  async getUserAssessments(userId: number): Promise<Assessment[]> {
    return Array.from(this.assessments.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = this.currentId++;
    const session: ChatSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async getUserChatSessions(userId: number): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
  }

  async updateChatSession(id: number, messages: any[]): Promise<ChatSession> {
    const session = this.chatSessions.get(id);
    if (!session) {
      throw new Error("Chat session not found");
    }
    const updated = { ...session, messages, updatedAt: new Date() };
    this.chatSessions.set(id, updated);
    return updated;
  }

  async createUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const id = this.currentId++;
    const progress: UserProgress = {
      id,
      userId: insertProgress.userId,
      date: insertProgress.date as any,
      overallScore: insertProgress.overallScore ?? 0,
      redHeadInstances: insertProgress.redHeadInstances ?? 0,
      blueHeadInstances: insertProgress.blueHeadInstances ?? 0,
      techniquesUsed: insertProgress.techniquesUsed ?? null,
      emergencyRelief: insertProgress.emergencyRelief ?? 0,
      practiceMinutes: insertProgress.practiceMinutes ?? 0,
      chatMessages: insertProgress.chatMessages ?? 0,
      engagementScore: insertProgress.engagementScore ?? 0,
    };
    this.userProgress.set(id, progress);
    return progress;
  }

  async getUserProgress(userId: number, days: number = 7): Promise<UserProgress[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Array.from(this.userProgress.values())
      .filter(p => p.userId === userId && new Date(p.date as any) >= cutoffDate)
      .sort((a, b) => new Date(a.date as any).getTime() - new Date(b.date as any).getTime());
  }

  async updateUserProgress(id: number, updates: Partial<Pick<UserProgress, "overallScore" | "redHeadInstances" | "blueHeadInstances" | "techniquesUsed" | "emergencyRelief" | "practiceMinutes" | "chatMessages" | "engagementScore">>): Promise<UserProgress> {
    const progress = this.userProgress.get(id);
    if (!progress) throw new Error("User progress not found");
    const updated = { ...progress, ...updates };
    this.userProgress.set(id, updated);
    return updated;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.currentId++;
    const created: Notification = {
      id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead ?? false,
      scheduledDate: notification.scheduledDate ?? null,
      createdAt: new Date(),
    };
    this.notifications.set(id, created);
    return created;
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateNotification(id: number, updates: Partial<Pick<Notification, "isRead" | "title" | "message">>): Promise<Notification> {
    const n = this.notifications.get(id);
    if (!n) throw new Error("Notification not found");
    const updated = { ...n, ...updates };
    this.notifications.set(id, updated);
    return updated;
  }

  async getAllTechniques(): Promise<Technique[]> {
    return Array.from(this.techniques.values());
  }

  async getTechniquesByCategory(category: string): Promise<Technique[]> {
    return Array.from(this.techniques.values()).filter(t => t.category === category);
  }

  async createTechnique(insertTechnique: InsertTechnique): Promise<Technique> {
    const id = this.currentId++;
    const technique: Technique = { 
      ...insertTechnique, 
      id,
      duration: insertTechnique.duration || null
    };
    this.techniques.set(id, technique);
    return technique;
  }

  async getAllScenarios(): Promise<Scenario[]> {
    return Array.from(this.scenarios.values());
  }

  async getScenariosByPressureLevel(level: string): Promise<Scenario[]> {
    return Array.from(this.scenarios.values()).filter(s => s.pressureLevel === level);
  }

  async createScenario(insertScenario: InsertScenario): Promise<Scenario> {
    const id = this.currentId++;
    const scenario: Scenario = { 
      ...insertScenario, 
      id,
      redHeadTriggers: insertScenario.redHeadTriggers || null,
      blueHeadTechniques: insertScenario.blueHeadTechniques || null
    };
    this.scenarios.set(id, scenario);
    return scenario;
  }

  // Pre-shot routine operations
  async createPreShotRoutine(insertRoutine: InsertPreShotRoutine): Promise<PreShotRoutine> {
    const id = this.currentId++;
    const routine: PreShotRoutine = { 
      ...insertRoutine, 
      id,
      isActive: insertRoutine.isActive || false,
      createdAt: new Date()
    };
    this.preShotRoutines.set(id, routine);
    return routine;
  }

  async getUserPreShotRoutines(userId: number): Promise<PreShotRoutine[]> {
    return Array.from(this.preShotRoutines.values()).filter(routine => routine.userId === userId);
  }

  async getActivePreShotRoutine(userId: number): Promise<PreShotRoutine | undefined> {
    return Array.from(this.preShotRoutines.values()).find(routine => 
      routine.userId === userId && routine.isActive
    );
  }

  async getPreShotRoutineById(id: number): Promise<PreShotRoutine | undefined> {
    return this.preShotRoutines.get(id);
  }

  async updatePreShotRoutine(id: number, updates: Partial<PreShotRoutine>): Promise<PreShotRoutine> {
    const existing = this.preShotRoutines.get(id);
    if (!existing) throw new Error("Pre-shot routine not found");
    
    const updated: PreShotRoutine = { ...existing, ...updates };
    this.preShotRoutines.set(id, updated);
    return updated;
  }

  async deletePreShotRoutine(id: number): Promise<void> {
    if (!this.preShotRoutines.has(id)) {
      throw new Error("Pre-shot routine not found");
    }
    this.preShotRoutines.delete(id);
  }

  // Mental Skills X-Check operations
  async createMentalSkillsXCheck(insertXCheck: InsertMentalSkillsXCheck): Promise<MentalSkillsXCheck> {
    const id = this.currentId++;
    const xcheck: MentalSkillsXCheck = { 
      ...insertXCheck, 
      id,
      whatDidWell: insertXCheck.whatDidWell || null,
      whatCouldDoBetter: insertXCheck.whatCouldDoBetter || null,
      actionPlan: insertXCheck.actionPlan || null,
      context: insertXCheck.context || null,
      createdAt: new Date()
    };
    this.mentalSkillsXChecks.set(id, xcheck);
    return xcheck;
  }

  async getUserMentalSkillsXChecks(userId: number): Promise<MentalSkillsXCheck[]> {
    return Array.from(this.mentalSkillsXChecks.values())
      .filter(xcheck => xcheck.userId === userId)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }

  async getLatestMentalSkillsXCheck(userId: number): Promise<MentalSkillsXCheck | undefined> {
    const checks = await this.getUserMentalSkillsXChecks(userId);
    return checks[0];
  }

  // Control Circle operations
  async createControlCircle(insertCircle: InsertControlCircle): Promise<ControlCircle> {
    const id = this.currentId++;
    const circle: ControlCircle = { 
      ...insertCircle, 
      id,
      context: insertCircle.context || null,
      reflections: insertCircle.reflections || null,
      cantControl: insertCircle.cantControl || null,
      canInfluence: insertCircle.canInfluence || null,
      canControl: insertCircle.canControl || null,
      createdAt: new Date()
    };
    this.controlCircles.set(id, circle);
    return circle;
  }

  async getUserControlCircles(userId: number): Promise<ControlCircle[]> {
    return Array.from(this.controlCircles.values())
      .filter(circle => circle.userId === userId)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }

  async getLatestControlCircle(userId: number): Promise<ControlCircle | undefined> {
    const circles = await this.getUserControlCircles(userId);
    return circles[0];
  }

  // Recognition Assessment operations
  private recognitionAssessments = new Map<number, RecognitionAssessment>();

  async createRecognitionAssessment(insertAssessment: InsertRecognitionAssessment): Promise<RecognitionAssessment> {
    const id = this.currentId++;
    const assessment: RecognitionAssessment = {
      ...insertAssessment,
      id,
      createdAt: new Date()
    };
    this.recognitionAssessments.set(id, assessment);
    return assessment;
  }

  async getUserRecognitionAssessments(userId: number): Promise<RecognitionAssessment[]> {
    return Array.from(this.recognitionAssessments.values())
      .filter(assessment => assessment.userId === userId)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }

  // What If Planning operations
  private whatIfPlanning = new Map<number, WhatIfPlanning>();

  async createWhatIfPlan(insertPlan: InsertWhatIfPlanning): Promise<WhatIfPlanning> {
    const id = this.currentId++;
    const plan: WhatIfPlanning = {
      ...insertPlan,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.whatIfPlanning.set(id, plan);
    return plan;
  }

  async getUserWhatIfPlans(userId: number): Promise<WhatIfPlanning[]> {
    return Array.from(this.whatIfPlanning.values())
      .filter(plan => plan.userId === userId)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }

  async updateWhatIfPlan(id: number, updates: Partial<WhatIfPlanning>): Promise<WhatIfPlanning> {
    const plan = this.whatIfPlanning.get(id);
    if (!plan) throw new Error('What If plan not found');
    
    const updatedPlan: WhatIfPlanning = {
      ...plan,
      ...updates,
      updatedAt: new Date()
    };
    this.whatIfPlanning.set(id, updatedPlan);
    return updatedPlan;
  }

  // Screw Up Cascade operations
  private screwUpCascades = new Map<number, ScrewUpCascade>();

  async createScrewUpCascade(insertCascade: InsertScrewUpCascade): Promise<ScrewUpCascade> {
    const id = this.currentId++;
    const cascade: ScrewUpCascade = {
      ...insertCascade,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.screwUpCascades.set(id, cascade);
    return cascade;
  }

  async getUserScrewUpCascades(userId: number): Promise<ScrewUpCascade[]> {
    return Array.from(this.screwUpCascades.values())
      .filter(cascade => cascade.userId === userId)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }

  async updateScrewUpCascade(id: number, updates: Partial<ScrewUpCascade>): Promise<ScrewUpCascade> {
    const cascade = this.screwUpCascades.get(id);
    if (!cascade) throw new Error('Screw Up Cascade not found');
    
    const updatedCascade: ScrewUpCascade = {
      ...cascade,
      ...updates,
      updatedAt: new Date()
    };
    this.screwUpCascades.set(id, updatedCascade);
    return updatedCascade;
  }

  // Priority Planning operations
  private priorityPlanning = new Map<number, PriorityPlanning>();

  async createPriorityPlan(insertPlan: InsertPriorityPlanning): Promise<PriorityPlanning> {
    const id = this.currentId++;
    const plan: PriorityPlanning = {
      ...insertPlan,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.priorityPlanning.set(id, plan);
    return plan;
  }

  async getUserPriorityPlans(userId: number): Promise<PriorityPlanning[]> {
    return Array.from(this.priorityPlanning.values())
      .filter(plan => plan.userId === userId)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }

  async updatePriorityPlan(id: number, updates: Partial<PriorityPlanning>): Promise<PriorityPlanning> {
    const plan = this.priorityPlanning.get(id);
    if (!plan) throw new Error('Priority plan not found');
    
    const updatedPlan: PriorityPlanning = {
      ...plan,
      ...updates,
      updatedAt: new Date()
    };
    this.priorityPlanning.set(id, updatedPlan);
    return updatedPlan;
  }

  // Certification Progress operations
  private certificationProgress = new Map<number, CertificationProgress>();

  async getCertificationProgress(userId: number): Promise<CertificationProgress | undefined> {
    return Array.from(this.certificationProgress.values()).find(cp => cp.userId === userId);
  }

  async updateCertificationProgress(userId: number, updates: Partial<CertificationProgress>): Promise<CertificationProgress> {
    let progress = Array.from(this.certificationProgress.values()).find(cp => cp.userId === userId);
    
    if (!progress) {
      const id = this.currentId++;
      progress = {
        id,
        userId,
        toolsCompleted: updates.toolsCompleted || [],
        assessmentsCompleted: updates.assessmentsCompleted || [],
        practiceScenarios: updates.practiceScenarios || [],
        underPressureTesting: updates.underPressureTesting || [],
        coachObservations: updates.coachObservations || null,
        selfReflections: updates.selfReflections || null,
        certificationLevel: updates.certificationLevel || 'beginner',
        businessObservationChecklist: updates.businessObservationChecklist || null,
        lastProgressUpdate: new Date(),
        createdAt: new Date()
      };
      this.certificationProgress.set(id, progress);
    } else {
      const updatedProgress: CertificationProgress = {
        ...progress,
        ...updates,
        lastProgressUpdate: new Date()
      };
      this.certificationProgress.set(progress.id, updatedProgress);
      progress = updatedProgress;
    }
    
    return progress;
  }

  // Daily Mood operations
  async createDailyMood(insertMood: InsertDailyMood): Promise<DailyMood> {
    const id = this.currentId++;
    const mood: DailyMood = { 
      ...insertMood, 
      id,
      createdAt: new Date()
    };
    this.dailyMoods.set(id, mood);
    return mood;
  }

  async getDailyMood(userId: number, date: string): Promise<DailyMood | undefined> {
    return Array.from(this.dailyMoods.values())
      .find(mood => mood.userId === userId && mood.date === date);
  }

  async getDailyMoodById(id: number): Promise<DailyMood | undefined> {
    return this.dailyMoods.get(id);
  }

  async getAiRecommendationById(id: number): Promise<AiRecommendation | undefined> {
    return this.aiRecommendations.get(id);
  }

  async getCoachingInsightById(id: number): Promise<CoachingInsight | undefined> {
    return this.coachingInsights.get(id);
  }

  async updateDailyMood(id: number, updates: Partial<DailyMood>): Promise<DailyMood> {
    const existing = this.dailyMoods.get(id);
    if (!existing) {
      throw new Error('Daily mood not found');
    }
    const updated: DailyMood = { ...existing, ...updates };
    this.dailyMoods.set(id, updated);
    return updated;
  }

  async getUserMoods(userId: number, days: number = 30): Promise<DailyMood[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Array.from(this.dailyMoods.values())
      .filter(mood => mood.userId === userId && new Date(mood.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // AI Recommendation Engine implementation
  async createUserCoachingProfile(insertProfile: InsertUserCoachingProfile): Promise<UserCoachingProfile> {
    await this.ensureInitialized();
    const id = this.currentId++;
    const profile: UserCoachingProfile = { 
      id,
      ...insertProfile,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userCoachingProfiles.set(id, profile);
    return profile;
  }

  async getUserCoachingProfile(userId: number): Promise<UserCoachingProfile | undefined> {
    await this.ensureInitialized();
    return Array.from(this.userCoachingProfiles.values())
      .find(profile => profile.userId === userId);
  }

  async updateUserCoachingProfile(userId: number, updates: Partial<UserCoachingProfile>): Promise<UserCoachingProfile> {
    await this.ensureInitialized();
    const existing = await this.getUserCoachingProfile(userId);
    if (!existing) {
      throw new Error('User coaching profile not found');
    }
    const updated: UserCoachingProfile = { 
      ...existing, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.userCoachingProfiles.set(existing.id, updated);
    return updated;
  }

  async createAiRecommendation(insertRecommendation: InsertAiRecommendation): Promise<AiRecommendation> {
    await this.ensureInitialized();
    const id = this.currentId++;
    const recommendation: AiRecommendation = { 
      id,
      ...insertRecommendation,
      createdAt: new Date()
    };
    this.aiRecommendations.set(id, recommendation);
    return recommendation;
  }

  async getUserRecommendations(userId: number, isActive?: boolean): Promise<AiRecommendation[]> {
    await this.ensureInitialized();
    return Array.from(this.aiRecommendations.values())
      .filter(rec => {
        if (rec.userId !== userId) return false;
        if (isActive !== undefined && rec.isActive !== isActive) return false;
        return true;
      })
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }

  async updateRecommendationFeedback(id: number, feedback: number, comments?: string): Promise<AiRecommendation> {
    await this.ensureInitialized();
    const existing = this.aiRecommendations.get(id);
    if (!existing) {
      throw new Error('Recommendation not found');
    }
    const updated: AiRecommendation = { 
      ...existing, 
      userFeedback: feedback,
      feedbackComments: comments || existing.feedbackComments
    };
    this.aiRecommendations.set(id, updated);
    return updated;
  }

  async markRecommendationApplied(id: number, effectivenessMeasure?: number): Promise<AiRecommendation> {
    await this.ensureInitialized();
    const existing = this.aiRecommendations.get(id);
    if (!existing) {
      throw new Error('Recommendation not found');
    }
    const updated: AiRecommendation = { 
      ...existing, 
      wasApplied: true,
      effectivenessMeasure: effectivenessMeasure || existing.effectivenessMeasure
    };
    this.aiRecommendations.set(id, updated);
    return updated;
  }

  async createCoachingInsight(insertInsight: InsertCoachingInsight): Promise<CoachingInsight> {
    await this.ensureInitialized();
    const id = this.currentId++;
    const insight: CoachingInsight = { 
      id,
      ...insertInsight,
      createdAt: new Date()
    };
    this.coachingInsights.set(id, insight);
    return insight;
  }

  async getUserInsights(userId: number, isAcknowledged?: boolean): Promise<CoachingInsight[]> {
    await this.ensureInitialized();
    return Array.from(this.coachingInsights.values())
      .filter(insight => {
        if (insight.userId !== userId) return false;
        if (isAcknowledged !== undefined && insight.isAcknowledged !== isAcknowledged) return false;
        return true;
      })
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }

  async acknowledgeInsight(id: number): Promise<CoachingInsight> {
    await this.ensureInitialized();
    const existing = this.coachingInsights.get(id);
    if (!existing) {
      throw new Error('Insight not found');
    }
    const updated: CoachingInsight = { 
      ...existing, 
      isAcknowledged: true
    };
    this.coachingInsights.set(id, updated);
    return updated;
  }

  async createEngagementMetric(insertMetric: InsertUserEngagementMetric): Promise<UserEngagementMetric> {
    await this.ensureInitialized();
    const id = this.currentId++;
    const metric: UserEngagementMetric = { 
      id,
      ...insertMetric,
      createdAt: new Date()
    };
    this.userEngagementMetrics.set(id, metric);
    return metric;
  }

  async getUserEngagementMetrics(userId: number, days: number = 30): Promise<UserEngagementMetric[]> {
    await this.ensureInitialized();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Array.from(this.userEngagementMetrics.values())
      .filter(metric => {
        if (metric.userId !== userId) return false;
        const metricDate = new Date(metric.date);
        return metricDate >= cutoffDate;
      })
      .sort((a, b) => {
        const aDate = new Date(a.date).getTime();
        const bDate = new Date(b.date).getTime();
        return bDate - aDate;
      });
  }

  async updateEngagementMetric(userId: number, date: string, updates: Partial<UserEngagementMetric>): Promise<UserEngagementMetric> {
    await this.ensureInitialized();
    const existing = Array.from(this.userEngagementMetrics.values())
      .find(metric => metric.userId === userId && metric.date === date);
    
    if (existing) {
      const updated: UserEngagementMetric = { ...existing, ...updates };
      this.userEngagementMetrics.set(existing.id, updated);
      return updated;
    } else {
      return await this.createEngagementMetric({
        userId,
        date,
        ...updates
      } as InsertUserEngagementMetric);
    }
  }

  // Goal tracking operations
  async createUserGoal(insertGoal: InsertUserGoal): Promise<UserGoal> {
    await this.ensureInitialized();
    const id = this.currentId++;
    const goal: UserGoal = {
      id,
      ...insertGoal,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userGoals.set(id, goal);
    return goal;
  }

  async getUserGoals(userId: number): Promise<UserGoal[]> {
    await this.ensureInitialized();
    return Array.from(this.userGoals.values())
      .filter(goal => goal.userId === userId)
      .sort((a, b) => {
        // Sort by completion status (incomplete first), then by priority (high to low), then by created date (newest first)
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }
        if (a.priority !== b.priority) {
          return (b.priority || 0) - (a.priority || 0);
        }
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }

  async updateUserGoal(id: number, updates: Partial<UserGoal>): Promise<UserGoal> {
    await this.ensureInitialized();
    const existing = this.userGoals.get(id);
    if (!existing) {
      throw new Error('Goal not found');
    }
    
    const updated: UserGoal = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.userGoals.set(id, updated);
    return updated;
  }

  async toggleGoalCompletion(id: number, isCompleted: boolean): Promise<UserGoal> {
    await this.ensureInitialized();
    const existing = this.userGoals.get(id);
    if (!existing) {
      throw new Error('Goal not found');
    }
    
    const updated: UserGoal = {
      ...existing,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      updatedAt: new Date()
    };
    this.userGoals.set(id, updated);
    return updated;
  }

  async deleteUserGoal(id: number): Promise<void> {
    await this.ensureInitialized();
    this.userGoals.delete(id);
  }

  async captureLead(_lead: InsertLead): Promise<Lead> { throw new Error("MemStorage: not implemented"); }
  async getLeadByEmail(_email: string): Promise<Lead | undefined> { return undefined; }
  async getAllLeads(): Promise<Lead[]> { return []; }
  async getFloBrainDocuments(_activeOnly?: boolean): Promise<FloBrainDocument[]> { return []; }
  async createFloBrainDocument(_doc: InsertFloBrainDocument): Promise<FloBrainDocument> { throw new Error("MemStorage: not implemented"); }
  async updateFloBrainDocument(_id: number, _updates: Partial<FloBrainDocument>): Promise<FloBrainDocument> { throw new Error("MemStorage: not implemented"); }
  async getFloSportContexts(_activeOnly?: boolean): Promise<FloSportContext[]> { return []; }
  async getFloSportContextBySlug(_slug: string): Promise<FloSportContext | undefined> { return undefined; }
  async createFloSportContext(_ctx: InsertFloSportContext): Promise<FloSportContext> { throw new Error("MemStorage: not implemented"); }
  async updateFloSportContext(_id: number, _updates: Partial<FloSportContext>): Promise<FloSportContext> { throw new Error("MemStorage: not implemented"); }
  async getAthleteProfile(_userId: number): Promise<AthleteProfile | undefined> { return undefined; }
  async upsertAthleteProfile(_userId: number, _updates: Partial<InsertAthleteProfile>): Promise<AthleteProfile> { throw new Error("MemStorage: not implemented"); }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createAssessment(insertAssessment: InsertAssessment): Promise<Assessment> {
    const [assessment] = await db
      .insert(assessments)
      .values(insertAssessment)
      .returning();
    return assessment;
  }

  async getLatestAssessment(userId: number): Promise<Assessment | undefined> {
    const [assessment] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.userId, userId))
      .orderBy(desc(assessments.createdAt))
      .limit(1);
    return assessment || undefined;
  }

  async getUserAssessments(userId: number): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(eq(assessments.userId, userId))
      .orderBy(desc(assessments.createdAt));
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const [session] = await db
      .insert(chatSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async getUserChatSessions(userId: number): Promise<ChatSession[]> {
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.createdAt));
  }

  async updateChatSession(id: number, messages: any[]): Promise<ChatSession> {
    const [session] = await db
      .update(chatSessions)
      // messageCount and updatedAt were never written, so every row read 0 and
      // kept its creation timestamp — useless for "most recent conversation"
      // ordering and for any usage reporting built on top of it.
      .set({ messages, messageCount: messages.length, updatedAt: new Date() })
      .where(eq(chatSessions.id, id))
      .returning();
    return session;
  }

  async createUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const [progress] = await db
      .insert(userProgress)
      .values({
        ...insertProgress,
        date: typeof insertProgress.date === "string" ? new Date(insertProgress.date) : insertProgress.date,
      })
      .returning();
    return progress;
  }

  async getUserProgress(userId: number, days: number = 7): Promise<UserProgress[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId))
      .orderBy(desc(userProgress.date));
  }

  async updateUserProgress(id: number, updates: Partial<Pick<UserProgress, "overallScore" | "redHeadInstances" | "blueHeadInstances" | "techniquesUsed" | "emergencyRelief" | "practiceMinutes" | "chatMessages" | "engagementScore">>): Promise<UserProgress> {
    const [updated] = await db
      .update(userProgress)
      .set(updates)
      .where(eq(userProgress.id, id))
      .returning();
    if (!updated) throw new Error("User progress not found");
    return updated;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const [n] = await db.select().from(notifications).where(eq(notifications.id, id));
    return n;
  }

  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async updateNotification(id: number, updates: Partial<Pick<Notification, "isRead" | "title" | "message">>): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set(updates)
      .where(eq(notifications.id, id))
      .returning();
    if (!updated) throw new Error("Notification not found");
    return updated;
  }

  async getAllTechniques(): Promise<Technique[]> {
    return await db.select().from(techniques);
  }

  async getTechniquesByCategory(category: string): Promise<Technique[]> {
    return await db
      .select()
      .from(techniques)
      .where(eq(techniques.category, category));
  }

  async createTechnique(insertTechnique: InsertTechnique): Promise<Technique> {
    const [technique] = await db
      .insert(techniques)
      .values(insertTechnique)
      .returning();
    return technique;
  }

  async getAllScenarios(): Promise<Scenario[]> {
    return await db.select().from(scenarios);
  }

  async getScenariosByPressureLevel(level: string): Promise<Scenario[]> {
    return await db
      .select()
      .from(scenarios)
      .where(eq(scenarios.pressureLevel, level));
  }

  async createScenario(insertScenario: InsertScenario): Promise<Scenario> {
    const [scenario] = await db
      .insert(scenarios)
      .values(insertScenario)
      .returning();
    return scenario;
  }

  async createPreShotRoutine(insertRoutine: InsertPreShotRoutine): Promise<PreShotRoutine> {
    const [routine] = await db
      .insert(preShotRoutines)
      .values(insertRoutine)
      .returning();
    return routine;
  }

  async getUserPreShotRoutines(userId: number): Promise<PreShotRoutine[]> {
    return await db
      .select()
      .from(preShotRoutines)
      .where(eq(preShotRoutines.userId, userId))
      .orderBy(desc(preShotRoutines.createdAt));
  }

  async getActivePreShotRoutine(userId: number): Promise<PreShotRoutine | undefined> {
    const [routine] = await db
      .select()
      .from(preShotRoutines)
      .where(eq(preShotRoutines.userId, userId))
      .orderBy(desc(preShotRoutines.createdAt))
      .limit(1);
    return routine || undefined;
  }

  async updatePreShotRoutine(id: number, updates: Partial<PreShotRoutine>): Promise<PreShotRoutine> {
    const [routine] = await db
      .update(preShotRoutines)
      .set(updates)
      .where(eq(preShotRoutines.id, id))
      .returning();
    return routine;
  }

  async createMentalSkillsXCheck(insertXCheck: InsertMentalSkillsXCheck): Promise<MentalSkillsXCheck> {
    const [xcheck] = await db
      .insert(mentalSkillsXChecks)
      .values(insertXCheck)
      .returning();
    return xcheck;
  }

  async getUserMentalSkillsXChecks(userId: number): Promise<MentalSkillsXCheck[]> {
    return await db
      .select()
      .from(mentalSkillsXChecks)
      .where(eq(mentalSkillsXChecks.userId, userId))
      .orderBy(desc(mentalSkillsXChecks.createdAt));
  }

  async getLatestMentalSkillsXCheck(userId: number): Promise<MentalSkillsXCheck | undefined> {
    const [xcheck] = await db
      .select()
      .from(mentalSkillsXChecks)
      .where(eq(mentalSkillsXChecks.userId, userId))
      .orderBy(desc(mentalSkillsXChecks.createdAt))
      .limit(1);
    return xcheck || undefined;
  }

  async createControlCircle(insertCircle: InsertControlCircle): Promise<ControlCircle> {
    const [circle] = await db
      .insert(controlCircles)
      .values(insertCircle)
      .returning();
    return circle;
  }

  async getUserControlCircles(userId: number): Promise<ControlCircle[]> {
    return await db
      .select()
      .from(controlCircles)
      .where(eq(controlCircles.userId, userId))
      .orderBy(desc(controlCircles.createdAt));
  }

  async getLatestControlCircle(userId: number): Promise<ControlCircle | undefined> {
    const [circle] = await db
      .select()
      .from(controlCircles)
      .where(eq(controlCircles.userId, userId))
      .orderBy(desc(controlCircles.createdAt))
      .limit(1);
    return circle || undefined;
  }

  // Daily Mood operations
  async createDailyMood(insertMood: InsertDailyMood): Promise<DailyMood> {
    const [mood] = await db
      .insert(dailyMoods)
      .values(insertMood)
      .returning();
    return mood;
  }

  async getDailyMood(userId: number, date: string): Promise<DailyMood | undefined> {
    const [mood] = await db
      .select()
      .from(dailyMoods)
      .where(eq(dailyMoods.userId, userId) && eq(dailyMoods.date, date))
      .limit(1);
    return mood || undefined;
  }

  async updateDailyMood(id: number, updates: Partial<DailyMood>): Promise<DailyMood> {
    const [mood] = await db
      .update(dailyMoods)
      .set(updates)
      .where(eq(dailyMoods.id, id))
      .returning();
    return mood;
  }

  async getUserMoods(userId: number, days: number = 30): Promise<DailyMood[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db
      .select()
      .from(dailyMoods)
      .where(eq(dailyMoods.userId, userId))
      .orderBy(desc(dailyMoods.date));
  }

  // ── Ownership lookups (audit D3) ──────────────────────────────────
  // Routes keyed on a row id must load the row and compare its userId to the
  // session before mutating it, or the id is a free-form pointer into other
  // people's data.
  async getDailyMoodById(id: number): Promise<DailyMood | undefined> {
    const [mood] = await db.select().from(dailyMoods).where(eq(dailyMoods.id, id)).limit(1);
    return mood || undefined;
  }

  async getAiRecommendationById(id: number): Promise<AiRecommendation | undefined> {
    const [rec] = await db.select().from(aiRecommendations).where(eq(aiRecommendations.id, id)).limit(1);
    return rec || undefined;
  }

  async getCoachingInsightById(id: number): Promise<CoachingInsight | undefined> {
    const [insight] = await db.select().from(coachingInsights).where(eq(coachingInsights.id, id)).limit(1);
    return insight || undefined;
  }

  // Placeholder methods for missing interface requirements
  async createUserCoachingProfile(profile: InsertUserCoachingProfile): Promise<UserCoachingProfile> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  async getUserCoachingProfile(userId: number): Promise<UserCoachingProfile | undefined> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  async updateUserCoachingProfile(userId: number, updates: Partial<UserCoachingProfile>): Promise<UserCoachingProfile> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  async createAiRecommendation(recommendation: InsertAiRecommendation): Promise<AiRecommendation> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  async getUserRecommendations(userId: number, isActive?: boolean): Promise<AiRecommendation[]> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  async updateRecommendationFeedback(id: number, feedback: number, comments?: string): Promise<AiRecommendation> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  async markRecommendationApplied(id: number, effectivenessMeasure?: number): Promise<AiRecommendation> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  async createCoachingInsight(insight: InsertCoachingInsight): Promise<CoachingInsight> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  async getUserInsights(userId: number, isAcknowledged?: boolean): Promise<CoachingInsight[]> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  async acknowledgeInsight(id: number): Promise<CoachingInsight> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  async createEngagementMetric(metric: InsertUserEngagementMetric): Promise<UserEngagementMetric> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  async getUserEngagementMetrics(userId: number, days?: number): Promise<UserEngagementMetric[]> {
    // Return empty array for now - engagement metrics not yet implemented
    // TODO: Implement proper engagement tracking with database tables
    return [];
  }

  async updateEngagementMetric(userId: number, date: string, updates: Partial<UserEngagementMetric>): Promise<UserEngagementMetric> {
    throw new Error('Method not implemented in DatabaseStorage');
  }

  // Goal tracking operations
  async createUserGoal(insertGoal: InsertUserGoal): Promise<UserGoal> {
    const [goal] = await db
      .insert(userGoals)
      .values(insertGoal)
      .returning();
    return goal;
  }

  async getUserGoals(userId: number): Promise<UserGoal[]> {
    const goals = await db
      .select()
      .from(userGoals)
      .where(eq(userGoals.userId, userId))
      .orderBy(desc(userGoals.createdAt));
    return goals;
  }

  async updateUserGoal(id: number, updates: Partial<UserGoal>): Promise<UserGoal> {
    const [goal] = await db
      .update(userGoals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userGoals.id, id))
      .returning();
    if (!goal) {
      throw new Error('Goal not found');
    }
    return goal;
  }

  async toggleGoalCompletion(id: number, isCompleted: boolean): Promise<UserGoal> {
    const [goal] = await db
      .update(userGoals)
      .set({ 
        isCompleted, 
        completedAt: isCompleted ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(userGoals.id, id))
      .returning();
    if (!goal) {
      throw new Error('Goal not found');
    }
    return goal;
  }

  async deleteUserGoal(id: number): Promise<void> {
    await db.delete(userGoals).where(eq(userGoals.id, id));
  }

  // Admin operations
  async getAdminStats(): Promise<AdminStats> {
    // Get user counts by subscription tier (EXCLUDE ADMIN/COACH USERS)
    const allUsers = await db.select().from(users);
    const regularUsers = allUsers.filter(u => u.role !== 'admin' && u.role !== 'coach'); // Only count regular users
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalUsers = regularUsers.length; // Only count regular users, not admins
    const freeUsers = regularUsers.filter(u => !u.isSubscribed || u.subscriptionTier === 'free').length;
    const premiumUsers = regularUsers.filter(u => u.isSubscribed && u.subscriptionTier === 'premium').length;
    const ultimateUsers = regularUsers.filter(u => u.isSubscribed && u.subscriptionTier === 'ultimate').length;
    const activeSubscriptions = premiumUsers + ultimateUsers;
    const newUsersThisMonth = regularUsers.filter(u => new Date(u.createdAt) >= monthStart).length;
    
    // Calculate revenue from REAL paying users only (premium $490, ultimate $2190)
    const monthlyRevenue = (premiumUsers * 490) + (ultimateUsers * 2190);
    const totalRevenue = monthlyRevenue; // Simplified for now
    
    // Calculate churn rate (simplified)
    const churnRate = 5; // Placeholder - would need historical data
    
    return {
      totalUsers,
      activeSubscriptions,
      monthlyRevenue,
      totalRevenue,
      freeUsers,
      premiumUsers,
      ultimateUsers,
      newUsersThisMonth,
      churnRate
    };
  }

  async getAllUsers(filter?: string, search?: string): Promise<User[]> {
    let query = db.select().from(users);
    
    const result = await query;
    
    // Apply filters in JavaScript for now
    let filteredUsers = result;
    
    if (filter && filter !== 'all') {
      switch (filter) {
        case 'free':
          filteredUsers = filteredUsers.filter(u => !u.isSubscribed || u.subscriptionTier === 'free');
          break;
        case 'premium':
          filteredUsers = filteredUsers.filter(u => u.isSubscribed && u.subscriptionTier === 'premium');
          break;
        case 'ultimate':
          filteredUsers = filteredUsers.filter(u => u.isSubscribed && u.subscriptionTier === 'ultimate');
          break;
        case 'admin':
          filteredUsers = filteredUsers.filter(u => u.role === 'admin');
          break;
        case 'coach':
          filteredUsers = filteredUsers.filter(u => u.role === 'coach');
          break;
      }
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        u.email.toLowerCase().includes(searchLower) ||
        u.username.toLowerCase().includes(searchLower) ||
        (u.firstName && u.firstName.toLowerCase().includes(searchLower)) ||
        (u.lastName && u.lastName.toLowerCase().includes(searchLower))
      );
    }
    
    return filteredUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getPaymentHistory(filter?: string): Promise<PaymentRecord[]> {
    // For now, return mock payment data based on users (EXCLUDE ADMIN/COACH USERS)
    // In production, this would connect to Stripe API or payment database
    const allUsers = await db.select().from(users);
    // Only include REAL paying users - exclude admins and coaches who get access via role
    const paidUsers = allUsers.filter(u => 
      u.isSubscribed && 
      u.subscriptionTier !== 'free' && 
      u.role !== 'admin' && 
      u.role !== 'coach'
    );
    
    const payments: PaymentRecord[] = paidUsers.map(user => ({
      id: `pi_${user.id}_${Date.now()}`,
      userId: user.id,
      amount: user.subscriptionTier === 'premium' ? 490 : 2190,
      currency: 'usd',
      status: 'successful',
      description: `${user.subscriptionTier} subscription`,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.subscriptionStartDate?.toISOString() || user.createdAt.toISOString(),
      userEmail: user.email,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
    }));
    
    if (filter && filter !== 'all') {
      return payments.filter(p => p.status === filter);
    }
    
    return payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // FLO Chat Limitation operations
  async getUserChatLimitations(userId: number): Promise<ChatLimitations> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0]) {
      throw new Error("User not found");
    }

    const userData = user[0];
    const chatsUsed = userData.floChatsUsed || 0;
    
    // Check subscription tier and FLO subscription status
    const floSubscription = await this.getUserFloSubscription(userId);
    const now = new Date();

    // Determine subscription status and limits
    let chatLimit = 5; // Default for free users
    let hasAccess = true;
    let subscriptionStatus: ChatLimitations['subscriptionStatus'] = "free";
    let renewalDate: Date | undefined;

    if (userData.subscriptionTier === "premium" || userData.subscriptionTier === "ultimate") {
      // Check if they have an active FLO subscription
      if (floSubscription && floSubscription.isActive && new Date(floSubscription.endDate) > now) {
        chatLimit = -1; // Unlimited
        subscriptionStatus = userData.subscriptionTier === "premium" ? "premium_included" : "ultimate_included";
        renewalDate = floSubscription.endDate;
      } else if (userData.subscriptionStartDate) {
        // Check if they're in their first year (included FLO access)
        const oneYearAfterSubscription = new Date(userData.subscriptionStartDate);
        oneYearAfterSubscription.setFullYear(oneYearAfterSubscription.getFullYear() + 1);
        
        if (now < oneYearAfterSubscription) {
          chatLimit = -1; // Unlimited for first year
          subscriptionStatus = userData.subscriptionTier === "premium" ? "premium_included" : "ultimate_included";
          renewalDate = oneYearAfterSubscription;
        } else {
          // First year has expired, need annual renewal
          chatLimit = 5; // Back to free limit
          subscriptionStatus = "expired";
          hasAccess = chatsUsed < chatLimit;
        }
      }
    }

    const canChat = chatLimit === -1 || chatsUsed < chatLimit;

    return {
      chatLimit,
      chatsUsed,
      hasAccess,
      canChat,
      subscriptionStatus,
      renewalDate
    };
  }

  async incrementUserChatCount(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        floChatsUsed: sql`${users.floChatsUsed} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async createFloSubscription(subscription: InsertFloSubscription): Promise<FloSubscription> {
    const [newSubscription] = await db
      .insert(floSubscriptions)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async getUserFloSubscription(userId: number): Promise<FloSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(floSubscriptions)
      .where(eq(floSubscriptions.userId, userId))
      .orderBy(desc(floSubscriptions.startDate))
      .limit(1);
    return subscription;
  }

  async checkFloAccessRenewal(userId: number): Promise<boolean> {
    const limitations = await this.getUserChatLimitations(userId);
    return limitations.canChat;
  }

  async captureLead(lead: InsertLead): Promise<Lead> {
    const existing = await this.getLeadByEmail(lead.email);
    if (existing) {
      const [updated] = await db
        .update(leads)
        .set({ ...lead, updatedAt: new Date() })
        .where(eq(leads.email, lead.email))
        .returning();
      return updated;
    }
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async getLeadByEmail(email: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.email, email));
    return lead || undefined;
  }

  async getAllLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getFloBrainDocuments(activeOnly?: boolean): Promise<FloBrainDocument[]> {
    if (activeOnly) {
      return db.select().from(floBrainDocuments).where(eq(floBrainDocuments.isActive, true)).orderBy(desc(floBrainDocuments.updatedAt));
    }
    return db.select().from(floBrainDocuments).orderBy(desc(floBrainDocuments.updatedAt));
  }

  async createFloBrainDocument(doc: InsertFloBrainDocument): Promise<FloBrainDocument> {
    const [newDoc] = await db.insert(floBrainDocuments).values(doc).returning();
    return newDoc;
  }

  async updateFloBrainDocument(id: number, updates: Partial<FloBrainDocument>): Promise<FloBrainDocument> {
    const [updated] = await db
      .update(floBrainDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(floBrainDocuments.id, id))
      .returning();
    return updated;
  }

  async getFloSportContexts(activeOnly?: boolean): Promise<FloSportContext[]> {
    if (activeOnly) {
      return db.select().from(floSportContexts).where(eq(floSportContexts.isActive, true)).orderBy(floSportContexts.slug);
    }
    return db.select().from(floSportContexts).orderBy(floSportContexts.slug);
  }

  async getFloSportContextBySlug(slug: string): Promise<FloSportContext | undefined> {
    const [ctx] = await db.select().from(floSportContexts).where(eq(floSportContexts.slug, slug.toLowerCase()));
    return ctx || undefined;
  }

  async createFloSportContext(ctx: InsertFloSportContext): Promise<FloSportContext> {
    const [newCtx] = await db.insert(floSportContexts).values({ ...ctx, slug: ctx.slug.toLowerCase() }).returning();
    return newCtx;
  }

  async updateFloSportContext(id: number, updates: Partial<FloSportContext>): Promise<FloSportContext> {
    const [updated] = await db
      .update(floSportContexts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(floSportContexts.id, id))
      .returning();
    return updated;
  }

  async getAthleteProfile(userId: number): Promise<AthleteProfile | undefined> {
    const [profile] = await db.select().from(athleteProfiles).where(eq(athleteProfiles.userId, userId));
    return profile || undefined;
  }

  async upsertAthleteProfile(userId: number, updates: Partial<InsertAthleteProfile>): Promise<AthleteProfile> {
    const existing = await this.getAthleteProfile(userId);
    if (existing) {
      const [updated] = await db
        .update(athleteProfiles)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(athleteProfiles.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(athleteProfiles).values({ userId, ...updates }).returning();
    return created;
  }

  // ── LMS / Curriculum operations ───────────────────────────────────
  async getPublishedCourses(): Promise<Course[]> {
    return db.select().from(courses)
      .where(eq(courses.isPublished, true))
      .orderBy(asc(courses.sortOrder));
  }

  async getCourseBySlug(slug: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.slug, slug));
    return course || undefined;
  }

  async getCourseById(id: number): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course || undefined;
  }

  async getModulesForCourse(courseId: number): Promise<CourseModule[]> {
    return db.select().from(courseModules)
      .where(and(eq(courseModules.courseId, courseId), eq(courseModules.isPublished, true)))
      .orderBy(asc(courseModules.sortOrder));
  }

  async getLessonsForCourse(courseId: number): Promise<Lesson[]> {
    return db.select().from(lessons)
      .where(and(eq(lessons.courseId, courseId), eq(lessons.isPublished, true)))
      .orderBy(asc(lessons.sortOrder));
  }

  async getLessonBySlug(slug: string): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.slug, slug));
    return lesson || undefined;
  }

  async getLessonById(id: number): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson || undefined;
  }

  async getLessonProgressForUser(userId: number): Promise<LessonProgress[]> {
    return db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
  }

  async getLessonProgressForCourse(userId: number, courseId: number): Promise<LessonProgress[]> {
    const courseLessons = await this.getLessonsForCourse(courseId);
    const lessonIds = courseLessons.map((l) => l.id);
    if (lessonIds.length === 0) return [];
    return db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), inArray(lessonProgress.lessonId, lessonIds)));
  }

  async upsertLessonProgress(
    userId: number,
    lessonId: number,
    status: "in_progress" | "completed"
  ): Promise<LessonProgress> {
    const [existing] = await db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
    if (existing) {
      // Never downgrade a completed lesson back to in_progress.
      const nextStatus = existing.status === "completed" ? "completed" : status;
      const nextCompletedAt = existing.completedAt ?? (status === "completed" ? new Date() : null);
      const [updated] = await db.update(lessonProgress)
        .set({ status: nextStatus, completedAt: nextCompletedAt, updatedAt: new Date() })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(lessonProgress)
      .values({ userId, lessonId, status, completedAt: status === "completed" ? new Date() : null })
      .returning();
    return created;
  }

  async getCertificate(userId: number, courseId: number): Promise<CourseCertificate | undefined> {
    const [cert] = await db.select().from(courseCertificates)
      .where(and(eq(courseCertificates.userId, userId), eq(courseCertificates.courseId, courseId)));
    return cert || undefined;
  }

  async getCertificatesForUser(userId: number): Promise<CourseCertificate[]> {
    return db.select().from(courseCertificates).where(eq(courseCertificates.userId, userId));
  }

  async issueCertificate(
    userId: number,
    courseId: number,
    certificateCode: string
  ): Promise<CourseCertificate> {
    const existing = await this.getCertificate(userId, courseId);
    if (existing) return existing;
    const [created] = await db.insert(courseCertificates)
      .values({ userId, courseId, certificateCode })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
