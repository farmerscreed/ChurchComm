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
    Zap,
    Shield,
    Headphones,
    ArrowRight,
    ChevronRight,
    HelpCircle,
    Menu,
    Cake,
    UserPlus,
    Brain,
    BarChart3,
    Clock,
    Heart,
    Target,
    Bell,
    Gift,
    TrendingUp,
    Star,
    ChevronDown,
    Wand2,
    CalendarCheck,
    FileText
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/ui/Logo";

// ═══════════════════════════════════════════
// PRICING TIERS — Grant-first module model
// ═══════════════════════════════════════════
interface PricingTier {
    id: string;
    name: string;
    tagline: string;
    monthlyPrice: number | null;
    annualPrice: number | null;
    grantAnchor: string;
    popular?: boolean;
    gradient: string;
    borderGlow: string;
    features: { text: string; included: boolean; highlight?: boolean }[];
    ctaText: string;
    lsVariantKey?: string;
}

const PRICING_TIERS: PricingTier[] = [
    {
        id: "free",
        name: "FREE",
        tagline: "Grant acquisition — check eligibility, scan your site, apply step by step",
        monthlyPrice: 0,
        annualPrice: 0,
        grantAnchor: "Find out if your church qualifies for $10,000/month in free Google Ads.",
        gradient: "from-slate-600 to-slate-800",
        borderGlow: "border-slate-500/30",
        features: [
            { text: "Eligibility checker", included: true, highlight: true },
            { text: "Website readiness scan", included: true, highlight: true },
            { text: "Google Verification Wizard", included: true },
            { text: "Step-by-step application guide", included: true },
            { text: "Application status tracker", included: true },
            { text: "GUARDIAN monitoring", included: false },
            { text: "AI voice calls & SMS", included: false },
        ],
        ctaText: "Sign Up Free",
    },
    {
        id: "attract",
        name: "ATTRACT",
        tagline: "AI-managed advertising — we research, create, and optimize your Google Ads campaigns, then GUARDIAN monitors 24/7",
        monthlyPrice: 199,
        annualPrice: 1990,
        grantAnchor: "Hands-free Google Ads. AdPilot creates and optimizes your campaigns automatically — protecting your $10,000/month grant.",
        popular: true,
        gradient: "from-purple-500 to-blue-600",
        borderGlow: "border-purple-500/50",
        lsVariantKey: "attract",
        features: [
            { text: "Everything in Free", included: true, highlight: true },
            { text: "AI campaign creation", included: true, highlight: true },
            { text: "Automated keyword research", included: true, highlight: true },
            { text: "Ad copy generation", included: true, highlight: true },
            { text: "Weekly performance optimization", included: true },
            { text: "GUARDIAN compliance dashboard", included: true },
            { text: "24/7 CTR monitoring", included: true },
            { text: "Auto keyword pausing", included: true },
            { text: "Suspension protection", included: true },
            { text: "Account health alerts", included: true },
            { text: "AI voice calls & SMS", included: false },
        ],
        ctaText: "Start Free Trial",
    },
    {
        id: "engage",
        name: "ENGAGE",
        tagline: "AI communication — voice calls, SMS, CRM, and automations for your church",
        monthlyPrice: 59,
        annualPrice: 590,
        grantAnchor: "Turn visitors into members. AI handles calls, texts, and follow-ups.",
        gradient: "from-cyan-500 to-blue-600",
        borderGlow: "border-cyan-500/30",
        lsVariantKey: "engage",
        features: [
            { text: "AI voice calls", included: true, highlight: true },
            { text: "SMS campaigns", included: true, highlight: true },
            { text: "Email outreach", included: true },
            { text: "People CRM & directory", included: true },
            { text: "Birthday & follow-up automation", included: true },
            { text: "Congregation management", included: true },
            { text: "Pastoral care alerts", included: true },
            { text: "GUARDIAN monitoring", included: false },
        ],
        ctaText: "Start Free Trial",
    },
    {
        id: "bundle",
        name: "FULL PLATFORM",
        tagline: "AI-managed ads + AI communication — the complete done-for-you church growth toolkit",
        monthlyPrice: 229,
        annualPrice: 2290,
        grantAnchor: "Get the grant, protect it, and grow your congregation — all in one.",
        gradient: "from-amber-500 to-orange-600",
        borderGlow: "border-amber-500/30",
        lsVariantKey: "bundle",
        features: [
            { text: "Everything in Free", included: true, highlight: true },
            { text: "Everything in ATTRACT", included: true, highlight: true },
            { text: "Everything in ENGAGE", included: true, highlight: true },
            { text: "Priority support", included: true },
            { text: "Saves $29/month vs. buying separately", included: true },
        ],
        ctaText: "Get Everything",
    },
];


