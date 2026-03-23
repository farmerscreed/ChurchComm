import { useAuthStore } from '@/stores/authStore'

/**
 * Returns helpers to check which KeepFlock modules the current organisation
 * has access to, based on the plan_modules column in the organisations table.
 *
 * plan_modules is a TEXT[] column populated by the LemonSqueezy webhook handler
 * when a purchase completes. Example value: ['reach', 'attract']
 *
 * Also exposes trial state for REACH and ATTRACT modules:
 *   reachTrialActive   — reach_trial_ends_at is set and in the future
 *   attractTrialActive — attract_trial_ends_at is set and in the future
 *   reachTrialExpired  — reach_trial_ends_at is set, in the past, and 'reach' not in plan_modules
 *   attractTrialExpired — attract_trial_ends_at is set, in the past, and 'attract' not in plan_modules
 */
export function usePlanModules() {
  const { currentOrganization } = useAuthStore()

  // plan_modules may not yet be in the TypeScript type if the migration has not
  // been applied locally — cast to any to be safe.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = currentOrganization as any
  const planModules: string[] = org?.plan_modules ?? []

  const now = Date.now()

  // Parse trial timestamps (may be null/undefined if migration not yet applied)
  const reachTrialEndsAt: number | null = org?.reach_trial_ends_at
    ? new Date(org.reach_trial_ends_at).getTime()
    : null
  const attractTrialEndsAt: number | null = org?.attract_trial_ends_at
    ? new Date(org.attract_trial_ends_at).getTime()
    : null

  const reachTrialActive = reachTrialEndsAt !== null && reachTrialEndsAt > now
  const attractTrialActive = attractTrialEndsAt !== null && attractTrialEndsAt > now

  const reachTrialExpired =
    reachTrialEndsAt !== null &&
    reachTrialEndsAt <= now &&
    !planModules.includes('reach')

  const attractTrialExpired =
    attractTrialEndsAt !== null &&
    attractTrialEndsAt <= now &&
    !planModules.includes('attract')

  /**
   * Returns true if the current organisation has the given module active.
   * Also returns true if the org is on a legacy subscription plan (all modules
   * unlocked) to avoid breaking existing paying customers during migration.
   */
  const hasModule = (module: string): boolean => {
    if (!currentOrganization) return false

    // Legacy Stripe plans (starter / growth / pro / enterprise) get all modules
    const legacyPlan = org?.subscription_plan
    const legacyActivePlans = ['starter', 'growth', 'pro', 'enterprise']
    if (legacyPlan && legacyActivePlans.includes(legacyPlan)) {
      const subscriptionStatus = org?.subscription_status
      if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
        return true
      }
    }

    // Full bundle grants access to all modules
    if (planModules.includes('bundle')) return true

    // Active trial grants access
    if (module === 'reach' && reachTrialActive) return true
    if (module === 'attract' && attractTrialActive) return true

    return planModules.includes(module)
  }

  return {
    hasModule,
    planModules,
    reachTrialActive,
    attractTrialActive,
    reachTrialExpired,
    attractTrialExpired,
  }
}
