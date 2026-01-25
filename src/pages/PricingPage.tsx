import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Check,
    X,
    Loader2,
    Sparkles,
    Phone,
    MessageSquare,
    Users,
    Heart,
    Zap,
    Shield,
    Headphones,
    ArrowRight,
    ChevronRight,
    HelpCircle
} from "lucide-react";
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
    gradient: string;
}

const PRICING_TIERS: PricingTier[] = [
    {
        id: "starter",
        name: "Starter",
        description: "Perfect for small churches getting started with AI outreach",
        monthlyPrice: 49,
        annualPrice: 490,
        minutesIncluded: 60,
        gradient: "from-slate-500 to-slate-700",
        features: [
            { text: "Up to 500 members", included: true },
            { text: "60 AI calling minutes/mo", included: true },
            { text: "500 SMS segments/mo", included: true },
            { text: "Basic call scripts", included: true },
            { text: "Email support", included: true },
            { text: "AI Script Builder", included: false },
            { text: "Auto-triggers & workflows", included: false },
            { text: "Custom integrations", included: false },
        ],
    },
    {
        id: "growth",
        name: "Growth",
        description: "For growing churches with active outreach programs",
        monthlyPrice: 119,
        annualPrice: 1190,
        minutesIncluded: 200,
        popular: true,
        gradient: "from-purple-500 to-blue-600",
        features: [
            { text: "Up to 2,000 members", included: true },
            { text: "200 AI calling minutes/mo", included: true },
            { text: "2,000 SMS segments/mo", included: true },
            { text: "Advanced call scripts", included: true },
            { text: "Priority support", included: true },
            { text: "AI Script Builder", included: true },
            { text: "Auto-triggers & workflows", included: true },
            { text: "Custom integrations", included: false },
        ],
    },
    {
        id: "enterprise",
        name: "Enterprise",
        description: "For large ministries with complex communication needs",
        monthlyPrice: 299,
        annualPrice: 2990,
        minutesIncluded: 600,
        gradient: "from-amber-500 to-orange-600",
        features: [
            { text: "Unlimited members", included: true },
            { text: "600 AI calling minutes/mo", included: true },
            { text: "Unlimited SMS capabilities", included: true },
            { text: "Custom call scripts", included: true },
            { text: "Dedicated support manager", included: true },
            { text: "AI Script Builder", included: true },
            { text: "Auto-triggers & workflows", included: true },
            { text: "Custom integrations & API", included: true },
        ],
    },
];

const FAQS = [
    {
        question: "What are AI calling minutes?",
        answer: "AI calling minutes are used when our AI voice agent makes automated calls on your behalf. Each minute of call time counts toward your monthly allowance. Unused minutes don't roll over."
    },
    {
        question: "How does the AI calling work?",
        answer: "Our AI uses VAPI technology to make natural, conversational phone calls. You create scripts with personalization variables like {Name}, and the AI handles the rest - from greeting to capturing responses."
    },
    {
        question: "Can I send unlimited SMS messages?",
        answer: "Yes! All plans include unlimited SMS messaging via Twilio integration. Standard carrier rates may apply to recipients."
    },
    {
        question: "What happens if I exceed my calling minutes?",
        answer: "You'll receive a notification when approaching your limit. You can upgrade your plan or purchase additional minutes at $0.15/minute."
    },
    {
        question: "Is there a free trial?",
        answer: "Yes! All plans include a 14-day free trial with full access to features. No credit card required to start."
    },
    {
        question: "Can I change plans later?",
        answer: "Absolutely. You can upgrade or downgrade at any time. Changes take effect at your next billing cycle."
    }
];

