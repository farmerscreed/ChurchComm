import { useAuthStore } from "@/stores/authStore";

interface SubscriptionState {
    isReadOnly: boolean;
    isPastDue: boolean;
    isCanceled: boolean;
    isTrialing: boolean;
    canUseCalling: boolean;
    canUseSMS: boolean;
    isMinutesLow: boolean;
    isMinutesExhausted: boolean;
    trialDaysRemaining: number | null;
    minutesUsed: number;
    minutesIncluded: number;
    message?: string;
}

/**
 * Hook to determine subscription status, feature availability,
 * and generate user-facing warnings for billing issues.
 */
export function useSubscriptionStatus(): SubscriptionState {
    const { currentOrganization } = useAuthStore();

    const subscriptionStatus = currentOrganization?.subscription_status || "active";
    const subscriptionPlan = currentOrganization?.subscription_plan || "free";
    const minutesUsed = currentOrganization?.minutes_used || 0;
    const minutesIncluded = currentOrganization?.minutes_included || 15;
    const trialEndsAt = currentOrganization?.trial_ends_at;

    const isPastDue = subscriptionStatus === "past_due";
    const isCanceled = subscriptionStatus === "canceled";
    const isTrialing = subscriptionStatus === "trialing";
    const isActive = subscriptionStatus === "active" || isTrialing;

    // Read-only mode for past_due or canceled subscriptions
    const isReadOnly = isPastDue || isCanceled;

    // Minutes tracking
    const minutePercentage = minutesIncluded > 0 ? (minutesUsed / minutesIncluded) * 100 : 0;
    const isMinutesLow = minutePercentage >= 80 && minutePercentage < 100;
    const isMinutesExhausted = minutesUsed >= minutesIncluded;

    // Trial expiry tracking
    let trialDaysRemaining: number | null = null;
    if (isTrialing && trialEndsAt) {
        const now = new Date();
        const trialEnd = new Date(trialEndsAt);
        const diffMs = trialEnd.getTime() - now.getTime();
        trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Can use calling if active/trialing and has minutes remaining
    const canUseCalling = isActive && !isMinutesExhausted;

    // Can use SMS if active/trialing (no minute limit for SMS)
    const canUseSMS = isActive;

    // Build prioritized message for UI (most critical first)
    let message: string | undefined;
    if (isPastDue) {
        message = "Your payment is past due. Please update your payment method to continue using KeepFlock.";
    } else if (isCanceled) {
        message = "Your subscription has been canceled. Subscribe to a plan to continue using KeepFlock.";
    } else if (isMinutesExhausted) {
        message = "You've used all your AI calling minutes this period. Upgrade your plan for more minutes.";
    } else if (isMinutesLow) {
        message = `You've used ${minutesUsed} of ${minutesIncluded} AI calling minutes (${Math.round(minutePercentage)}%). Consider upgrading your plan.`;
    } else if (isTrialing && trialDaysRemaining !== null && trialDaysRemaining <= 3) {
        message = trialDaysRemaining === 0
            ? "Your free trial ends today! Subscribe to a plan to keep using KeepFlock."
            : `Your free trial ends in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'}. Subscribe to a plan to continue.`;
    }

    return {
        isReadOnly,
        isPastDue,
        isCanceled,
        isTrialing,
        canUseCalling,
        canUseSMS,
        isMinutesLow,
        isMinutesExhausted,
        trialDaysRemaining,
        minutesUsed,
        minutesIncluded,
        message,
    };
}
