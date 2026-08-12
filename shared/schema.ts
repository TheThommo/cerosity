import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  dateOfBirth: timestamp("date_of_birth"),
  dexterity: text("dexterity"), // "left" or "right"
  gender: text("gender"), // "male" or "female"
  golfHandicap: integer("golf_handicap"),
  golfExperience: text("golf_experience"), // beginner, intermediate, advanced, expert, professional
  goals: text("goals"),
  bio: text("bio"),
  aiGeneratedProfile: text("ai_generated_profile"),
  profileImageUrl: text("profile_image_url"),
  isSubscribed: boolean("is_subscribed").default(false),
  subscriptionTier: text("subscription_tier").default("free"), // "free", "premium", "ultimate"
  role: text("role").default("student"), // "student", "coach", "admin"
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  // FLO Chat Limitation Fields
  floChatsUsed: integer("flo_chats_used").default(0),
  floSubscriptionActive: boolean("flo_subscription_active").default(false),
  floSubscriptionStartDate: timestamp("flo_subscription_start_date"),
  floSubscriptionRenewalDate: timestamp("flo_subscription_renewal_date"),
  sport: text("sport").default("golf"), // primary sport context for coaching (e.g. "golf"); supports future multi-sport
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  responses: jsonb("responses"), // Store all assessment responses as JSON
  intensityScore: integer("intensity_score").default(0), // Optional for backward compatibility
  decisionMakingScore: integer("decision_making_score").default(0),
  diversionsScore: integer("diversions_score").default(0),
  executionScore: integer("execution_score").default(0),
  totalScore: integer("total_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  messages: jsonb("messages").notNull(), // array of {role, content, timestamp}
  messageCount: integer("message_count").default(0), // Track total messages in session
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// FLO Subscription Management
export const floSubscriptions = pgTable("flo_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subscriptionType: text("subscription_type").notNull(), // "included_year", "annual_renewal"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  stripeSubscriptionId: text("stripe_subscription_id"),
  amountPaid: integer("amount_paid"), // in cents
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  overallScore: integer("overall_score").default(0).notNull(),
  redHeadInstances: integer("red_head_instances").default(0).notNull(),
  blueHeadInstances: integer("blue_head_instances").default(0).notNull(),
  techniquesUsed: text("techniques_used").array(),
  // Engagement / activity counts (Phase 3: align schema with usage)
  emergencyRelief: integer("emergency_relief").default(0),
  practiceMinutes: integer("practice_minutes").default(0),
  chatMessages: integer("chat_messages").default(0),
  engagementScore: integer("engagement_score").default(0),
});

export const techniques = pgTable("techniques", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // breathing, focus, pressure, anchor
  description: text("description").notNull(),
  instructions: text("instructions").notNull(),
  duration: integer("duration"), // in seconds
  difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced
  sport: text("sport").default("golf"), // optional: filter techniques by sport (null = all sports)
});

export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  pressureLevel: text("pressure_level").notNull(), // low, medium, high
  category: text("category").notNull(), // e.g. golf-specific categories; sport-agnostic where applicable
  sport: text("sport").default("golf"), // optional: filter scenarios by sport (null = all sports)
  redHeadTriggers: text("red_head_triggers").array(),
  blueHeadTechniques: text("blue_head_techniques").array(),
});

