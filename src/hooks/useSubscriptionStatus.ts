import { useAuthStore } from "@/stores/authStore";

interface SubscriptionState {
    isReadOnly: boolean;
    isPastDue: boolean;
    isCanceled: boolean;
    isTrialing: boolean;
    canUseCalling: boolean;
    canUseSMS: boolean;
    message?: string;
}

/**
 * Hook to determine if the organization is in read-only mode
 * due to subscription issues (lapsed, canceled, etc.)
 */
export function useSubscriptionStatus(): SubscriptionState {
    const { currentOrganization } = useAuthStore();

    const subscriptionStatus = currentOrganization?.subscription_status || "active";
    const subscriptionPlan = currentOrganization?.subscription_plan || "free";
    const minutesUsed = (currentOrganization as any)?.minutes_used || 0;
    const minutesIncluded = (currentOrganization as any)?.minutes_included || 15;

    const isPastDue = subscriptionStatus === "past_due";
    const isCanceled = subscriptionStatus === "canceled";
    const isTrialing = subscriptionStatus === "trialing";
    const isActive = subscriptionStatus === "active" || isTrialing;

    // Read-only mode for past_due or canceled subscriptions
    const isReadOnly = isPastDue || isCanceled;

    // Can use calling if active/trialing and has minutes remaining
    const canUseCalling = isActive && minutesUsed < minutesIncluded;

    // Can use SMS if active/trialing (no minute limit for SMS)
    const canUseSMS = isActive;

    // Build message for UI
    let message: string | undefined;
    if (isPastDue) {
        message = "Your payment is past due. Please update your payment method to continue using ChurchComm.";
    } else if (isCanceled) {
        message = "Your subscription has been canceled. Subscribe to a plan to continue using ChurchComm.";
    } else if (!canUseCalling && minutesUsed >= minutesIncluded) {
        message = "You've used all your AI calling minutes for this month. Upgrade your plan for more.";
    }

    return {
        isReadOnly,
        isPastDue,
        isCanceled,
        isTrialing,
        canUseCalling,
        canUseSMS,
        message,
    };
}
