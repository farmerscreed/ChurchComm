/**
 * Shared plan feature definitions for backend enforcement.
 * Used by all edge functions to gate features per subscription tier.
 * Source of truth: matches PricingPage.tsx tiers ($29/$79/$149).
 */

export type PlanTier = 'free' | 'starter' | 'growth' | 'pro' | 'enterprise'

export interface PlanFeatures {
  /** Max members in People directory */
  maxMembers: number
  /** Max people reached per billing period (AI call recipients) */
  maxPeopleReached: number
  /** SMS segments included per month */
  smsIncluded: number
  /** Manual AI calling campaigns + custom script creation (Growth+) */
  hasGroupCalling: boolean
  /** Scheduled outreach (Growth+) */
  hasScheduledOutreach: boolean
  /** Event-based automations: group_join, group_leave, first_visit (Growth+) */
  hasEventTriggers: boolean
  /** Escalation alert notifications (Growth+) */
  hasEscalationAlerts: boolean
  /** Bulk voice campaigns via CampaignBuilder (Pro+) */
  hasMassVoiceCampaigns: boolean
  /** Per-member AI memory context injection and storage (Pro+) */
  hasAIMemory: boolean
}

const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
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
}

/**
 * Returns the feature set for the given subscription_plan string.
 * Falls back to starter limits for unrecognized or null plans.
 */
export function getPlanFeatures(plan: string | null | undefined): PlanFeatures {
  const normalized = (plan || 'starter').toLowerCase().trim() as PlanTier
  return PLAN_FEATURES[normalized] ?? PLAN_FEATURES.starter
}

/**
 * Returns a plan-gate error response body as JSON string.
 */
export function planGateError(requiredPlan: string, feature: string): string {
  return JSON.stringify({
    error: `This feature requires the ${requiredPlan} plan or higher.`,
    feature,
    upgrade_url: '/pricing',
  })
}
