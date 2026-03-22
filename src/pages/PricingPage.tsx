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
    ArrowRight,
    HelpCircle,
    Menu,
    Brain,
    Target,
    Bell,
    TrendingUp,
    ChevronDown,
    Eye,
    Search,
    Crown,
    Cake,
    UserPlus,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/ui/Logo";

// ═══════════════════════════════════════════
// MODULE PRICING — KeepFlock Empire
// ═══════════════════════════════════════════
interface ModuleTier {
    id: string;
    name: string;
    tagline: string;
    monthlyPrice: number;
    annualPrice: number;
    popular?: boolean;
    gradient: string;
    borderGlow: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    highlight: string;
    features: { text: string; included: boolean; highlight?: boolean }[];
    ctaText: string;
}

const MODULE_TIERS: ModuleTier[] = [
    {
        id: "engage",
        name: "ENGAGE",
        tagline: "AI communication for your church — calls, SMS, automations, pastoral alerts",
        monthlyPrice: 59,
        annualPrice: 590,
        gradient: "from-purple-500 to-indigo-600",
        borderGlow: "border-purple-500/30",
        icon: Phone,
        iconColor: "text-purple-400",
        highlight: "~65 person calls/month",
        features: [
            { text: "~65 AI person calls per month", included: true, highlight: true },
            { text: "Unlimited SMS campaigns", included: true, highlight: true },
            { text: "Smart automations & triggers", included: true },
            { text: "AI Memory per member", included: true },
            { text: "Pastoral care alerts", included: true },
            { text: "People CRM & directory", included: true },
            { text: "AI Script Builder", included: true },
            { text: "Real-time analytics", included: true },
            { text: "Birthday & follow-up calls", included: true },
            { text: "Escalation detection", included: true },
        ],
        ctaText: "Start Free Trial",
    },
    {
        id: "reach",
        name: "REACH",
        tagline: "Get the $10,000/month Google Ad Grant for your church",
        monthlyPrice: 49,
        annualPrice: 490,
        gradient: "from-blue-500 to-cyan-600",
        borderGlow: "border-blue-500/30",
        icon: Target,
        iconColor: "text-blue-400",
        highlight: "$10K/mo in free Google Ads",
        features: [
            { text: "Church eligibility checker", included: true, highlight: true },
            { text: "Domain preflight scanner", included: true, highlight: true },
            { text: "Google for Nonprofits wizard", included: true },
            { text: "Campaign setup assistant", included: true },
            { text: "Grant status tracker", included: true },
            { text: "Ad Grant credential storage", included: true },
            { text: "Step-by-step application guide", included: true },
            { text: "Standalone — no ENGAGE required", included: true },
            { text: "Compliance monitoring", included: false },
            { text: "Auto-pause protection", included: false },
        ],
        ctaText: "Start Free Trial",
    },
    {
        id: "attract",
        name: "ATTRACT",
        tagline: "Keep your Google Ad Grant compliant and protected 24/7",
        monthlyPrice: 199,
        annualPrice: 1990,
        gradient: "from-green-500 to-emerald-600",
        borderGlow: "border-green-500/30",
        icon: Eye,
        iconColor: "text-green-400",
        highlight: "GUARDIAN compliance engine",
        features: [
            { text: "GUARDIAN compliance dashboard", included: true, highlight: true },
            { text: "Daily CTR monitoring", included: true, highlight: true },
            { text: "Auto-pause protection", included: true, highlight: true },
            { text: "Suspension alerts", included: true },
            { text: "Keyword quality management", included: true },
            { text: "Campaign performance reports", included: true },
            { text: "AI ad copy generator", included: true },
            { text: "Everything in REACH included", included: true },
            { text: "Real-time Telegram alerts", included: true },
            { text: "Manual sweep on demand", included: true },
        ],
        ctaText: "Start Free Trial",
    },
    {
        id: "empire",
        name: "EMPIRE",
        tagline: "Complete church growth platform — ENGAGE + REACH + ATTRACT in one",
        monthlyPrice: 249,
        annualPrice: 2490,
        popular: true,
        gradient: "from-amber-500 to-orange-600",
        borderGlow: "border-amber-500/50",
        icon: Crown,
        iconColor: "text-amber-400",
        highlight: "Save $58/mo vs individual",
        features: [
            { text: "Everything in ENGAGE", included: true, highlight: true },
            { text: "Everything in REACH", included: true, highlight: true },
            { text: "Everything in ATTRACT", included: true, highlight: true },
            { text: "~65 AI person calls per month", included: true },
            { text: "Unlimited SMS campaigns", included: true },
            { text: "GUARDIAN compliance engine", included: true },
            { text: "Complete church growth platform", included: true },
            { text: "Priority support", included: true },
            { text: "One subscription, one login", included: true },
            { text: "Best value — save $58/month", included: true },
        ],
        ctaText: "Start Free Trial",
    },
];

