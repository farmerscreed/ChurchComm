import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Users, Calendar, AlertTriangle, ExternalLink, Loader2, Phone } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function BillingSettings() {
    const [loading, setLoading] = useState(false);
    const { currentOrganization } = useAuthStore();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [actualMinutesUsed, setActualMinutesUsed] = useState(0);

    // Fetch real minutes from the database (computed from actual call durations)
    useEffect(() => {
        if (!currentOrganization?.id) return;
        supabase.rpc('get_dashboard_stats', { p_organization_id: currentOrganization.id })
            .then(({ data }) => {
                const totalMinutes = Math.ceil(Number(data?.[0]?.total_minutes || 0));
                setActualMinutesUsed(totalMinutes);
            });
    }, [currentOrganization?.id]);

    const subscriptionPlan = currentOrganization?.subscription_plan || "free";
    const subscriptionStatus = currentOrganization?.subscription_status || "active";
    const minutesUsed = actualMinutesUsed;
    const minutesIncluded = currentOrganization?.minutes_included || 0;
    const trialEndsAt = currentOrganization?.trial_ends_at;
    const currentPeriodEnd = currentOrganization?.current_period_end;
    const billingCycle = currentOrganization?.billing_cycle;

    // Convert minutes to "people reached" (avg ~3 min per call)
    const peopleReached = minutesIncluded > 0 ? Math.floor(minutesUsed / 3) : 0;
    const peoplePossible = minutesIncluded > 0 ? Math.floor(minutesIncluded / 3) : 0;
    const isUnlimited = minutesIncluded >= 99999;

    const usagePercentage = minutesIncluded > 0 ? Math.min((minutesUsed / minutesIncluded) * 100, 100) : 0;
    const isTrialing = subscriptionStatus === "trialing";
    const isPastDue = subscriptionStatus === "past_due";
    const isCanceled = subscriptionStatus === "canceled";

    const handleManageBilling = async () => {
        if (!currentOrganization?.id) return;

        // If no Stripe customer exists yet, redirect to pricing to subscribe first
        if (!currentOrganization.stripe_customer_id) {
            toast({
                title: "No Active Subscription",
                description: "Subscribe to a plan first to manage your billing.",
            });
            navigate("/pricing");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("stripe-portal", {
                body: { organization_id: currentOrganization.id },
            });

            if (error) throw error;

            // Edge function returns error in response body for non-200 status
            if (data?.error) {
                throw new Error(data.error);
            }

            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No portal URL returned");
            }
        } catch (error: any) {
            toast({
                title: "Billing Portal Error",
                description: error.message || "Failed to open billing portal. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
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
            default:
                return <Badge variant="secondary">{subscriptionStatus}</Badge>;
        }
    };

    const getPlanName = () => {
        const plans: Record<string, string> = {
            free: "Free Trial",
            starter: "Starter",
            growth: "Growth",
            pro: "Pro",
            enterprise: "Enterprise",
        };
        return plans[subscriptionPlan] || subscriptionPlan;
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
                            <div className="flex items-center gap-2 mt-1">
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

            {/* Usage */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        People Reached This Month
                    </CardTitle>
                    <CardDescription>Your monthly AI outreach capacity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {isUnlimited ? `${peopleReached} people reached` : `${peopleReached} of ${peoplePossible} people reached`}
                            </span>
                            <span className="text-muted-foreground">
                                {isUnlimited ? "Unlimited capacity" : `${minutesIncluded - minutesUsed} min remaining`}
                            </span>
                        </div>
                        {!isUnlimited && (
                            <Progress value={usagePercentage} className={usagePercentage > 90 ? "bg-red-200" : ""} />
                        )}
                        {usagePercentage > 80 && !isUnlimited && (
                            <p className="text-sm text-amber-600">
                                You're approaching your outreach limit. Consider upgrading your plan to reach more people.
                            </p>
                        )}
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Reach more people?</p>
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
        </div>
    );
}
