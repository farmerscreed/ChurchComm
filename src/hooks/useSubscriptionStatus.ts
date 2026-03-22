import { useAuthStore } from "@/stores/authStore";

interface SubscriptionState {
    isReadOnly: boolean;
    isPastDue: boolean;
    isCanceled: boolean;
    isTrialing: boolean;
    canUseCalling: boolean;
    canUseSMS: boolean;
    isCallsLow: boolean;
    isCallsExhausted: boolean;
    trialDaysRemaining: number | null;
    personCallsUsed: number;
    personCallsIncluded: number;
    // Module awareness
    hasEngage: boolean;
    hasReach: boolean;
    hasAttract: boolean;
    isEmpire: boolean;
    activeModules: string[];
    message?: string;
}

/**
 * Hook to determine subscription status, feature availability,
 * and generate user-facing warnings for billing issues.
 *
 * Framing: "person calls" instead of "minutes" for user clarity.
 * ~65 person calls ≈ 200 minutes (avg ~3 min per call).
 */
export function useSubscriptionStatus(): SubscriptionState {
    const { currentOrganization } = useAuthStore();

    const subscriptionStatus = currentOrganization?.subscription_status || "active";
    const minutesUsed = currentOrganization?.minutes_used || 0;
    const minutesIncluded = currentOrganization?.minutes_included || 0;
    const trialEndsAt = currentOrganization?.trial_ends_at;
    const activeModules = currentOrganization?.active_modules || [];

    // Module awareness
    const hasEngage = activeModules.includes("engage");
    const hasReach = activeModules.includes("reach");
    const hasAttract = activeModules.includes("attract");
    const isEmpire = hasEngage && hasReach && hasAttract;

    const isPastDue = subscriptionStatus === "past_due";
    const isCanceled = subscriptionStatus === "canceled";
    const isTrialing = subscriptionStatus === "trialing";
    const isActive = subscriptionStatus === "active" || isTrialing;

    // Read-only mode for past_due or canceled subscriptions
    const isReadOnly = isPastDue || isCanceled;

    // Person calls tracking (avg ~3 min per call)
    const personCallsUsed = minutesIncluded > 0 ? Math.floor(minutesUsed / 3) : 0;
    const personCallsIncluded = minutesIncluded > 0 ? Math.floor(minutesIncluded / 3) : 0;
    const callPercentage = personCallsIncluded > 0 ? (personCallsUsed / personCallsIncluded) * 100 : 0;
    const isCallsLow = callPercentage >= 80 && callPercentage < 100;
    const isCallsExhausted = minutesUsed >= minutesIncluded && minutesIncluded > 0;

    // Trial expiry tracking
    let trialDaysRemaining: number | null = null;
    if (isTrialing && trialEndsAt) {
        const now = new Date();
        const trialEnd = new Date(trialEndsAt);
        const diffMs = trialEnd.getTime() - now.getTime();
        trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Can use calling if active/trialing, has ENGAGE module, and has calls remaining
    const canUseCalling = isActive && (hasEngage || isTrialing) && !isCallsExhausted;

    // Can use SMS if active/trialing and has ENGAGE module
    const canUseSMS = isActive && (hasEngage || isTrialing);

    // Build prioritized message for UI
    let message: string | undefined;
    if (isPastDue) {
        message = "Your payment is past due. Please update your payment method to continue using KeepFlock.";
    } else if (isCanceled) {
        message = "Your subscription has been canceled. Subscribe to a plan to continue using KeepFlock.";
    } else if (isCallsExhausted && hasEngage) {
        message = "You've used all your person calls this period. Upgrade your plan to reach more people.";
    } else if (isCallsLow && hasEngage) {
        message = `You're approaching your person call limit (${personCallsUsed} of ${personCallsIncluded} used). Consider upgrading.`;
    } else if (isTrialing && trialDaysRemaining !== null && trialDaysRemaining <= 3) {
        message = trialDaysRemaining === 0
            ? "Your free trial ends today! Subscribe to keep using KeepFlock."
            : `Your free trial ends in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'}. Subscribe to continue.`;
    }

    return {
        isReadOnly,
        isPastDue,
        isCanceled,
        isTrialing,
        canUseCalling,
        canUseSMS,
        isCallsLow,
        isCallsExhausted,
        trialDaysRemaining,
        personCallsUsed,
        personCallsIncluded,
        hasEngage,
        hasReach,
        hasAttract,
        isEmpire,
        activeModules,
        message,
    };
}