export default function PricingPage() {
    const [isAnnual, setIsAnnual] = useState(true);
    const [loading, setLoading] = useState<string | null>(null);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
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
        } catch (error: unknown) {
            toast({
                title: "Error",
                description: (error as Error).message || "Failed to start checkout",
                variant: "destructive",
            });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden relative selection:bg-purple-500/30">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-500/15 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[150px]" />
                <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-cyan-500/10 rounded-full blur-[100px]" />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <Heart className="w-5 h-5 text-white fill-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            ChurchComm
                        </span>
                    </Link>
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Home</Link>
                        <Link to="/demo" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Demo</Link>
                        <span className="text-sm font-medium text-white">Pricing</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login">
                            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
                                Sign In
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-16 px-6">
                <div className="container mx-auto text-center max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-purple-300 mb-8">
                        <Sparkles className="w-4 h-4" />
                        <span>Simple, transparent pricing</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                        Plans that scale with{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                            your ministry
                        </span>
                    </h1>

                    <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
                        Start with a 14-day free trial. No credit card required. Cancel anytime.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 mb-16">
                        <span className={`text-sm font-medium transition-colors ${!isAnnual ? "text-white" : "text-slate-500"}`}>
                            Monthly
                        </span>
                        <Switch
                            checked={isAnnual}
                            onCheckedChange={setIsAnnual}
                            className="data-[state=checked]:bg-purple-600"
                        />
                        <span className={`text-sm font-medium transition-colors ${isAnnual ? "text-white" : "text-slate-500"}`}>
                            Annual
                        </span>
                        {isAnnual && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20">
                                Save 17%
                            </Badge>
                        )}
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-24 px-6">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                        {PRICING_TIERS.map((tier) => (
                            <div
                                key={tier.id}
                                className={`relative rounded-2xl transition-all duration-300 ${tier.popular
                                        ? "scale-105 z-10"
                                        : "hover:scale-[1.02]"
                                    }`}
                            >
                                {/* Glow effect for popular */}
                                {tier.popular && (
                                    <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-2xl blur opacity-50" />
                                )}

                                <div className={`relative h-full rounded-2xl border ${tier.popular
                                        ? "border-purple-500/50 bg-slate-900/90"
                                        : "border-white/10 bg-slate-900/50"
                                    } backdrop-blur-xl p-8 flex flex-col`}>

                                    {tier.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 px-4 py-1">
                                                <Sparkles className="w-3 h-3 mr-1.5" />
                                                Most Popular
                                            </Badge>
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                                        <p className="text-slate-400 text-sm">{tier.description}</p>
                                    </div>

                                    {/* Price */}
                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-bold text-white">
                                                ${isAnnual ? Math.round(tier.annualPrice / 12) : tier.monthlyPrice}
                                            </span>
                                            <span className="text-slate-500">/month</span>
                                        </div>
                                        {isAnnual && (
                                            <p className="text-sm text-slate-500 mt-2">
                                                ${tier.annualPrice} billed annually
                                            </p>
                                        )}
                                    </div>

                                    {/* Minutes Highlight */}
                                    <div className={`rounded-xl p-4 mb-6 bg-gradient-to-r ${tier.gradient} bg-opacity-10`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                                <Phone className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold">{tier.minutesIncluded} AI minutes</p>
                                                <p className="text-white/60 text-sm">per month</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-3 flex-1 mb-8">
                                        {tier.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                {feature.included ? (
                                                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <Check className="w-3 h-3 text-green-400" />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <X className="w-3 h-3 text-slate-600" />
                                                    </div>
                                                )}
                                                <span className={feature.included ? "text-slate-300" : "text-slate-600"}>
                                                    {feature.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA Button */}
                                    <Button
                                        onClick={() => handleSelectPlan(tier)}
                                        disabled={loading !== null}
                                        className={`w-full h-12 text-base font-semibold transition-all ${tier.popular
                                                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
                                                : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                                            }`}
                                    >
                                        {loading === tier.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Start Free Trial
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Comparison */}
            <section className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to connect</h2>
                        <p className="text-slate-400 text-lg">All plans include these powerful features</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center mx-auto mb-4">
                                <Phone className="w-7 h-7 text-purple-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">AI Voice Calls</h3>
                            <p className="text-slate-400 text-sm">Natural, conversational AI calls via VAPI for visitor follow-ups, reminders, and care calls</p>
                        </div>

                        <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="w-7 h-7 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Unlimited SMS</h3>
                            <p className="text-slate-400 text-sm">Send personalized mass text messages with two-way conversation support via Twilio</p>
                        </div>

                        <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mx-auto mb-4">
                                <Users className="w-7 h-7 text-cyan-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">People CRM</h3>
                            <p className="text-slate-400 text-sm">Track members, visitors, and families with detailed profiles and group management</p>
                        </div>

                        <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center mx-auto mb-4">
                                <Zap className="w-7 h-7 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Campaign Builder</h3>
                            <p className="text-slate-400 text-sm">5-step wizard to create and schedule voice or SMS campaigns with audience targeting</p>
                        </div>

                        <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-7 h-7 text-amber-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Secure & Private</h3>
                            <p className="text-slate-400 text-sm">Enterprise-grade security with row-level access control and encrypted data storage</p>
                        </div>

                        <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-500/5 flex items-center justify-center mx-auto mb-4">
                                <Headphones className="w-7 h-7 text-pink-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Escalation Alerts</h3>
                            <p className="text-slate-400 text-sm">Automatic flagging of urgent pastoral care needs from call responses and sentiment</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQs */}
            <section className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 max-w-3xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                        <p className="text-slate-400 text-lg">Everything you need to know about ChurchComm</p>
                    </div>

                    <div className="space-y-4">
                        {FAQS.map((faq, idx) => (
                            <div
                                key={idx}
                                className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <HelpCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                                        <span className="font-medium text-white">{faq.question}</span>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${expandedFaq === idx ? "rotate-90" : ""}`} />
                                </button>
                                {expandedFaq === idx && (
                                    <div className="px-6 pb-6 pl-[60px]">
                                        <p className="text-slate-400">{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-blue-900/30 -z-10" />
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to transform your outreach?</h2>
                    <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                        Join churches already using AI to build deeper connections with their community.
                    </p>
                    <Link to="/login">
                        <Button size="lg" className="h-14 px-10 text-lg bg-white text-slate-950 hover:bg-slate-200 rounded-full shadow-2xl shadow-purple-500/20 transition-all hover:scale-105">
                            Start Your Free Trial
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-white/10 bg-slate-950">
                <div className="container mx-auto px-6 text-center text-sm text-slate-500">
                    <p>© {new Date().getFullYear()} ChurchComm. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