// ═══════════════════════════════════════════
// VALUE SHOWCASE — what the AI actually does
// ═══════════════════════════════════════════
const VALUE_SHOWCASES = [
    {
        icon: Target,
        title: "Grant Eligibility Check",
        description: "Find out in 60 seconds if your church qualifies for $10,000/month in free Google Ads. Our checker scans your nonprofit status, website, and mission alignment.",
        impact: "Unlock $120K/year in free advertising",
        color: "from-emerald-500/20 to-emerald-500/5",
        iconColor: "text-emerald-400",
        borderColor: "border-emerald-500/20",
    },
    {
        icon: FileText,
        title: "Application Wizard",
        description: "Step-by-step guided application for Google Ad Grants. We walk you through verification, website readiness, and submission — no guesswork.",
        impact: "90% of churches qualify but don't know it",
        color: "from-teal-500/20 to-teal-500/5",
        iconColor: "text-teal-400",
        borderColor: "border-teal-500/20",
    },
    {
        icon: Shield,
        title: "GUARDIAN + AdPilot",
        description: "AI researches keywords, creates compliant campaigns, and writes ad copy for your church. Then GUARDIAN monitors 24/7, auto-pauses underperformers, and optimizes weekly.",
        impact: "AI-managed ads — protect $10K/month",
        color: "from-indigo-500/20 to-indigo-500/5",
        iconColor: "text-indigo-400",
        borderColor: "border-indigo-500/20",
    },
    {
        icon: Cake,
        title: "Auto Birthday Calls",
        description: "Your AI calls every member on their birthday with a warm, personalized message. No staff time needed — just set it and the AI handles the rest, year-round.",
        impact: "Members feel remembered & valued",
        color: "from-pink-500/20 to-pink-500/5",
        iconColor: "text-pink-400",
        borderColor: "border-pink-500/20",
    },
    {
        icon: UserPlus,
        title: "First-Timer Follow-Up",
        description: "When someone visits for the first time, the AI automatically calls them within your preferred window — welcoming them, answering questions, and inviting them back.",
        impact: "Increase visitor retention by up to 40%",
        color: "from-green-500/20 to-green-500/5",
        iconColor: "text-green-400",
        borderColor: "border-green-500/20",
    },
    {
        icon: Target,
        title: "Lead Invitation Calls",
        description: "Prospects and leads get personalized AI calls inviting them to services, events, or small groups. Turn interest into attendance automatically.",
        impact: "Convert more leads into members",
        color: "from-blue-500/20 to-blue-500/5",
        iconColor: "text-blue-400",
        borderColor: "border-blue-500/20",
    },
    {
        icon: Wand2,
        title: "AI Script Builder",
        description: "Tell the AI what you want to say, and it writes a complete, natural-sounding call script for you. Choose tone, duration, and voice — done in seconds.",
        impact: "Save hours of script writing",
        color: "from-purple-500/20 to-purple-500/5",
        iconColor: "text-purple-400",
        borderColor: "border-purple-500/20",
    },
    {
        icon: Bell,
        title: "Escalation Alerts",
        description: "If the AI detects someone in crisis, grieving, or needing pastoral care during a call, it immediately flags it to your team via SMS and email.",
        impact: "Never miss a care opportunity",
        color: "from-red-500/20 to-red-500/5",
        iconColor: "text-red-400",
        borderColor: "border-red-500/20",
    },
    {
        icon: Zap,
        title: "Auto Workflows",
        description: "Set up triggers that fire automatically — when someone joins a group, reaches an anniversary, or meets any criteria you define. AI + SMS combined.",
        impact: "Fully automated engagement",
        color: "from-amber-500/20 to-amber-500/5",
        iconColor: "text-amber-400",
        borderColor: "border-amber-500/20",
    },
];