// ═══════════════════════════════════════════
// VALUE SHOWCASES
// ═══════════════════════════════════════════
const VALUE_SHOWCASES = [
    {
        icon: Cake,
        title: "Auto Birthday Calls",
        description: "Your AI calls every member on their birthday with a warm, personalized message.",
        impact: "Members feel remembered",
        color: "from-pink-500/20 to-pink-500/5",
        iconColor: "text-pink-400",
        borderColor: "border-pink-500/20",
        module: "ENGAGE",
    },
    {
        icon: Target,
        title: "Google Ad Grant Acquisition",
        description: "Step-by-step wizard to get your church $10,000/month in free Google advertising.",
        impact: "$10K/mo in free ads",
        color: "from-blue-500/20 to-blue-500/5",
        iconColor: "text-blue-400",
        borderColor: "border-blue-500/20",
        module: "REACH",
    },
    {
        icon: Eye,
        title: "GUARDIAN Compliance",
        description: "24/7 monitoring keeps your Ad Grant compliant. Auto-pauses bad campaigns before Google does.",
        impact: "Never lose your grant",
        color: "from-green-500/20 to-green-500/5",
        iconColor: "text-green-400",
        borderColor: "border-green-500/20",
        module: "ATTRACT",
    },
    {
        icon: UserPlus,
        title: "First-Timer Follow-Up",
        description: "AI automatically calls first-time visitors within your chosen window — welcoming them back.",
        impact: "40% better retention",
        color: "from-emerald-500/20 to-emerald-500/5",
        iconColor: "text-emerald-400",
        borderColor: "border-emerald-500/20",
        module: "ENGAGE",
    },
    {
        icon: Bell,
        title: "Escalation Alerts",
        description: "AI detects crisis or pastoral care needs during calls and instantly flags your team.",
        impact: "Never miss a care need",
        color: "from-red-500/20 to-red-500/5",
        iconColor: "text-red-400",
        borderColor: "border-red-500/20",
        module: "ENGAGE",
    },
    {
        icon: Search,
        title: "Domain Preflight Scanner",
        description: "Checks your website against all 10 Google requirements before you apply for the grant.",
        impact: "Apply with confidence",
        color: "from-cyan-500/20 to-cyan-500/5",
        iconColor: "text-cyan-400",
        borderColor: "border-cyan-500/20",
        module: "REACH",
    },
];

