import { useAuthStore } from '@/stores/authStore'

/**
 * Returns helpers to check which KeepFlock modules the current organisation
 * has access to, based on the plan_modules column in the organisations table.
 *
 * plan_modules is a TEXT[] column populated by the LemonSqueezy webhook handler
 * when a purchase completes. Example value: ['reach', 'attract']
 */
export function usePlanModules() {
  const { currentOrganization } = useAuthStore()

  // plan_modules may not yet be in the TypeScript type if the migration has not
  // been applied locally — cast to any to be safe.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planModules: string[] = (currentOrganization as any)?.plan_modules ?? []

  /**
   * Returns true if the current organisation has the given module active.
   * Also returns true if the org is on a legacy subscription plan (all modules
   * unlocked) to avoid breaking existing paying customers during migration.
   */
  const hasModule = (module: string): boolean => {
    if (!currentOrganization) return false

    // Legacy Stripe plans (starter / growth / pro / enterprise) get all modules
    const legacyPlan = (currentOrganization as any)?.subscription_plan
    const legacyActivePlans = ['starter', 'growth', 'pro', 'enterprise']
    if (legacyPlan && legacyActivePlans.includes(legacyPlan)) {
      const subscriptionStatus = (currentOrganization as any)?.subscription_status
      if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
        return true
      }
    }

    // Full bundle grants access to all modules
    if (planModules.includes('bundle')) return true

    return planModules.includes(module)
  }

  return { hasModule, planModules }
}
