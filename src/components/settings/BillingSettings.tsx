import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Phone, Calendar, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function BillingSettings() {
    const [loading, setLoading] = useState(false);
    const { currentOrganization } = useAuthStore();
    const { toast } = useToast();

    const subscriptionPlan = currentOrganization?.subscription_plan || "free";
    const subscriptionStatus = currentOrganization?.subscription_status || "active";
    const minutesUsed = (currentOrganization as any)?.minutes_used || 0;
    const minutesIncluded = (currentOrganization as any)?.minutes_included || 15;
    const trialEndsAt = (currentOrganization as any)?.trial_ends_at;
    const currentPeriodEnd = (currentOrganization as any)?.current_period_end;

    const minutesPercentage = Math.min((minutesUsed / minutesIncluded) * 100, 100);
    const isTrialing = subscriptionStatus === "trialing";
    const isPastDue = subscriptionStatus === "past_due";
    const isCanceled = subscriptionStatus === "canceled";

    const handleManageBilling = async () => {
        if (!currentOrganization?.id) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("stripe-portal", {
                body: { organization_id: currentOrganization.id },
            });

            if (error) throw error;

            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No portal URL returned");
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to open billing portal",
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
                                Your payment is past due. Please update your payment method to continue using ChurchComm.
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
                        <Phone className="h-5 w-5" />
                        AI Calling Minutes
                    </CardTitle>
                    <CardDescription>Your monthly AI calling usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>{minutesUsed} minutes used</span>
                            <span>{minutesIncluded} minutes included</span>
                        </div>
                        <Progress value={minutesPercentage} className={minutesPercentage > 90 ? "bg-red-200" : ""} />
                        {minutesPercentage > 80 && (
                            <p className="text-sm text-amber-600">
                                You're running low on minutes. Consider upgrading your plan.
                            </p>
                        )}
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Need more minutes?</p>
                            <p className="text-sm text-muted-foreground">
                                Upgrade your plan for more AI calling capacity
                            </p>
                        </div>
                        <Button variant="outline" onClick={() => window.location.href = "/pricing"}>
                            View Plans
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