// ═══════════════════════════════════════════
// COST COMPARISON
// ═══════════════════════════════════════════
const COST_COMPARISONS = [
    { label: "Managed Google Ad Grant service", cost: "$8,650+/mo", icon: Target },
    { label: "Part-time outreach coordinator", cost: "$1,500+/mo", icon: Users },
    { label: "Traditional call center service", cost: "$500+/mo", icon: Phone },
    { label: "KeepFlock Full Platform (AI-managed)", cost: "$229/mo", icon: Sparkles, highlight: true },
];

// ═══════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════
const FAQS = [
    {
        question: "What is the Google Ad Grant?",
        answer: "Google awards eligible 501(c)(3) nonprofits up to $10,000/month in free Google Ads. Your church can use this to drive visitors to your website, promote events, and grow your congregation — at zero cost. KeepFlock's REACH module helps you check eligibility and apply."
    },
    {
        question: "What does GUARDIAN do?",
        answer: "GUARDIAN is the AI engine behind the ATTRACT module. First, AdPilot researches the best keywords for your church, creates compliant Google Ads campaigns, and writes your ad copy — completely hands-free. Then GUARDIAN monitors your account 24/7, automatically pauses underperforming keywords, optimizes campaigns weekly, and alerts you before any compliance issue can trigger a grant suspension. It's a full AI-managed advertising service."
    },
    {
        question: "Can I use KeepFlock without the Ad Grant?",
        answer: "Absolutely. The ENGAGE module (AI calling, SMS, CRM) works independently. Many churches start with ENGAGE for member communication and add REACH and ATTRACT later when they're ready to pursue the Ad Grant."
    },
    {
        question: "What does \"people reached\" mean?",
        answer: "\"People reached\" is the number of individual people your AI can call each month. For example, the Growth plan lets your AI personally call up to 75 different people — whether that's birthday calls, first-timer follow-ups, or campaign outreach. Each person counts once per month regardless of call duration."
    },
    {
        question: "How does the AI calling actually work?",
        answer: "Our AI uses advanced voice technology (VAPI) to make natural, conversational phone calls on behalf of your church. You create or generate scripts using our AI Script Builder, customize the voice, and the system handles everything — from greeting members by name to capturing their responses and flagging pastoral care needs."
    },
    {
        question: "What happens with birthday and first-timer calls?",
        answer: "Once configured, these run completely on autopilot. The AI checks for birthdays daily and calls members with a warm personalized greeting. For first-timers, it automatically follows up within your chosen timeframe (e.g., 24 hours after their first visit) to welcome them and invite them back."
    },
    {
        question: "What if I need to reach more people than my plan allows?",
        answer: "You can add additional people at just $1 per person per month. No surprise charges — you're always in control. Or simply upgrade to the next plan for a better per-person rate."
    },
    {
        question: "Is SMS included?",
        answer: "Yes! Every plan includes SMS messaging. Send personalized text campaigns, automated reminders, and two-way conversations. SMS is separate from AI calls and has its own generous allowance per plan."
    },
    {
        question: "Can I cancel or change plans anytime?",
        answer: "Absolutely. You can upgrade, downgrade, or cancel at any time. Changes take effect at your next billing cycle. No long-term contracts or cancellation fees."
    },
    {
        question: "Is there a free trial?",
        answer: "Yes! Every plan includes a 14-day free trial with full access to all features. No credit card required to start exploring."
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
    const [isAnnual, setIsAnnual] = useState(true);
    const [loading, setLoading] = useState<string | null>(null);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const { currentOrganization, user } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleSelectPlan = async (tier: PricingTier) => {
        // Free tier — just send to signup
        if (tier.id === 'free') {
            navigate(user ? '/dashboard' : '/login');
            return;
        }

        // LemonSqueezy variant IDs come from VITE_LS_VARIANT_* env vars
        const variantEnvKey = `VITE_LS_VARIANT_${(tier.lsVariantKey ?? tier.id).toUpperCase()}`;
        const variantId = (import.meta as unknown as Record<string, Record<string, string>>).env?.[variantEnvKey];
        if (variantId) {
            window.location.href = `https://keepflock.lemonsqueezy.com/checkout/buy/${variantId}`;
            return;
        }

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

            if (error) {
                // Extract actual error from edge function response
                let msg = "Checkout request failed";
                try {
                    if (error.context && typeof error.context.json === "function") {
                        const errBody = await error.context.json();
                        console.error("Edge function error body:", errBody);
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
            console.error("Checkout error:", error);
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

            {/* ═══ Navbar ═══ */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/">
                        <Logo />
                    </Link>
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Home</Link>
                        <Link to="/demo" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Demo</Link>
                        <span className="text-sm font-medium text-white">Pricing</span>
                    </div>
                    <div className="hidden md:flex items-center gap-4">
                        {user ? (
                            <>
                                <Link to="/dashboard">
                                    <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">Dashboard</Button>
                                </Link>
                                <span className="text-sm text-slate-400 hidden md:inline">{user.email}</span>
                            </>
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

                    {/* Mobile Menu Toggle */}
                    <Link to="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(!isMobileMenuOpen); }} className="md:hidden p-2 text-slate-300 hover:text-white">
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </Link>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-slate-950 border-b border-white/10 px-6 py-4 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-200">
                        <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                        <Link to="/demo" className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Demo</Link>
                        <span className="text-sm font-medium text-white py-2">Pricing</span>
                        <div className="h-px bg-white/10 my-2" />
                        {user ? (
                            <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                                <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white border-0">Go to Dashboard</Button>
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/5">Sign In</Button>
                                </Link>
                                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0">Get Started</Button>
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </nav>

            {/* ═══ HERO SECTION ═══ */}
            <section className="pt-32 pb-8 px-6">
                <div className="container mx-auto text-center max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-purple-300 mb-8">
                        <Heart className="w-4 h-4" />
                        <span>Trusted by churches nationwide</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                        Get the grant, protect it,{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                            grow your church
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-6 max-w-2xl mx-auto">
                        Unlock $10K/month in free Google Ads with REACH, let AdPilot create and optimize your campaigns automatically, guard your grant 24/7 with GUARDIAN, and let AI handle calls, SMS, and follow-ups.
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
                                Save 17%
                            </Badge>
                        )}
                    </div>
                </div>
            </section>

            {/* ═══ PRICING CARDS ═══ */}
            <section className="pb-24 px-6">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {PRICING_TIERS.map((tier) => (
                            <div
                                key={tier.id}
                                className={`relative rounded-2xl transition-all duration-300 ${tier.popular
                                    ? "scale-[1.03] z-10"
                                    : "hover:scale-[1.02]"
                                    }`}
                            >
                                {/* Glow effect for popular */}
                                {tier.popular && (
                                    <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-2xl blur opacity-50" />
                                )}

                                <div className={`relative h-full rounded-2xl border ${tier.popular
                                    ? "border-purple-500/50 bg-slate-900/90"
                                    : `${tier.borderGlow} bg-slate-900/50`
                                    } backdrop-blur-xl p-4 sm:p-6 flex flex-col`}>

                                    {tier.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 px-4 py-1">
                                                <Sparkles className="w-3 h-3 mr-1.5" />
                                                Most Popular
                                            </Badge>
                                        </div>
                                    )}

                                    <div className="mb-5">
                                        <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                                        <p className="text-slate-400 text-xs leading-relaxed">{tier.tagline}</p>
                                    </div>

                                    {/* Price */}
                                    <div className="mb-5">
                                        {tier.monthlyPrice !== null ? (
                                            <>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl sm:text-4xl font-bold text-white">
                                                        ${isAnnual ? Math.round(tier.annualPrice! / 12) : tier.monthlyPrice}
                                                    </span>
                                                    <span className="text-slate-500">/month</span>
                                                </div>
                                                {isAnnual && (
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        ${tier.annualPrice} billed annually
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-bold text-white">Custom</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* ★ Grant Value Anchor ★ */}
                                    <div className={`rounded-xl p-4 mb-5 bg-gradient-to-r ${tier.gradient} bg-opacity-10`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                                <TrendingUp className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold text-sm leading-snug">
                                                    {tier.grantAnchor}
                                                </p>
                                            </div>
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
                                                {tier.ctaText}
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bundle note */}
                    <p className="text-center text-sm text-slate-500 mt-8">
                        Bundle all three modules for <span className="text-slate-300 font-medium">$229/month</span> and save $29/month. Cancel anytime.
                    </p>
                </div>
            </section>

            {/* ═══ "WHAT YOUR AI DOES" — VALUE SHOWCASE ═══ */}
            <section className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="text-center mb-16">
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/20 mb-4">
                            <Brain className="w-3 h-3 mr-1.5" />
                            AI-Powered
                        </Badge>
                        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
                            Here&apos;s what your AI does{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                                for you
                            </span>
                        </h2>
                        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
                            Every plan includes powerful automation that runs 24/7 — so no one falls through the cracks.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {VALUE_SHOWCASES.map((item, idx) => (
                            <div
                                key={idx}
                                className={`group p-6 rounded-2xl bg-gradient-to-br ${item.color} border ${item.borderColor} hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5`}
                            >
                                <div className={`w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <item.icon className={`w-7 h-7 ${item.iconColor}`} />
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

            {/* ═══ COST COMPARISON ═══ */}
            <section className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 max-w-3xl">
                    <div className="text-center mb-16">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                            How much would this cost{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">without AI?</span>
                        </h2>
                        <p className="text-slate-400 text-base sm:text-lg">
                            Making 75 personal follow-up calls a month would normally require...
                        </p>
                    </div>

                    <div className="space-y-4">
                        {COST_COMPARISONS.map((item, idx) => (
                            <div
                                key={idx}
                                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl border transition-all ${item.highlight
                                    ? "bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 shadow-lg shadow-purple-500/10"
                                    : "bg-white/5 border-white/10"
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.highlight ? "bg-purple-500/20" : "bg-white/5"}`}>
                                        <item.icon className={`w-5 h-5 ${item.highlight ? "text-purple-400" : "text-slate-400"}`} />
                                    </div>
                                    <span className={`font-medium ${item.highlight ? "text-white" : "text-slate-300"}`}>{item.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {item.highlight && <Star className="w-4 h-4 text-yellow-400" />}
                                    <span className={`font-bold text-lg ${item.highlight
                                        ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400"
                                        : "text-slate-400 line-through"
                                        }`}>
                                        {item.cost}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-8">
                        <p className="text-slate-400 text-sm">
                            That&apos;s <span className="text-white font-bold">10x–20x cheaper</span> than hiring someone to make these calls manually.
                        </p>
                    </div>
                </div>
            </section>

            {/* ═══ HOW IT WORKS ═══ */}
            <section className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="text-center mb-16">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Up and running in 5 minutes</h2>
                        <p className="text-slate-400 text-base sm:text-lg">No training required. No complex setup.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                step: "1",
                                title: "Check Your Eligibility",
                                desc: "Answer 5 quick questions to see if your church qualifies for $10,000/month in free Google Ads. Most 501(c)(3) churches do.",
                                icon: Target,
                                color: "text-purple-400",
                            },
                            {
                                step: "2",
                                title: "AI Creates Your Campaigns",
                                desc: "Once approved, AdPilot automatically researches keywords, creates campaigns, and writes ad copy. GUARDIAN monitors 24/7 and optimizes weekly — completely hands-free.",
                                icon: Shield,
                                color: "text-blue-400",
                            },
                            {
                                step: "3",
                                title: "Grow Your Church",
                                desc: "AI handles calls, SMS, and follow-ups automatically. Birthday greetings, visitor welcome calls, and crisis alerts — so no one falls through the cracks.",
                                icon: Phone,
                                color: "text-cyan-400",
                            },
                        ].map((item, idx) => (
                            <div key={idx} className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 relative">
                                    <item.icon className={`w-7 h-7 ${item.color}`} />
                                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                        {item.step}
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ EVERYTHING INCLUDED ═══ */}
            <section className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="text-center mb-16">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Features across the platform</h2>
                        <p className="text-slate-400 text-base sm:text-lg">From grant acquisition to congregation engagement</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: Users, label: "People CRM", desc: "Full member directory" },
                            { icon: MessageSquare, label: "SMS Campaigns", desc: "Bulk & 1:1 texting" },
                            { icon: BarChart3, label: "Analytics", desc: "Real-time dashboard" },
                            { icon: Shield, label: "Security", desc: "Enterprise-grade" },
                            { icon: CalendarCheck, label: "Scheduling", desc: "Schedule campaigns" },
                            { icon: Gift, label: "Birthdays", desc: "Auto-tracked" },
                            { icon: Headphones, label: "Support", desc: "Email & priority" },
                            { icon: Brain, label: "AI Memory", desc: "Per-member context" },
                        ].map((item, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center hover:border-white/20 transition-colors">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mx-auto mb-2">
                                    <item.icon className="w-5 h-5 text-purple-400" />
                                </div>
                                <p className="text-sm font-medium text-white">{item.label}</p>
                                <p className="text-xs text-slate-500">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FAQs ═══ */}
            <section className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 max-w-3xl">
                    <div className="text-center mb-16">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                        <p className="text-slate-400 text-base sm:text-lg">Everything you need to know about KeepFlock</p>
                    </div>

                    <div className="space-y-3">
                        {FAQS.map((faq, idx) => (
                            <div
                                key={idx}
                                className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
                            >
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
                                    <div className="px-5 pb-5 pl-[56px]">
                                        <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FINAL CTA ═══ */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-blue-900/30 -z-10" />
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6">
                        Ready to grow your church with $10K/month in free advertising?
                    </h2>
                    <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-4 max-w-2xl mx-auto">
                        Start with our free eligibility check. No credit card required.
                    </p>
                    <p className="text-sm text-slate-500 mb-10 max-w-lg mx-auto">
                        From grant acquisition to AI-managed campaigns to automated engagement — KeepFlock is the complete church growth platform.
                    </p>
                    <Link to="/login">
                        <Button size="lg" className="h-12 sm:h-14 px-6 sm:px-10 text-base sm:text-lg bg-white text-slate-950 hover:bg-slate-200 rounded-full shadow-2xl shadow-purple-500/20 transition-all hover:scale-105">
                            Start Your Free Trial
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="py-8 border-t border-white/10 bg-slate-950">
                <div className="container mx-auto px-6 text-center text-sm text-slate-500">
                    <p>© {new Date().getFullYear()} KeepFlock by LawOne Cloud LLC. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