export const preShotRoutines = pgTable("pre_shot_routines", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  steps: jsonb("steps").notNull(), // array of routine steps with timings
  totalDuration: integer("total_duration").notNull(), // in seconds
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mentalSkillsXChecks = pgTable("mental_skills_x_checks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  intensityScores: jsonb("intensity_scores").notNull(), // array of 3 scores 0-100
  decisionMakingScores: jsonb("decision_making_scores").notNull(), // array of 3 scores 0-100
  diversionsScores: jsonb("diversions_scores").notNull(), // array of 3 scores 0-100
  executionScores: jsonb("execution_scores").notNull(), // array of 3 scores 0-100
  whatDidWell: text("what_did_well"),
  whatCouldDoBetter: text("what_could_do_better"),
  actionPlan: text("action_plan"),
  context: text("context"), // round, tournament, practice, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const controlCircles = pgTable("control_circles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  cantControl: text("cant_control").array(),
  canInfluence: text("can_influence").array(),
  canControl: text("can_control").array(),
  reflections: text("reflections"),
  context: text("context"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Red2Blue Recognition Tool
export const recognitionAssessments = pgTable("recognition_assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  scenario: text("scenario").notNull(),
  redIndicators: jsonb("red_indicators").notNull(), // diverted indicators
  blueIndicators: jsonb("blue_indicators").notNull(), // on task indicators
  demeanourScore: integer("demeanour_score").notNull(), // 1-10
  communicationScore: integer("communication_score").notNull(), // 1-10
  decisionMakingScore: integer("decision_making_score").notNull(), // 1-10
  executionScore: integer("execution_score").notNull(), // 1-10
  overallState: text("overall_state").notNull(), // "red", "blue", "transitional"
  actionPlan: text("action_plan"),
  createdAt: timestamp("created_at").defaultNow(),
});

// What Ifs Planning Tool
export const whatIfPlanning = pgTable("what_if_planning", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  scenario: text("scenario").notNull(),
  riskRating: integer("risk_rating").notNull(), // 1-10
  impactRating: integer("impact_rating").notNull(), // 1-10
  blueStrategy: text("blue_strategy").notNull(), // strategy to stay/return to blue
  testedUnderPressure: boolean("tested_under_pressure").default(false),
  effectiveness: integer("effectiveness"), // 1-10 rating after testing
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Screw Up Cascade (SUC) Tool
export const screwUpCascade = pgTable("screw_up_cascade", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull(), // "golf", "general", "performance"
  screwUpDescription: text("screw_up_description").notNull(),
  frequency: integer("frequency").notNull(), // how often this happens (1-10)
  preventionStrategy: text("prevention_strategy").notNull(),
  triggerWarnings: jsonb("trigger_warnings"), // array of warning signs
  recoveryActions: jsonb("recovery_actions"), // array of recovery steps
  tested: boolean("tested").default(false),
  effectiveness: integer("effectiveness"), // 1-10 rating
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Priority Planner Tool
export const priorityPlanning = pgTable("priority_planning", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  purpose: text("purpose").notNull(),
  primaryIndicator: text("primary_indicator").notNull(),
  primaryResponsibility: text("primary_responsibility").notNull(),
  criticalBuildingBlocks: jsonb("critical_building_blocks").notNull(), // array of focus areas
  responsibilities: jsonb("responsibilities").notNull(), // array per building block
  keyActions: jsonb("key_actions").notNull(), // array of specific actions
  keyIndicators: jsonb("key_indicators").notNull(), // array of success metrics
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Red2Blue Certification Progress
export const certificationProgress = pgTable("certification_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  toolsCompleted: jsonb("tools_completed").notNull(), // array of completed tool names
  assessmentsCompleted: jsonb("assessments_completed").notNull(), // array of assessment types
  practiceScenarios: jsonb("practice_scenarios").notNull(), // array of practiced scenarios
  underPressureTesting: jsonb("under_pressure_testing").notNull(), // array of pressure tested tools
  coachObservations: text("coach_observations"),
  selfReflections: text("self_reflections"),
  certificationLevel: text("certification_level").default("beginner"), // "beginner", "intermediate", "advanced", "certified"
  businessObservationChecklist: jsonb("business_observation_checklist"), // for business certification
  lastProgressUpdate: timestamp("last_progress_update").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily check-ins and leaderboard
export const dailyCheckIns = pgTable("daily_check_ins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date").notNull(),
  completed: boolean("completed").default(false),
  points: integer("points").default(10),
  streakCount: integer("streak_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Progress tracking for techniques
export const techniqueProgress = pgTable("technique_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  techniqueId: integer("technique_id").notNull(),
  practiceCount: integer("practice_count").default(0),
  masteryLevel: text("mastery_level").$type<"beginner" | "intermediate" | "advanced" | "expert">().default("beginner"),
  lastPracticed: timestamp("last_practiced").defaultNow(),
  totalTimeSpent: integer("total_time_spent").default(0), // in minutes
  createdAt: timestamp("created_at").defaultNow(),
});

// Calendar reminders
export const calendarReminders = pgTable("calendar_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  provider: text("provider").$type<"outlook" | "google" | "icloud">().notNull(),
  reminderTime: text("reminder_time").notNull(), // HH:MM format
  timezone: text("timezone").default("UTC"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily mood tracking
export const dailyMoods = pgTable("daily_moods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date").notNull(), // just the date, not timestamp
  moodScore: integer("mood_score").notNull(), // 0-100 scale
  notes: text("notes"), // optional user notes
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
});

export const insertTechniqueSchema = createInsertSchema(techniques).omit({
  id: true,
});

export const insertScenarioSchema = createInsertSchema(scenarios).omit({
  id: true,
});

export const insertPreShotRoutineSchema = createInsertSchema(preShotRoutines).omit({
  id: true,
  createdAt: true,
});

export const insertMentalSkillsXCheckSchema = createInsertSchema(mentalSkillsXChecks).omit({
  id: true,
  createdAt: true,
});

export const insertControlCircleSchema = createInsertSchema(controlCircles).omit({
  id: true,
  createdAt: true,
});

export const insertDailyMoodSchema = createInsertSchema(dailyMoods).omit({
  id: true,
  createdAt: true,
});

export const insertDailyCheckInSchema = createInsertSchema(dailyCheckIns).omit({
  id: true,
  createdAt: true,
});

export const insertTechniqueProgressSchema = createInsertSchema(techniqueProgress).omit({
  id: true,
  createdAt: true,
});

export const insertCalendarReminderSchema = createInsertSchema(calendarReminders).omit({
  id: true,
  createdAt: true,
});

export const insertRecognitionAssessmentSchema = createInsertSchema(recognitionAssessments).omit({
  id: true,
  createdAt: true,
});

export const insertWhatIfPlanningSchema = createInsertSchema(whatIfPlanning).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScrewUpCascadeSchema = createInsertSchema(screwUpCascade).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriorityPlanningSchema = createInsertSchema(priorityPlanning).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCertificationProgressSchema = createInsertSchema(certificationProgress).omit({
  id: true,
  createdAt: true,
  lastProgressUpdate: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type Technique = typeof techniques.$inferSelect;
export type InsertTechnique = z.infer<typeof insertTechniqueSchema>;
export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type PreShotRoutine = typeof preShotRoutines.$inferSelect;
export type InsertPreShotRoutine = z.infer<typeof insertPreShotRoutineSchema>;
export type MentalSkillsXCheck = typeof mentalSkillsXChecks.$inferSelect;
export type InsertMentalSkillsXCheck = z.infer<typeof insertMentalSkillsXCheckSchema>;
export type ControlCircle = typeof controlCircles.$inferSelect;
export type InsertControlCircle = z.infer<typeof insertControlCircleSchema>;
export type DailyMood = typeof dailyMoods.$inferSelect;
export type InsertDailyMood = z.infer<typeof insertDailyMoodSchema>;
export type DailyCheckIn = typeof dailyCheckIns.$inferSelect;
export type InsertDailyCheckIn = z.infer<typeof insertDailyCheckInSchema>;
export type TechniqueProgress = typeof techniqueProgress.$inferSelect;
export type InsertTechniqueProgress = z.infer<typeof insertTechniqueProgressSchema>;
export type CalendarReminder = typeof calendarReminders.$inferSelect;
export type InsertCalendarReminder = z.infer<typeof insertCalendarReminderSchema>;
export type RecognitionAssessment = typeof recognitionAssessments.$inferSelect;
export type InsertRecognitionAssessment = z.infer<typeof insertRecognitionAssessmentSchema>;
export type WhatIfPlanning = typeof whatIfPlanning.$inferSelect;
export type InsertWhatIfPlanning = z.infer<typeof insertWhatIfPlanningSchema>;
export type ScrewUpCascade = typeof screwUpCascade.$inferSelect;
export type InsertScrewUpCascade = z.infer<typeof insertScrewUpCascadeSchema>;
export type PriorityPlanning = typeof priorityPlanning.$inferSelect;
export type InsertPriorityPlanning = z.infer<typeof insertPriorityPlanningSchema>;
export type CertificationProgress = typeof certificationProgress.$inferSelect;
export type InsertCertificationProgress = z.infer<typeof insertCertificationProgressSchema>;

// Notifications table for coach check-ins and system alerts
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'check-in-scheduled', 'assessment-reminder', 'coach-message'
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  scheduledDate: timestamp("scheduled_date"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// AI Recommendation Engine Tables
export const userCoachingProfiles = pgTable("user_coaching_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  learningStyle: text("learning_style"), // "visual", "auditory", "kinesthetic", "analytical"
  preferredSessionLength: integer("preferred_session_length").default(15), // minutes
  stressPatterns: jsonb("stress_patterns"), // array of triggers and responses
  goalPreferences: jsonb("goal_preferences"), // short-term vs long-term focus areas
  responseToFeedback: text("response_to_feedback"), // "direct", "gentle", "motivational", "technical"
  peakPerformanceFactors: jsonb("peak_performance_factors"), // conditions when user performs best
  commonStruggles: jsonb("common_struggles"), // recurring mental game challenges
  motivationalTriggers: jsonb("motivational_triggers"), // what drives user engagement
  techniqueMastery: jsonb("technique_mastery"), // mastery levels for different techniques
  personalityProfile: text("personality_profile"), // "analytical", "emotional", "competitive", "collaborative"
  coachingHistory: jsonb("coaching_history"), // summary of past coaching effectiveness
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiRecommendations = pgTable("ai_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  recommendationType: text("recommendation_type").notNull(), // "technique", "scenario", "routine", "assessment"
  targetId: integer("target_id"), // ID of recommended item (technique, scenario, etc.)
  priority: integer("priority").notNull(), // 1-10 scale
  reasoning: text("reasoning").notNull(), // AI explanation for recommendation
  confidenceScore: integer("confidence_score").notNull(), // 0-100
  personalizedMessage: text("personalized_message"), // custom message for user
  expectedOutcome: text("expected_outcome"), // predicted benefit
  recommendationData: jsonb("recommendation_data"), // additional structured data
  isActive: boolean("is_active").default(true),
  userFeedback: integer("user_feedback"), // 1-5 rating from user
  feedbackComments: text("feedback_comments"),
  wasApplied: boolean("was_applied").default(false),
  effectivenessMeasure: integer("effectiveness_measure"), // post-application rating
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // when recommendation becomes stale
});

export const coachingInsights = pgTable("coaching_insights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  insightType: text("insight_type").notNull(), // "pattern", "improvement", "risk", "opportunity"
  category: text("category").notNull(), // "performance", "engagement", "technique_usage", "progress"
  title: text("title").notNull(),
  description: text("description").notNull(),
  dataPoints: jsonb("data_points"), // supporting evidence/metrics
  actionableSteps: jsonb("actionable_steps"), // specific next steps
  severity: text("severity"), // "low", "medium", "high" for risks
  impact: text("impact"), // "minor", "moderate", "significant"
  timeframe: text("timeframe"), // "immediate", "short_term", "long_term"
  relatedTechniques: jsonb("related_techniques"), // technique IDs
  isAcknowledged: boolean("is_acknowledged").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userEngagementMetrics = pgTable("user_engagement_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date").notNull(),
  chatMessages: integer("chat_messages").default(0),
  assessmentsTaken: integer("assessments_taken").default(0),
  techniquesUsed: integer("techniques_used").default(0),
  sessionDuration: integer("session_duration").default(0), // minutes
  toolsAccessed: jsonb("tools_accessed"), // array of tool names
  recommendationsViewed: integer("recommendations_viewed").default(0),
  recommendationsApplied: integer("recommendations_applied").default(0),
  engagementScore: integer("engagement_score").default(0), // calculated 0-100
  streakCount: integer("streak_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema definitions for new tables
export const insertUserCoachingProfileSchema = createInsertSchema(userCoachingProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiRecommendationSchema = createInsertSchema(aiRecommendations).omit({
  id: true,
  createdAt: true,
});

export const insertCoachingInsightSchema = createInsertSchema(coachingInsights).omit({
  id: true,
  createdAt: true,
});

export const insertUserEngagementMetricSchema = createInsertSchema(userEngagementMetrics).omit({
  id: true,
  createdAt: true,
});

// Type exports for new tables
export type UserCoachingProfile = typeof userCoachingProfiles.$inferSelect;
export type InsertUserCoachingProfile = z.infer<typeof insertUserCoachingProfileSchema>;
export type AiRecommendation = typeof aiRecommendations.$inferSelect;
export type InsertAiRecommendation = z.infer<typeof insertAiRecommendationSchema>;
export type CoachingInsight = typeof coachingInsights.$inferSelect;
export type InsertCoachingInsight = z.infer<typeof insertCoachingInsightSchema>;
export type UserEngagementMetric = typeof userEngagementMetrics.$inferSelect;
export type InsertUserEngagementMetric = z.infer<typeof insertUserEngagementMetricSchema>;

// Goal tracking table
export const userGoals = pgTable("user_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  goalText: text("goal_text").notNull(),
  category: text("category").notNull(), // "short_term", "long_term", "handicap", "mental", "technical"
  priority: integer("priority").default(3), // 1-5 scale, 5 being highest
  targetDate: timestamp("target_date"),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  relatedStats: jsonb("related_stats"), // Store related statistics or measurements
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserGoalSchema = createInsertSchema(userGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  targetDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export type UserGoal = typeof userGoals.$inferSelect;
export type InsertUserGoal = z.infer<typeof insertUserGoalSchema>;

// Admin interface types
export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  totalRevenue: number;
  freeUsers: number;
  premiumUsers: number;
  ultimateUsers: number;
  newUsersThisMonth: number;
  churnRate: number;
  // Activity counters. Every one is a row count, shown exactly as it comes
  // back — including when that is zero.
  totalChatSessions: number;
  floChatsToday: number;
  avgMessagesPerSession: number;
  activeChatters7d: number;
  assessmentsToday: number;
  dailyCheckIns: number;
}

export interface PaymentRecord {
  id: string;
  userId: number;
  amount: number;
  currency: string;
  status: string;
  description: string;
  subscriptionTier: string;
  createdAt: string;
  userEmail: string;
  userName: string;
}

// FLO Subscription schema and types
export const insertFloSubscriptionSchema = createInsertSchema(floSubscriptions).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
});

export type FloSubscription = typeof floSubscriptions.$inferSelect;
export type InsertFloSubscription = z.infer<typeof insertFloSubscriptionSchema>;

// Chat limitations interface
export interface ChatLimitations {
  chatLimit: number;
  chatsUsed: number;
  hasAccess: boolean;
  canChat: boolean;
  subscriptionStatus: "free" | "unlimited" | "premium_included" | "ultimate_included" | "annual_renewal" | "expired";
  renewalDate?: Date;
}

// Leads table (marketing lead capture)
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  phone: text("phone"),
  businessName: text("business_name"),
  country: text("country"),
  stateRegion: text("state_region"),
  zipCode: text("zip_code"),
  sportIndustry: text("sport_industry"),
  source: text("source").notNull().default("Footer Form"),
  agent: text("agent"),
  leadStatus: text("lead_status").notNull().default("New"),
  notes: text("notes"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePlan: text("stripe_plan"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

// FLO Brain documents (knowledge base for FLO coaching)
export const floBrainDocuments = pgTable("flo_brain_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("general"),
  contentText: text("content_text").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  uploadedBy: text("uploaded_by"),
  sourceType: text("source_type").notNull().default("text"),
  sourceFilename: text("source_filename"),
  contentCharCount: integer("content_char_count"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// FLO Sport Contexts (HQ-managed sport-specific coaching context)
export const floSportContexts = pgTable("flo_sport_contexts", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  displayName: text("display_name").notNull(),
  contextText: text("context_text").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Athlete Profiles (structured data FLO learns from)
export const athleteProfiles = pgTable("athlete_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").unique().notNull(),
  achievements: jsonb("achievements").notNull().default([]),
  challenges: jsonb("challenges").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFloBrainDocumentSchema = createInsertSchema(floBrainDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FloBrainDocument = typeof floBrainDocuments.$inferSelect;
export type InsertFloBrainDocument = z.infer<typeof insertFloBrainDocumentSchema>;

export const insertFloSportContextSchema = createInsertSchema(floSportContexts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FloSportContext = typeof floSportContexts.$inferSelect;
export type InsertFloSportContext = z.infer<typeof insertFloSportContextSchema>;

export const insertAthleteProfileSchema = createInsertSchema(athleteProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AthleteProfile = typeof athleteProfiles.$inferSelect;
export type InsertAthleteProfile = z.infer<typeof insertAthleteProfileSchema>;

// ── VAPI Voice Tables ──────────────────────────────────────────────

export const voiceCalls = pgTable("voice_calls", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  direction: text("direction").notNull(), // 'inbound' | 'outbound' | 'web'
  status: text("status").notNull().default("in-progress"),
  fromNumber: text("from_number"),
  toNumber: text("to_number"),
  provider: text("provider").notNull().default("vapi"),
  providerCallId: text("provider_call_id").unique(),
  vapiAssistantId: text("vapi_assistant_id"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
  durationSeconds: integer("duration_seconds"),
  summary: text("summary"),
  sentiment: text("sentiment"),
  providerMetadata: jsonb("provider_metadata"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const voiceCallTranscripts = pgTable("voice_call_transcripts", {
  id: serial("id").primaryKey(),
  callId: integer("call_id").notNull(),
  speaker: text("speaker").notNull(), // 'Agent' | 'Customer'
  content: text("content").notNull(),
  startsAtMs: integer("starts_at_ms"),
  endsAtMs: integer("ends_at_ms"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const voiceSessions = pgTable("voice_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  agentType: text("agent_type").notNull().default("flo"),
  vapiAssistantId: text("vapi_assistant_id"),
  status: text("status").notNull().default("active"),
  durationSeconds: integer("duration_seconds"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVoiceCallSchema = createInsertSchema(voiceCalls).omit({
  id: true,
  createdAt: true,
});

export const insertVoiceCallTranscriptSchema = createInsertSchema(voiceCallTranscripts).omit({
  id: true,
  createdAt: true,
});

export const insertVoiceSessionSchema = createInsertSchema(voiceSessions).omit({
  id: true,
  createdAt: true,
});

export type VoiceCall = typeof voiceCalls.$inferSelect;
export type InsertVoiceCall = z.infer<typeof insertVoiceCallSchema>;
export type VoiceCallTranscript = typeof voiceCallTranscripts.$inferSelect;
export type InsertVoiceCallTranscript = z.infer<typeof insertVoiceCallTranscriptSchema>;
export type VoiceSession = typeof voiceSessions.$inferSelect;
export type InsertVoiceSession = z.infer<typeof insertVoiceSessionSchema>;

// ── LMS / Learning Curriculum ──────────────────────────────────────
// Structured Red2Blue curriculum delivered behind the paywall.
// Hierarchy: courses → course_modules → lessons. Per-user state in
// lesson_progress; course completion issues a course_certificate.

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  // Minimum subscription tier required for the full course. Read from the row
  // (not hardcoded in logic) so gating stays config-driven per entitlements.
  requiredTier: text("required_tier").notNull().default("premium"),
  sport: text("sport").default("golf"), // optional sport filter; null = all sports
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courseModules = pgTable("course_modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  slug: text("slug").unique().notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  summary: text("summary"),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  courseId: integer("course_id").notNull(), // denormalised for gating/queries
  slug: text("slug").unique().notNull(),
  title: text("title").notNull(),
  lessonType: text("lesson_type").notNull().default("concept"), // concept | tool | exercise | scenario | assessment | intro
  summary: text("summary"),
  estimatedMinutes: integer("estimated_minutes").default(5),
  content: jsonb("content").notNull(), // ordered array of content blocks (see LessonBlock)
  toolKey: text("tool_key"), // optional link to an interactive tool (e.g. "controlCircles")
  isFreePreview: boolean("is_free_preview").notNull().default(false), // visible to free tier as a teaser
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lessonProgress = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  status: text("status").notNull().default("in_progress"), // in_progress | completed
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courseCertificates = pgTable("course_certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: integer("course_id").notNull(),
  certificateCode: text("certificate_code").unique().notNull(),
  issuedAt: timestamp("issued_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseModuleSchema = createInsertSchema(courseModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseCertificateSchema = createInsertSchema(courseCertificates).omit({
  id: true,
  createdAt: true,
  issuedAt: true,
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type CourseModule = typeof courseModules.$inferSelect;
export type InsertCourseModule = z.infer<typeof insertCourseModuleSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type CourseCertificate = typeof courseCertificates.$inferSelect;
export type InsertCourseCertificate = z.infer<typeof insertCourseCertificateSchema>;

// Lesson content block shape (stored in lessons.content jsonb).
export type LessonBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "keyPoints"; title?: string; items: string[] }
  | { type: "callout"; variant?: "info" | "blue" | "red" | "tip"; title?: string; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "steps"; title?: string; items: string[] }
  | { type: "scenarioPrompts"; scenario: string; prompts: string[] }
  | { type: "toolEmbed"; toolKey: string; label?: string };