// ═══════════════════════════════════════════
// FAQS
// ═══════════════════════════════════════════
const FAQS = [
    {
        question: "What does \"person calls\" mean?",
        answer: "Person calls are the number of individual people your AI can call each month. ENGAGE includes approximately 65 person calls — whether that's birthday calls, first-timer follow-ups, or campaign outreach. Each person counts once per call."
    },
    {
        question: "Can I buy just one module?",
        answer: "Yes! Each module works independently. A church that only wants grant management can buy REACH without needing ENGAGE for communication. You can add or remove modules anytime."
    },
    {
        question: "What is the Google Ad Grant?",
        answer: "Google gives qualifying 501(c)(3) churches $10,000/month in free Google Search advertising — permanently. Most churches don't know it exists. REACH walks you through every step of qualifying and applying."
    },
    {
        question: "What does GUARDIAN do?",
        answer: "GUARDIAN is our compliance engine that monitors your Google Ad Grant account 24/7. It checks your click-through rate, keyword quality, and campaign performance. If anything risks your grant, it auto-pauses the campaign and alerts you."
    },
    {
        question: "Is there a free trial?",
        answer: "Yes! Every plan includes a 14-day free trial with full access to all features. No credit card required to start exploring."
    },
    {
        question: "What happens if I need more person calls?",
        answer: "The ENGAGE plan includes ~65 person calls. If you need more capacity, contact us for a custom arrangement."
    },
    {
        question: "Can I upgrade or downgrade anytime?",
        answer: "Absolutely. You can add modules, remove them, or switch to EMPIRE anytime. Changes are prorated automatically."
    },
    {
        question: "What about data security?",
        answer: "We use enterprise-grade security with row-level access control, encrypted data storage, and SOC-2 aligned practices. Your congregation's data is never shared or used to train AI models."
    }
];

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════
export default function PricingPage() {
    const [isAnnual, setIsAnnual] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const { currentOrganization, user } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleSelectPlan = async (tier: ModuleTier) => {
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
            const { data, error } = await supabase.functions.invoke("ls-checkout", {
                body: {
                    module: tier.id,
                    billing_cycle: isAnnual ? "annual" : "monthly",
                    organization_id: currentOrganization.id,
                },
            });

            if (error) {
                let msg = "Checkout request failed";
                try {
                    if (error.context && typeof error.context.json === "function") {
                        const errBody = await error.context.json();
                        msg = errBody.error || msg;
                    }
                } catch {
                    msg = error.message || msg;
                }
                throw new Error(msg);
            }

            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data?.error || "No checkout URL returned");
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
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-500/15 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[150px]" />
                <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-amber-500/10 rounded-full blur-[100px]" />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/"><Logo /></Link>
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Home</Link>
                        <Link to="/demo" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Demo</Link>
                        <span className="text-sm font-medium text-white">Pricing</span>
                    </div>
                    <div className="hidden md:flex items-center gap-4">
                        {user ? (
                            <Link to="/dashboard">
                                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">Dashboard</Button>
                            </Link>
                        ) : (
                            <>
                                <Link to="/login">
                                    <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">Sign In</Button>
                                </Link>
                                <Link to="/login">
                                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0">Get Started</Button>
                                </Link>
                            </>
                        )}
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-slate-300 hover:text-white">
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-slate-950 border-b border-white/10 px-6 py-4 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-200">
                        <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white py-2" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                        <Link to="/demo" className="text-sm font-medium text-slate-300 hover:text-white py-2" onClick={() => setIsMobileMenuOpen(false)}>Demo</Link>
                        <div className="h-px bg-white/10 my-2" />
                        <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">Get Started</Button>
                        </Link>
                    </div>
                )}
            </nav>

            {/* Hero */}
            <section className="pt-32 pb-8 px-6">
                <div className="container mx-auto text-center max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-amber-300 mb-8">
                        <Crown className="w-4 h-4" />
                        <span>Build your church growth stack</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                        One platform.{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-amber-400">
                            Three powerful modules.
                        </span>
                    </h1>

                    <p className="text-xl text-slate-400 mb-6 max-w-2xl mx-auto">
                        AI communication, Google Ad Grant acquisition, and grant compliance monitoring —
                        buy what you need, add more when you're ready.
                    </p>

                    <p className="text-sm text-slate-500 mb-12">
                        14-day free trial · No credit card required · Cancel anytime
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 mb-8">
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
                                Save ~17%
                            </Badge>
                        )}
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-24 px-6">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {MODULE_TIERS.map((tier) => (
                            <div
                                key={tier.id}
                                className={`relative rounded-2xl transition-all duration-300 ${tier.popular ? "scale-[1.03] z-10" : "hover:scale-[1.02]"}`}
                            >
                                {tier.popular && (
                                    <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl blur opacity-50" />
                                )}

                                <div className={`relative h-full rounded-2xl border ${tier.popular ? "border-amber-500/50 bg-slate-900/90" : `${tier.borderGlow} bg-slate-900/50`} backdrop-blur-xl p-6 flex flex-col`}>
                                    {tier.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <Badge className="bg-gradient-to-r from-amber-600 to-orange-600 text-white border-0 px-4 py-1">
                                                <Crown className="w-3 h-3 mr-1.5" />
                                                Best Value
                                            </Badge>
                                        </div>
                                    )}

                                    <div className="mb-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${tier.gradient} flex items-center justify-center`}>
                                                <tier.icon className="w-4 h-4 text-white" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                                        </div>
                                        <p className="text-slate-400 text-xs leading-relaxed">{tier.tagline}</p>
                                    </div>

                                    {/* Price */}
                                    <div className="mb-5">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-bold text-white">
                                                ${isAnnual ? Math.round(tier.annualPrice / 12) : tier.monthlyPrice}
                                            </span>
                                            <span className="text-slate-500">/month</span>
                                        </div>
                                        {isAnnual && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                ${tier.annualPrice} billed annually
                                            </p>
                                        )}
                                    </div>

                                    {/* Key Value Highlight */}
                                    <div className={`rounded-xl p-3 mb-5 bg-gradient-to-r ${tier.gradient} bg-opacity-10`}>
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-white" />
                                            <span className="text-white font-medium text-sm">{tier.highlight}</span>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-2.5 flex-1 mb-6">
                                        {tier.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2.5">
                                                {feature.included ? (
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${feature.highlight ? "bg-green-500/20" : "bg-green-500/10"}`}>
                                                        <Check className={`w-3 h-3 ${feature.highlight ? "text-green-400" : "text-green-500/70"}`} />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <X className="w-3 h-3 text-slate-600" />
                                                    </div>
                                                )}
                                                <span className={`text-sm ${feature.included ? (feature.highlight ? "text-white font-medium" : "text-slate-300") : "text-slate-600"}`}>
                                                    {feature.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA */}
                                    <Button
                                        onClick={() => handleSelectPlan(tier)}
                                        disabled={loading !== null}
                                        className={`w-full h-12 text-base font-semibold transition-all ${tier.popular
                                            ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25"
                                            : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                                        }`}
                                    >
                                        {loading === tier.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                {tier.ctaText}
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

            {/* Value Showcases */}
            <section className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="text-center mb-16">
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/20 mb-4">
                            <Brain className="w-3 h-3 mr-1.5" />
                            Platform Capabilities
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            What each module{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">does for you</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {VALUE_SHOWCASES.map((item, idx) => (
                            <div
                                key={idx}
                                className={`group p-6 rounded-2xl bg-gradient-to-br ${item.color} border ${item.borderColor} hover:border-white/20 transition-all`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                                    </div>
                                    <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
                                        {item.module}
                                    </Badge>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                                <p className="text-slate-400 text-sm mb-4 leading-relaxed">{item.description}</p>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                    <span className="text-green-400 text-xs font-medium">{item.impact}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQs */}
            <section className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 max-w-3xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                        <p className="text-slate-400 text-lg">Everything you need to know about KeepFlock</p>
                    </div>

                    <div className="space-y-3">
                        {FAQS.map((faq, idx) => (
                            <div key={idx} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                                <button
                                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                                    className="w-full flex items-center justify-between p-5 text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <HelpCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                                        <span className="font-medium text-white text-sm">{faq.question}</span>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${expandedFaq === idx ? "rotate-180" : ""}`} />
                                </button>
                                {expandedFaq === idx && (
                                    <div className="px-5 pb-5 pl-14">
                                        <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 text-center max-w-3xl">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Ready to grow your church?
                    </h2>
                    <p className="text-slate-400 text-lg mb-8">
                        Join hundreds of churches using KeepFlock to communicate better, get free Google Ads, and stay compliant.
                    </p>
                    <Link to="/login">
                        <Button size="lg" className="h-14 px-10 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-full shadow-lg">
                            Start Your Free 14-Day Trial
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                    <p className="text-sm text-slate-500 mt-4">No credit card required</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 py-8">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Logo />
                    </div>
                    <div className="flex items-center gap-6 text-slate-500 text-sm">
                        <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <a href="mailto:support@keepflock.com" className="hover:text-white transition-colors">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
