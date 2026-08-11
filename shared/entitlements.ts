/**
 * Central entitlement definitions: which tier (or role) is required for each feature.
 * Used server-side for API gating; client keeps its own permissions.ts in sync with this.
 */

export type SubscriptionTier = "free" | "flo" | "premium" | "ultimate";

export interface TierPricing {
  name: string;
  tagline: string;
  price: number;
  interval: "month" | "one-time";
  features: string[];
}

export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
  free: {
    name: "Free",
    tagline: "Try FLO instantly",
    price: 0,
    interval: "month",
    features: [
      "6 messages with FLO per session",
      "Basic mental state assessment",
      "Red2Blue concept overview",
    ],
  },
  flo: {
    name: "FLO Subscription",
    tagline: "Your AI mental coach, unlimited",
    price: 30,
    interval: "month",
    features: [
      "Unlimited FLO conversations",
      "Personalized coaching memory",
      "Breathing & focus exercises",
      "Daily mood tracking",
      "Progress analytics",
    ],
  },
  premium: {
    name: "Elite Digital Coaching",
    tagline: "Complete digital transformation",
    price: 590,
    interval: "one-time",
    features: [
      "Everything in FLO Subscription",
      "Red2Blue Certification Track",
      "Advanced performance analytics",
      "Custom mental training programs",
      "Priority support",
    ],
  },
  ultimate: {
    name: "Master Human Coaching",
    tagline: "AI + Human elite coaching",
    price: 2290,
    interval: "one-time",
    features: [
      "Everything in Elite Digital",
      "Dedicated human R2B Coach",
      "5x private 1-on-1 sessions",
      "VIP direct communication",
      "Official Athlete Certification",
    ],
  },
};
export type FeatureKey =
  | "dashboard"
  | "techniques"
  | "scenarios"
  | "goals"
  | "progress"
  | "community"
  | "leaderboard"
  | "unlimitedChat"
  | "recommendations"
  | "insights"
  | "coachingProfile"
  | "engagement"
  | "preShotRoutines"
  | "mentalSkillsXCheck"
  | "controlCircles"
  | "dailyMood"
  | "generatePlan"
  | "shareIdea"
  | "emergencyRelief"
  | "practiceTechnique"
  | "assessmentHistory"
  | "curriculum"
  | "humanCoaching";

/** Minimum tier required for each feature. "premium" = premium or ultimate; "ultimate" = ultimate only. */
export const FEATURE_MIN_TIER: Record<FeatureKey, SubscriptionTier> = {
  dashboard: "premium",
  techniques: "premium",
  scenarios: "premium",
  goals: "premium",
  progress: "premium",
  community: "premium",
  leaderboard: "premium",
  unlimitedChat: "premium",
  recommendations: "premium",
  insights: "premium",
  coachingProfile: "premium",
  engagement: "premium",
  preShotRoutines: "premium",
  mentalSkillsXCheck: "premium",
  controlCircles: "premium",
  dailyMood: "premium",
  generatePlan: "premium",
  shareIdea: "premium",
  emergencyRelief: "premium",
  practiceTechnique: "premium",
  assessmentHistory: "premium",
  curriculum: "premium",
  humanCoaching: "ultimate",
};

const TIER_ORDER: Record<SubscriptionTier, number> = {
  free: 0,
  flo: 1,
  premium: 2,
  ultimate: 3,
};

export function hasFeatureAccess(
  subscriptionTier: SubscriptionTier | null | undefined,
  role: string | null | undefined,
  feature: FeatureKey
): boolean {
  if (role === "admin" || role === "coach") return true;
  const tier = subscriptionTier || "free";
  const minTier = FEATURE_MIN_TIER[feature];
  return TIER_ORDER[tier] >= TIER_ORDER[minTier];
}

export function getRequiredTierForFeature(feature: FeatureKey): SubscriptionTier {
  return FEATURE_MIN_TIER[feature];
}
