import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2, Sparkles, Phone, MessageSquare, Users, Clock } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PricingTier {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    annualPrice: number;
    features: { text: string; included: boolean }[];
    minutesIncluded: number;
    popular?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
    {
        id: "starter",
        name: "Starter",
        description: "Perfect for small churches getting started",
        monthlyPrice: 29,
        annualPrice: 290,
        minutesIncluded: 50,
        features: [
            { text: "Up to 200 members", included: true },
            { text: "50 AI calling minutes/mo", included: true },
            { text: "Unlimited SMS", included: true },
            { text: "Basic call scripts", included: true },
            { text: "Email support", included: true },
            { text: "AI Script Builder", included: false },
            { text: "Custom integrations", included: false },
        ],
    },
    {
        id: "growth",
        name: "Growth",
        description: "For growing churches with active outreach",
        monthlyPrice: 79,
        annualPrice: 790,
        minutesIncluded: 200,
        popular: true,
        features: [
            { text: "Up to 1,000 members", included: true },
            { text: "200 AI calling minutes/mo", included: true },
            { text: "Unlimited SMS", included: true },
            { text: "Advanced call scripts", included: true },
            { text: "Priority support", included: true },
            { text: "AI Script Builder", included: true },
            { text: "Custom integrations", included: false },
        ],
    },
    {
        id: "enterprise",
        name: "Enterprise",
        description: "For large churches with complex needs",
        monthlyPrice: 199,
        annualPrice: 1990,
        minutesIncluded: 500,
        features: [
            { text: "Unlimited members", included: true },
            { text: "500 AI calling minutes/mo", included: true },
            { text: "Unlimited SMS", included: true },
            { text: "Custom call scripts", included: true },
            { text: "Dedicated support", included: true },
            { text: "AI Script Builder", included: true },
            { text: "Custom integrations", included: true },
        ],
    },
];

export default function PricingPage() {
    const [isAnnual, setIsAnnual] = useState(true);
    const [loading, setLoading] = useState<string | null>(null);
    const { currentOrganization, user } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleSelectPlan = async (tier: PricingTier) => {
        if (!user) {
            navigate("/login");
            return;
        }

        if (!currentOrganization) {
            toast({
                title: "No organization",
                description: "Please complete onboarding first",
                variant: "destructive",
            });
            return;
        }

        setLoading(tier.id);

        try {
            const { data, error } = await supabase.functions.invoke("stripe-checkout", {
                body: {
                    tier: tier.id,
                    billing_cycle: isAnnual ? "annual" : "monthly",
                    organization_id: currentOrganization.id,
                },
            });

            if (error) throw error;

            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL returned");
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to start checkout",
                variant: "destructive",
            });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
                    <p className="text-lg text-muted-foreground mb-8">
                        Start with a 14-day free trial. No credit card required to start.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4">
                        <Label className={!isAnnual ? "font-semibold" : "text-muted-foreground"}>
                            Monthly
                        </Label>
                        <Switch
                            checked={isAnnual}
                            onCheckedChange={setIsAnnual}
                        />
                        <Label className={isAnnual ? "font-semibold" : "text-muted-foreground"}>
                            Annual
                            <Badge variant="secondary" className="ml-2">Save 17%</Badge>
                        </Label>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    {PRICING_TIERS.map((tier) => (
                        <Card
                            key={tier.id}
                            className={`relative flex flex-col ${tier.popular
                                    ? "border-primary shadow-lg scale-105"
                                    : "border-border"
                                }`}
                        >
                            {tier.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-primary text-primary-foreground">
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Most Popular
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="text-center pb-2">
                                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                                <CardDescription>{tier.description}</CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1 flex flex-col">
                                {/* Price */}
                                <div className="text-center py-4">
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-4xl font-bold">
                                            ${isAnnual ? Math.round(tier.annualPrice / 12) : tier.monthlyPrice}
                                        </span>
                                        <span className="text-muted-foreground">/mo</span>
                                    </div>
                                    {isAnnual && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            ${tier.annualPrice} billed annually
                                        </p>
                                    )}
                                </div>

                                {/* Minutes highlight */}
                                <div className="bg-muted rounded-lg p-3 mb-4 flex items-center justify-center gap-2">
                                    <Phone className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{tier.minutesIncluded} AI minutes/mo</span>
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 flex-1">
                                    {tier.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-2">
                                            {feature.included ? (
                                                <Check className="h-4 w-4 text-green-500 shrink-0" />
                                            ) : (
                                                <X className="h-4 w-4 text-muted-foreground shrink-0" />
                                            )}
                                            <span className={feature.included ? "" : "text-muted-foreground"}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <Button
                                    className="w-full mt-6"
                                    variant={tier.popular ? "default" : "outline"}
                                    onClick={() => handleSelectPlan(tier)}
                                    disabled={loading !== null}
                                >
                                    {loading === tier.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "Start Free Trial"
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* FAQ / Trust signals */}
                <div className="mt-16 text-center">
                    <p className="text-muted-foreground">
                        Questions? <a href="/contact" className="text-primary hover:underline">Contact us</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
