import { useAuthStore } from "@/stores/authStore";

export type PlanTier = "free" | "starter" | "growth" | "pro" | "enterprise";

export interface PlanFeatures {
  /** Current plan tier name for display */
  planName: string;
  /** Max members in People directory */
  maxMembers: number;
  /** Max people reached per billing period */
  maxPeopleReached: number;
  /** SMS segments included per month */
  smsIncluded: number;
  /** Manual AI calling campaigns + custom script creation (Growth+) */
  hasGroupCalling: boolean;
  /** Scheduled outreach (Growth+) */
  hasScheduledOutreach: boolean;
  /** Event-based automations: group_join, group_leave, first_visit (Growth+) */
  hasEventTriggers: boolean;
  /** Escalation alert notifications (Growth+) */
  hasEscalationAlerts: boolean;
  /** Bulk voice campaigns via CampaignBuilder (Pro+) */
  hasMassVoiceCampaigns: boolean;
  /** Per-member AI memory context injection and storage (Pro+) */
  hasAIMemory: boolean;
  /** Returns which plan is required to unlock a given feature */
  requiredPlan: (feature: BooleanFeatureKey) => string;
}

export type BooleanFeatureKey =
  | "hasGroupCalling"
  | "hasScheduledOutreach"
  | "hasEventTriggers"
  | "hasEscalationAlerts"
  | "hasMassVoiceCampaigns"
  | "hasAIMemory";

const PLAN_DISPLAY_NAMES: Record<PlanTier, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  enterprise: "Enterprise",
};

type PlanData = Omit<PlanFeatures, "planName" | "requiredPlan">;

const PLAN_FEATURES: Record<PlanTier, PlanData> = {
  free: {
    maxMembers: 200,
    maxPeopleReached: 25,
    smsIncluded: 500,
    hasGroupCalling: false,
    hasScheduledOutreach: false,
    hasEventTriggers: false,
    hasEscalationAlerts: false,
    hasMassVoiceCampaigns: false,
    hasAIMemory: false,
  },
  starter: {
    maxMembers: 200,
    maxPeopleReached: 25,
    smsIncluded: 500,
    hasGroupCalling: false,
    hasScheduledOutreach: false,
    hasEventTriggers: false,
    hasEscalationAlerts: false,
    hasMassVoiceCampaigns: false,
    hasAIMemory: false,
  },
  growth: {
    maxMembers: 1000,
    maxPeopleReached: 75,
    smsIncluded: 2000,
    hasGroupCalling: true,
    hasScheduledOutreach: true,
    hasEventTriggers: true,
    hasEscalationAlerts: true,
    hasMassVoiceCampaigns: false,
    hasAIMemory: false,
  },
  pro: {
    maxMembers: Infinity,
    maxPeopleReached: 200,
    smsIncluded: 5000,
    hasGroupCalling: true,
    hasScheduledOutreach: true,
    hasEventTriggers: true,
    hasEscalationAlerts: true,
    hasMassVoiceCampaigns: true,
    hasAIMemory: true,
  },
  enterprise: {
    maxMembers: Infinity,
    maxPeopleReached: Infinity,
    smsIncluded: Infinity,
    hasGroupCalling: true,
    hasScheduledOutreach: true,
    hasEventTriggers: true,
    hasEscalationAlerts: true,
    hasMassVoiceCampaigns: true,
    hasAIMemory: true,
  },
};

const FEATURE_REQUIRED_PLAN: Record<BooleanFeatureKey, string> = {
  hasGroupCalling: "Growth",
  hasScheduledOutreach: "Growth",
  hasEventTriggers: "Growth",
  hasEscalationAlerts: "Growth",
  hasMassVoiceCampaigns: "Pro",
  hasAIMemory: "Pro",
};

export function usePlanFeatures(): PlanFeatures {
  const { currentOrganization } = useAuthStore();
  const raw = (currentOrganization?.subscription_plan || "starter").toLowerCase().trim() as PlanTier;
  const tier: PlanTier = PLAN_FEATURES[raw] ? raw : "starter";
  const data = PLAN_FEATURES[tier];

  return {
    ...data,
    planName: PLAN_DISPLAY_NAMES[tier],
    requiredPlan: (feature: BooleanFeatureKey) =>
      FEATURE_REQUIRED_PLAN[feature] ?? "Growth",
  };
}
