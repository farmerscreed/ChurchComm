import { useAuthStore } from '@/stores/authStore'

/**
 * Returns helpers to check which KeepFlock modules the current organisation
 * has access to, based on the plan_modules column in the organisations table.
 *
 * plan_modules is a TEXT[] column populated by the LemonSqueezy webhook handler
 * when a purchase completes. Example value: ['attract', 'engage']
 *
 * REACH is always free — no plan or trial needed.
 *
 * ATTRACT trial state:
 *   attractTrialActive  — attract_trial_ends_at is set and in the future
 *   attractTrialExpired — attract_trial_ends_at is set, in the past, and 'attract' not in plan_modules
 */
export function usePlanModules() {
  const { currentOrganization } = useAuthStore()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = currentOrganization as any
  const planModules: string[] = org?.plan_modules ?? []

  const now = Date.now()

  const attractTrialEndsAt: number | null = org?.attract_trial_ends_at
    ? new Date(org.attract_trial_ends_at).getTime()
    : null

  const attractTrialActive = attractTrialEndsAt !== null && attractTrialEndsAt > now

  const attractTrialExpired =
    attractTrialEndsAt !== null &&
    attractTrialEndsAt <= now &&
    !planModules.includes('attract')

  /**
   * Returns true if the current organisation has the given module active.
   * REACH is always free for all authenticated users.
   */
  const hasModule = (module: string): boolean => {
    if (!currentOrganization) return false

    // REACH is free for everyone
    if (module === 'reach') return true

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

    // Active ATTRACT trial grants access
    if (module === 'attract' && attractTrialActive) return true

    return planModules.includes(module)
  }

  return {
    hasModule,
    planModules,
    attractTrialActive,
    attractTrialExpired,
  }
}
