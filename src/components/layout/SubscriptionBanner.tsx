import { AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

/**
 * Banner shown when subscription is in a degraded state
 */
export function SubscriptionBanner() {
    const { isReadOnly, isPastDue, isCanceled, message } = useSubscriptionStatus();

    if (!isReadOnly) return null;

    return (
        <div className={`px-4 py-3 flex items-center justify-between gap-4 ${isPastDue ? "bg-red-500/10 border-b border-red-500/20" : "bg-amber-500/10 border-b border-amber-500/20"
            }`}>
            <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${isPastDue ? "text-red-500" : "text-amber-500"}`} />
                <p className="text-sm font-medium">
                    {message}
                </p>
            </div>
            <Button
                size="sm"
                variant={isPastDue ? "destructive" : "default"}
                onClick={() => window.location.href = isCanceled ? "/pricing" : "/settings?tab=billing"}
            >
                <CreditCard className="h-4 w-4 mr-2" />
                {isCanceled ? "View Plans" : "Update Payment"}
            </Button>
        </div>
    );
}
