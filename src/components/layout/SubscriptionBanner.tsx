import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, Phone, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Banner shown at the top of the app when subscription needs attention.
 * Handles: past due, canceled, minutes exhausted, minutes low, trial expiring.
 */
export function SubscriptionBanner() {
    const {
        isReadOnly,
        isPastDue,
        isCanceled,
        isTrialing,
        isMinutesLow,
        isMinutesExhausted,
        trialDaysRemaining,
        message,
    } = useSubscriptionStatus();
    const navigate = useNavigate();

    // Determine banner type and styling
    const showBanner =
        isReadOnly || isMinutesExhausted || isMinutesLow ||
        (isTrialing && trialDaysRemaining !== null && trialDaysRemaining <= 3);

    if (!showBanner) return null;

    // Red banner for critical issues, amber for warnings
    const isCritical = isReadOnly || isMinutesExhausted;
    const bgClass = isCritical
        ? "bg-gradient-to-r from-red-500/20 to-red-500/10 border-red-500/30"
        : "bg-gradient-to-r from-amber-500/20 to-amber-500/10 border-amber-500/30";
    const iconColor = isCritical ? "text-red-400" : "text-amber-400";
    const textColor = isCritical ? "text-red-200" : "text-amber-200";

    // Pick the icon based on the issue type
    let Icon = AlertTriangle;
    if (isMinutesLow || isMinutesExhausted) Icon = Phone;
    else if (isTrialing && trialDaysRemaining !== null && trialDaysRemaining <= 3) Icon = Clock;

    return (
        <div className={`${bgClass} border rounded-lg px-4 py-3 flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
                <p className={`text-sm ${textColor} truncate`}>{message}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {isPastDue && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-300 hover:bg-red-500/20 h-8 text-xs"
                        onClick={() => navigate("/settings?tab=billing")}
                    >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                        Update Payment
                    </Button>
                )}
                {(isCanceled || (isTrialing && trialDaysRemaining !== null && trialDaysRemaining <= 3)) && (
                    <Button
                        size="sm"
                        variant="outline"
                        className={`${isCritical ? 'border-red-500/30 text-red-300 hover:bg-red-500/20' : 'border-amber-500/30 text-amber-300 hover:bg-amber-500/20'} h-8 text-xs`}
                        onClick={() => navigate("/pricing")}
                    >
                        View Plans
                    </Button>
                )}
                {(isMinutesLow || isMinutesExhausted) && (
                    <Button
                        size="sm"
                        variant="outline"
                        className={`${isCritical ? 'border-red-500/30 text-red-300 hover:bg-red-500/20' : 'border-amber-500/30 text-amber-300 hover:bg-amber-500/20'} h-8 text-xs`}
                        onClick={() => navigate("/pricing")}
                    >
                        Upgrade Plan
                    </Button>
                )}
            </div>
        </div>
    );
}
