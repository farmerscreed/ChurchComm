import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Users, AlertTriangle, ExternalLink, Loader2, Phone, Target, Eye } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const MODULE_LABELS: Record<string, { name: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    engage: { name: "ENGAGE", icon: Phone, color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
    reach: { name: "REACH", icon: Target, color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    attract: { name: "ATTRACT", icon: Eye, color: "bg-green-500/20 text-green-300 border-green-500/30" },
};

export function BillingSettings() {
    const [loading] = useState(false);
    const { currentOrganization } = useAuthStore();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [actualMinutesUsed, setActualMinutesUsed] = useState(0);
    const {
        isPastDue, isTrialing, hasEngage,
        activeModules, isEmpire,
    } = useSubscriptionStatus();

    // Fetch real minutes from the database
    useEffect(() => {
        if (!currentOrganization?.id) return;
        supabase.rpc('get_dashboard_stats', { p_organization_id: currentOrganization.id })
            .then(({ data }) => {
                const totalMinutes = Math.ceil(Number(data?.[0]?.total_minutes || 0));
                setActualMinutesUsed(totalMinutes);
            });
    }, [currentOrganization?.id]);

    const subscriptionStatus = currentOrganization?.subscription_status || "active";
    const minutesIncluded = currentOrganization?.minutes_included || 0;
    const trialEndsAt = currentOrganization?.trial_ends_at;
    const currentPeriodEnd = currentOrganization?.current_period_end;
    const billingCycle = currentOrganization?.billing_cycle;

    // Person calls from actual usage
    const actualPersonCalls = Math.floor(actualMinutesUsed / 3);
    const maxPersonCalls = minutesIncluded > 0 ? Math.floor(minutesIncluded / 3) : 0;
    const isUnlimited = minutesIncluded >= 99999;
    const usagePercentage = maxPersonCalls > 0 ? Math.min((actualPersonCalls / maxPersonCalls) * 100, 100) : 0;

    const handleManageBilling = async () => {
        if (!currentOrganization?.id) return;

        // Use LemonSqueezy customer portal URL
        const portalUrl = currentOrganization.ls_customer_portal_url;
        if (portalUrl) {
            window.open(portalUrl, "_blank");
            return;
        }

        // No portal URL — redirect to pricing
        toast({
            title: "No Active Subscription",
            description: "Subscribe to a plan first to manage your billing.",
        });
        navigate("/pricing");
    };

    const getStatusBadge = () => {
        switch (subscriptionStatus) {
            case "active":
                return <Badge className="bg-green-500">Active</Badge>;
            case "trialing":
                return <Badge className="bg-blue-500">Trial</Badge>;
            case "past_due":
                return <Badge variant="destructive">Past Due</Badge>;
            case "canceled":
                return <Badge variant="secondary">Canceled</Badge>;
            case "paused":
                return <Badge className="bg-amber-500">Paused</Badge>;
            default:
                return <Badge variant="secondary">{subscriptionStatus}</Badge>;
        }
    };

    const getPlanName = () => {
        if (isEmpire) return "EMPIRE";
        if (activeModules.length > 0) {
            return activeModules.map(m => MODULE_LABELS[m]?.name || m.toUpperCase()).join(" + ");
        }
        // Legacy plan names
        const plans: Record<string, string> = {
            free: "Free Trial",
            starter: "Starter",
            growth: "Growth",
            pro: "Pro",
            enterprise: "Enterprise",
        };
        return plans[currentOrganization?.subscription_plan || "free"] || currentOrganization?.subscription_plan || "Free";
    };

    return (
        <div className="space-y-6">
            {/* Warning for past due */}
            {isPastDue && (
                <Card className="border-destructive bg-destructive/10">
                    <CardContent className="flex items-center gap-4 py-4">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        <div className="flex-1">
                            <p className="font-medium text-destructive">Payment Required</p>
                            <p className="text-sm text-muted-foreground">
                                Your payment is past due. Please update your payment method to continue using KeepFlock.
                            </p>
                        </div>
                        <Button variant="destructive" onClick={handleManageBilling}>
                            Update Payment
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Current Plan */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Current Plan
                    </CardTitle>
                    <CardDescription>Manage your subscription and billing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold">{getPlanName()}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {getStatusBadge()}
                                {billingCycle && (
                                    <Badge variant="outline" className="text-xs">
                                        {billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                                    </Badge>
                                )}
                                {isTrialing && trialEndsAt && (
                                    <span className="text-sm text-muted-foreground">
                                        Trial ends {new Date(trialEndsAt).toLocaleDateString()}
                                    </span>
                                )}
                                {currentPeriodEnd && !isTrialing && (
                                    <span className="text-sm text-muted-foreground">
                                        Renews {new Date(currentPeriodEnd).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            {/* Active module badges */}
                            {activeModules.length > 0 && (
                                <div className="flex gap-2 mt-3">
                                    {activeModules.map(mod => {
                                        const label = MODULE_LABELS[mod];
                                        if (!label) return null;
                                        return (
                                            <Badge key={mod} className={label.color}>
                                                {label.name}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <Button onClick={handleManageBilling} disabled={loading}>
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    Manage Billing
                                    <ExternalLink className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Usage — only show for ENGAGE module */}
            {(hasEngage || isTrialing) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Person Calls This Month
                        </CardTitle>
                        <CardDescription>Your monthly AI outreach capacity</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {isUnlimited ? `${actualPersonCalls} person calls made` : `${actualPersonCalls} of ~${maxPersonCalls} person calls`}
                                </span>
                                <span className="text-muted-foreground">
                                    {isUnlimited ? "Unlimited capacity" : `~${Math.max(0, maxPersonCalls - actualPersonCalls)} calls remaining`}
                                </span>
                            </div>
                            {!isUnlimited && (
                                <Progress value={usagePercentage} className={usagePercentage > 90 ? "bg-red-200" : ""} />
                            )}
                            {usagePercentage > 80 && !isUnlimited && (
                                <p className="text-sm text-amber-600">
                                    You're approaching your person call limit. Consider upgrading your plan.
                                </p>
                            )}
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Need more person calls?</p>
                                <p className="text-sm text-muted-foreground">
                                    Upgrade your plan to expand your AI outreach capacity
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => navigate("/pricing")}>
                                View Plans
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
