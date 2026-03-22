import { Navigate } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface ModuleGateProps {
    module: "engage" | "reach" | "attract";
    children: React.ReactNode;
}

/**
 * Route guard that checks if the user has access to a specific module.
 * Redirects to pricing page if the module is not in active_modules
 * (unless they're on a trial, which grants access to everything).
 */
export function ModuleGate({ module, children }: ModuleGateProps) {
    const { hasEngage, hasReach, hasAttract, isTrialing } = useSubscriptionStatus();

    // Trial users get access to everything
    if (isTrialing) return <>{children}</>;

    const hasAccess =
        (module === "engage" && hasEngage) ||
        (module === "reach" && hasReach) ||
        (module === "attract" && hasAttract);

    if (!hasAccess) {
        return <Navigate to="/pricing" replace />;
    }

    return <>{children}</>;
}
