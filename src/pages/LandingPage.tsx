import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowRight,
    CheckCircle,
    ChevronRight,
    Clock,
    Globe,
    Phone,
    Play,
    Quote,
    Shield,
    Sparkles,
    Star,
    TrendingUp,
    Users,
    Zap,
    Bell,
    BarChart3,
    Award,
    Menu,
    X
} from "lucide-react";
import { Link } from "react-router-dom";
import { Logo, LogoIcon } from "@/components/ui/Logo";
import { PublicEligibilityChecker } from "@/components/reach/PublicEligibilityChecker";
import { DemoCallForm } from "@/components/demo/DemoCallForm";
import { useAuthStore } from "@/stores/authStore";

export default function LandingPage() {
    const { user } = useAuthStore();
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [leadCaptured, setLeadCaptured] = useState(false);
    const [capturedEmail, setCapturedEmail] = useState("");
    const [eligibilityResult, setEligibilityResult] = useState<Record<string, unknown> | undefined>(undefined);

    // Auto-rotate testimonials
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    function handleLeadCaptured(data: { email: string; qualified: boolean }) {
        setCapturedEmail(data.email);
        setEligibilityResult({ qualified: data.qualified });
        setLeadCaptured(true);
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden relative selection:bg-purple-500/30">
            {/* Animated Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-500/20 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute top-[30%] right-[5%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
                <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] bg-pink-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1.5s" }} />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                1. NAVBAR
            ═══════════════════════════════════════════════════════════════════ */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/">
                        <Logo />
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
                        <a href="#how-it-works" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">How It Works</a>
                        <a href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</a>
                        <Link to="/demo" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Demo</Link>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <>
                                <Link to="/dashboard">
                                    <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">Dashboard</Button>
                                </Link>
                                <span className="text-sm text-slate-400">{user.email}</span>
                            </>
                        ) : (
                            <>
                                <Link to="/login">
                                    <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
                                        Sign In
                                    </Button>
                                </Link>
                                <a href="#eligibility">
                                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all">
                                        Start Free
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </a>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-slate-300 hover:text-white">
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-slate-950 border-b border-white/10 px-6 py-4 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-200">
                        <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
                        <a href="#how-it-works" className="text-sm font-medium text-slate-400 hover:text-white transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>How It Works</a>
                        <a href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Pricing</a>
                        <Link to="/demo" className="text-sm font-medium text-slate-400 hover:text-white transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Demo</Link>
                        <div className="h-px bg-white/10 my-2" />
                        {user ? (
                            <>
                                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/5">Dashboard</Button>
                                </Link>
                                <span className="text-sm text-slate-400 px-4 py-1">{user.email}</span>
                            </>
                        ) : (
                            <>
                                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/5">
                                        Sign In
                                    </Button>
                                </Link>
                                <a href="#eligibility" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0">
                                        Start Free
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </a>
                            </>
                        )}
                    </div>
                )}
            </nav>

            {/* ═══════════════════════════════════════════════════════════════════
                2. HERO SECTION
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="relative pt-28 pb-16 md:pt-40 md:pb-24 px-6">
                <div className="container mx-auto max-w-6xl">
                    {/* Announcement Banner */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 text-xs">NEW</Badge>
                            <span className="text-sm text-slate-300">AdPilot: AI-managed Google Ads campaigns are live</span>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        </div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                            Your church qualifies for{" "}
                            <span className="relative">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                                    $10,000/month
                                </span>
                                <Sparkles className="absolute -top-2 -right-6 sm:-right-8 w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 animate-pulse" />
                            </span>
                            {" "}in free Google Ads
                        </h1>

                        <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                            KeepFlock qualifies your church for Google Ads, then AI creates, manages, and optimizes your campaigns hands-free — so you can focus on ministry.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                            <a href="#eligibility">
                                <Button size="lg" className="h-12 sm:h-14 px-5 sm:px-8 text-sm sm:text-lg bg-white text-slate-950 hover:bg-slate-100 rounded-full shadow-2xl shadow-white/20 hover:shadow-white/30 transition-all hover:scale-105 group">
                                    Check If You Qualify — Free
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </a>
                            <a href="#how-it-works">
                                <Button size="lg" variant="outline" className="h-12 sm:h-14 px-5 sm:px-8 text-sm sm:text-lg border-white/20 text-white hover:bg-white/10 rounded-full group">
                                    <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                                    See How It Works
                                </Button>
                            </a>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-slate-500 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>No credit card required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>Setup in 5 minutes</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>Managed services charge $8,000+/mo — KeepFlock from $59/mo</span>
                            </div>
                        </div>
                    </div>

                    {/* Hero Dashboard Preview */}
                    <div className="mt-16 relative animate-in fade-in zoom-in-95 duration-1000 delay-500">
                        {/* Glow Effects */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-cyan-500/30 rounded-3xl blur-2xl opacity-50" />
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-2xl opacity-20" />

                        {/* Browser Frame */}
                        <div className="relative rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl overflow-hidden">
                            {/* Browser Header */}
                            <div className="h-12 border-b border-white/10 flex items-center px-4 gap-3 bg-slate-900/50">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                                </div>
                                <div className="flex-1 flex justify-center">
                                    <div className="px-4 py-1.5 bg-white/5 rounded-lg text-xs text-slate-500 flex items-center gap-2 max-w-xs w-full justify-center">
                                        <Shield className="w-3 h-3 text-green-500" />
                                        <span>app.keepflock.com</span>
                                    </div>
                                </div>
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                                    Live
                                </Badge>
                            </div>

                            {/* Dashboard Content */}
                            <div className="p-6 md:p-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-white">Good morning, Pastor</h2>
                                        <p className="text-slate-500 text-xs sm:text-sm">Your Google Ad Grant is active. AdPilot managing 3 campaigns. Next GUARDIAN sweep in 4 hours.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="border-white/10 text-slate-400 bg-white/5">
                                            <Bell className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                                            <Shield className="w-4 h-4 mr-1" />
                                            Run Sweep
                                        </Button>
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Shield className="w-4 h-4 text-green-400" />
                                            <span className="text-xs text-green-300">Grant Status</span>
                                        </div>
                                        <p className="text-2xl font-bold text-green-400">Active</p>
                                        <p className="text-xs text-slate-500">Since Jan 2026</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-4 h-4 text-purple-400" />
                                            <span className="text-xs text-purple-300">Monthly Budget</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">$10,000</p>
                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                            $6,847 used this month
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Globe className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs text-blue-300">Clicks This Month</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">2,847</p>
                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> +18% vs last month
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Award className="w-4 h-4 text-amber-400" />
                                            <span className="text-xs text-amber-300">Compliance Score</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">98%</p>
                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> All rules passing
                                        </p>
                                    </div>
                                </div>

                                {/* Grant Monitoring Feed */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-white flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-purple-400" />
                                                GUARDIAN Activity
                                            </h3>
                                            <span className="text-xs text-slate-500">Last sweep: 2h ago</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-white">CTR check passed — 4.2%</p>
                                                    <p className="text-xs text-slate-500">Above 5% threshold required by Google</p>
                                                </div>
                                                <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">Pass</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                    <Zap className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-white">Auto-paused 3 low-CTR keywords</p>
                                                    <p className="text-xs text-slate-500">Prevented compliance violation</p>
                                                </div>
                                                <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">Auto-fix</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-white flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4 text-cyan-400" />
                                                Top Campaigns
                                            </h3>
                                            <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">All compliant</Badge>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                                                <div className="flex-1">
                                                    <p className="text-sm text-white">"Churches near me"</p>
                                                    <p className="text-xs text-slate-500">1,204 clicks · 5.8% CTR</p>
                                                </div>
                                                <span className="text-xs text-green-400 font-medium">$3,412 value</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                                                <div className="flex-1">
                                                    <p className="text-sm text-white">"Sunday service times"</p>
                                                    <p className="text-xs text-slate-500">847 clicks · 4.9% CTR</p>
                                                </div>
                                                <span className="text-xs text-green-400 font-medium">$1,890 value</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                                                <div className="flex-1">
                                                    <p className="text-sm text-white">"Youth group activities"</p>
                                                    <p className="text-xs text-slate-500">796 clicks · 3.7% CTR</p>
                                                </div>
                                                <span className="text-xs text-green-400 font-medium">$1,545 value</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Elements */}
                        <div className="absolute -left-4 top-1/4 p-4 rounded-xl bg-slate-900/90 border border-white/10 shadow-xl backdrop-blur-sm animate-bounce hidden lg:block" style={{ animationDuration: "3s" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/30 to-cyan-500/30 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">GUARDIAN</p>
                                    <p className="text-sm font-medium text-white">Compliance: 98%</p>
                                </div>
                            </div>
                        </div>

                        <div className="absolute -right-4 bottom-1/4 p-4 rounded-xl bg-slate-900/90 border border-white/10 shadow-xl backdrop-blur-sm animate-bounce hidden lg:block" style={{ animationDuration: "4s", animationDelay: "1s" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">This month</p>
                                    <p className="text-sm font-medium text-white">$6,847 in free ads</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                3. THREE PILLARS SECTION
            ═══════════════════════════════════════════════════════════════════ */}
            <section id="features" className="py-24 px-6 bg-gradient-to-b from-slate-950/80 to-slate-900/60">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 mb-6">Three Pillars, One Platform</Badge>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                            Everything your church needs to{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                                grow
                            </span>
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                            Get found on Google. Protect your grant. Keep your congregation connected. Three modules that work independently or together.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Pillar 1 — REACH (Free) */}
                        <div className="relative flex flex-col gap-6 p-5 sm:p-6 md:p-8 rounded-2xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-sm">
                            <Badge className="absolute -top-3 left-6 bg-green-600 text-white border-0">FREE</Badge>
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Get Found</h3>
                                <p className="text-purple-300 text-sm font-medium mb-3">REACH — Free</p>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                    Get the Google Ad Grant. Check if you qualify, scan your website, and follow our step-by-step application guide. Most churches are approved in under 2 weeks.
                                </p>
                            </div>
                            <ul className="space-y-3 mt-auto">
                                {["Eligibility checker", "Website readiness scan", "Application wizard", "Status tracker"].map((f, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0" />{f}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Pillar 2 — ATTRACT ($199/mo) */}
                        <div className="relative flex flex-col gap-6 p-5 sm:p-6 md:p-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
                            <Badge className="absolute -top-3 left-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">MOST POPULAR</Badge>
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">AI-Managed Ads</h3>
                                <p className="text-blue-300 text-sm font-medium mb-3">ATTRACT — $199/mo</p>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                    Done-for-you Google Ads. AdPilot researches the best keywords for your church, creates compliant campaigns, writes your ad copy, and optimizes performance weekly. GUARDIAN monitors 24/7 to protect your grant.
                                </p>
                            </div>
                            <ul className="space-y-3 mt-auto">
                                {["AI campaign creation", "Automated keyword research", "Ad copy generation", "Weekly optimization", "24/7 GUARDIAN monitoring"].map((f, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />{f}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Pillar 3 — ENGAGE ($59/mo) */}
                        <div className="relative flex flex-col gap-6 p-5 sm:p-6 md:p-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 backdrop-blur-sm">
                            <Badge className="absolute -top-3 left-6 bg-cyan-600 text-white border-0">$59/mo</Badge>
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                                <Phone className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Keep Connected</h3>
                                <p className="text-cyan-300 text-sm font-medium mb-3">ENGAGE — $59/mo</p>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                    AI-powered communication for your congregation. Automated birthday calls, first-timer follow-ups, SMS campaigns, and pastoral care alerts — your AI handles the outreach while your team focuses on ministry.
                                </p>
                            </div>
                            <ul className="space-y-3 mt-auto">
                                {["AI voice calls", "SMS campaigns", "Birthday automations", "Pastoral alerts"].map((f, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0" />{f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                4. EMBEDDED ELIGIBILITY CHECKER
            ═══════════════════════════════════════════════════════════════════ */}
            <section id="eligibility" className="py-24 px-6 bg-gradient-to-b from-slate-900/60 to-slate-950">
                <div className="container mx-auto max-w-4xl">
                    <div className="text-center mb-12">
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 mb-6">Free Eligibility Check</Badge>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                            Check Your Eligibility in{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
                                60 Seconds
                            </span>
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                            Find out if your church qualifies for $10,000/month in free Google Ads. No signup required.
                        </p>
                    </div>

                    <PublicEligibilityChecker onLeadCaptured={handleLeadCaptured} />

                    {leadCaptured && (
                        <div className="mt-12">
                            <DemoCallForm email={capturedEmail} eligibilityResult={eligibilityResult} />
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                5. GUARDIAN DEEP DIVE SECTION
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-gradient-to-b from-slate-950 to-slate-900/50">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 mb-6">GUARDIAN</Badge>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                            Meet GUARDIAN — Your{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                                AI Campaign Manager
                            </span>
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">
                            73% of churches lose their Ad Grant within the first year. GUARDIAN doesn't just monitor — AdPilot creates and optimizes your campaigns, then GUARDIAN protects them around the clock.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        {/* Dashboard Mockup */}
                        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                            {/* CTR Gauge */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-white flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-blue-400" />
                                        Click-Through Rate
                                    </h4>
                                    <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">Healthy</Badge>
                                </div>
                                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-3 bg-gradient-to-r from-blue-500 to-green-500 rounded-full" style={{ width: "72%" }} />
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-slate-500">
                                    <span>0%</span>
                                    <span className="text-green-400 font-medium">7.2% (min: 5%)</span>
                                    <span>15%</span>
                                </div>
                            </div>

                            {/* Compliance Status */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                    <p className="text-xs text-green-300 mb-1">Compliance</p>
                                    <p className="text-lg font-bold text-green-400">All Clear</p>
                                    <p className="text-xs text-slate-500">12 rules passing</p>
                                </div>
                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-xs text-blue-300 mb-1">Keywords</p>
                                    <p className="text-lg font-bold text-white">847 Active</p>
                                    <p className="text-xs text-slate-500">3 paused today</p>
                                </div>
                            </div>

                            {/* Budget Utilization */}
                            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-purple-300">Budget Utilization</p>
                                    <p className="text-xs text-purple-400 font-medium">$6,847 / $10,000</p>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: "68%" }} />
                                </div>
                            </div>
                        </div>

                        {/* Feature List */}
                        <div className="space-y-6">
                            {[
                                {
                                    icon: Sparkles,
                                    color: "text-purple-400",
                                    bg: "bg-purple-500/20",
                                    title: "AI Campaign Creation",
                                    desc: "AdPilot researches the best keywords for your church, writes compelling ad copy, and builds compliant campaigns — no Google Ads experience needed."
                                },
                                {
                                    icon: TrendingUp,
                                    color: "text-green-400",
                                    bg: "bg-green-500/20",
                                    title: "Weekly Optimization",
                                    desc: "Every week, AdPilot analyzes performance, pauses underperforming keywords, adds new opportunities, and rewrites ad copy to maximize your reach."
                                },
                                {
                                    icon: Shield,
                                    color: "text-blue-400",
                                    bg: "bg-blue-500/20",
                                    title: "24/7 Compliance Monitoring",
                                    desc: "GUARDIAN scans your account around the clock, maintaining CTR above Google's 5% threshold and preventing the violations that get churches suspended."
                                },
                                {
                                    icon: Bell,
                                    color: "text-amber-400",
                                    bg: "bg-amber-500/20",
                                    title: "Instant Alerts",
                                    desc: "Critical issues that need human attention trigger immediate alerts so you can act before Google takes action."
                                }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                                        <item.icon className={`w-5 h-5 ${item.color}`} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-semibold mb-1">{item.title}</h4>
                                        <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                6. PROBLEM / SOLUTION SECTION
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="py-24 relative overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center mb-16">
                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 mb-6">The Problem</Badge>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                            Most churches are{" "}
                            <span className="text-red-400">invisible online</span>.
                            <br />
                            The ones that aren't? They're losing their grant.
                        </h2>
                    </div>

                    <div className="relative max-w-5xl mx-auto">
                        {/* Center Arrow */}
                        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-0 bottom-0 items-center justify-center">
                            <div className="w-px h-32 bg-gradient-to-b from-red-500/50 to-green-500/50" />
                            <div className="absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            {/* Before */}
                            <div className="p-8 rounded-2xl bg-red-500/5 border border-red-500/20">
                                <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Before KeepFlock
                                </h3>
                                <ul className="space-y-4">
                                    {[
                                        "Invisible on Google — no one can find you",
                                        "Losing grant to compliance violations",
                                        "First-time visitors forgotten after Sunday",
                                        "Staff burnout from manual outreach"
                                    ].map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-slate-400">
                                            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* After */}
                            <div className="p-8 rounded-2xl bg-green-500/5 border border-green-500/20">
                                <h3 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    With KeepFlock
                                </h3>
                                <ul className="space-y-4">
                                    {[
                                        "Found on Google — $10K/mo in free ads",
                                        "AI creates & optimizes campaigns for you",
                                        "Grant protected 24/7 by GUARDIAN",
                                        "AI handles outreach — your team focuses on ministry"
                                    ].map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-slate-300">
                                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                7. HOW IT WORKS
            ═══════════════════════════════════════════════════════════════════ */}
            <section id="how-it-works" className="py-24 bg-gradient-to-b from-transparent to-slate-900/50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 mb-6">How It Works</Badge>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                            Three steps to a{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                                thriving church
                            </span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            {
                                step: 1,
                                title: "Check & Apply",
                                module: "REACH — Free",
                                moduleColor: "text-purple-400",
                                description: "Answer 5 questions. If you qualify, we guide you through the entire Google Ad Grant application process.",
                                icon: TrendingUp,
                                gradient: "from-purple-500/20 to-purple-500/5"
                            },
                            {
                                step: 2,
                                title: "AI Creates & Manages",
                                module: "ATTRACT — $199/mo",
                                moduleColor: "text-blue-400",
                                description: "Connect your Google Ads account. AdPilot automatically creates campaigns, researches keywords, and writes ad copy. GUARDIAN monitors 24/7 and optimizes weekly.",
                                icon: Shield,
                                gradient: "from-blue-500/20 to-blue-500/5"
                            },
                            {
                                step: 3,
                                title: "Engage & Grow",
                                module: "ENGAGE — $59/mo",
                                moduleColor: "text-cyan-400",
                                description: "Import your members. AI handles birthday calls, first-timer follow-ups, and pastoral care automatically.",
                                icon: Phone,
                                gradient: "from-cyan-500/20 to-cyan-500/5"
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="relative">
                                {idx < 2 && (
                                    <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-purple-500/50 to-transparent" />
                                )}
                                <div className="text-center">
                                    <div className="relative inline-flex mb-6">
                                        <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${item.gradient} border border-white/10 flex items-center justify-center`}>
                                            <item.icon className="w-10 h-10 text-purple-400" />
                                        </div>
                                        <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold text-white">
                                            {item.step}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
                                    <p className={`text-sm font-medium ${item.moduleColor} mb-3`}>{item.module}</p>
                                    <p className="text-slate-400">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                8. AI DEMO CALL CTA
            ═══════════════════════════════════════════════════════════════════ */}
            {!leadCaptured && (
                <section className="py-24 px-6 bg-gradient-to-b from-slate-900/50 to-slate-950">
                    <div className="container mx-auto max-w-4xl">
                        <div className="text-center mb-12">
                            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 mb-6">Live Demo</Badge>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                                Want to hear how it works?{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                    Our AI will call you in 30 seconds.
                                </span>
                            </h2>
                            <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                                Experience the ENGAGE module firsthand. Our AI assistant will walk you through how KeepFlock helps your church grow.
                            </p>
                        </div>

                        <DemoCallForm />
                    </div>
                </section>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                9. PRICING PREVIEW
            ═══════════════════════════════════════════════════════════════════ */}
            <section id="pricing" className="py-24 bg-gradient-to-b from-slate-950 to-slate-900/30">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 mb-6">Pricing</Badge>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                            Simple,{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                                transparent
                            </span>
                            {" "}pricing
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                            Start free. Add modules as you grow. No long-term contracts.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                        {/* Free */}
                        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-1">FREE</h3>
                            <p className="text-3xl font-bold text-white mb-1">$0<span className="text-sm text-slate-500 font-normal">/mo</span></p>
                            <p className="text-slate-400 text-sm mb-6">Grant acquisition tools</p>
                            <ul className="space-y-2 mb-8 flex-1">
                                {["Eligibility checker", "Website scan", "Application guide", "Status tracker"].map((f, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/login" className="mt-auto">
                                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                                    Get Started Free
                                </Button>
                            </Link>
                        </div>

                        {/* ATTRACT */}
                        <div className="relative p-6 rounded-2xl border border-purple-500/30 bg-purple-500/5 backdrop-blur-sm flex flex-col">
                            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 text-xs">
                                Most Popular
                            </Badge>
                            <h3 className="text-lg font-bold text-white mb-1">ATTRACT</h3>
                            <p className="text-3xl font-bold text-white mb-1">$199<span className="text-sm text-slate-500 font-normal">/mo</span></p>
                            <p className="text-slate-400 text-sm mb-6">AI-managed advertising</p>
                            <ul className="space-y-2 mb-8 flex-1">
                                {["Everything in Free", "AI campaign creation", "Automated keyword research", "Ad copy generation", "Weekly optimization", "24/7 GUARDIAN monitoring"].map((f, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                        <CheckCircle className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />{f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/pricing" className="mt-auto">
                                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0">
                                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </div>

                        {/* ENGAGE */}
                        <div className="p-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 backdrop-blur-sm flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-1">ENGAGE</h3>
                            <p className="text-3xl font-bold text-white mb-1">$59<span className="text-sm text-slate-500 font-normal">/mo</span></p>
                            <p className="text-slate-400 text-sm mb-6">AI communication</p>
                            <ul className="space-y-2 mb-8 flex-1">
                                {["AI voice calls", "SMS campaigns", "Birthday automations", "Pastoral alerts", "People CRM"].map((f, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                        <CheckCircle className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />{f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/pricing" className="mt-auto">
                                <Button variant="outline" className="w-full border-cyan-500/30 text-white hover:bg-cyan-500/10">
                                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </div>

                        {/* Full Platform */}
                        <div className="p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-orange-500/5 backdrop-blur-sm flex flex-col">
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 mb-2 w-fit">Best Value</Badge>
                            <h3 className="text-lg font-bold text-white mb-1">Full Platform</h3>
                            <p className="text-3xl font-bold text-white mb-1">$229<span className="text-sm text-slate-500 font-normal">/mo</span></p>
                            <p className="text-amber-400 text-sm mb-6">Save $29/mo</p>
                            <ul className="space-y-2 mb-8 flex-1">
                                {["Everything in all plans", "REACH + ATTRACT + ENGAGE", "Priority support", "Bundle discount"].map((f, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                        <CheckCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />{f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/pricing" className="mt-auto">
                                <Button className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-0">
                                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* ROI Callout */}
                    <div className="max-w-3xl mx-auto mt-12 p-6 rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-500/5 to-cyan-500/5 text-center">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <TrendingUp className="w-6 h-6 text-green-400" />
                            <h3 className="text-xl font-bold text-white">The math is simple</h3>
                        </div>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 mb-2">
                            For every $1 you spend on KeepFlock ATTRACT, you protect $50 in free Google advertising.
                        </p>
                        <p className="text-base sm:text-lg text-slate-400">
                            That is a <span className="text-green-400 font-bold">51x return</span> on your investment. Every single month.
                        </p>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                10. SOCIAL PROOF STATS
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="py-20 border-y border-white/5 bg-gradient-to-b from-slate-950 to-slate-900/50">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto">
                        <div className="text-center">
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                                Launching 2026
                            </p>
                            <p className="text-slate-500 text-sm sm:text-base mt-2">Now in early access</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                                3 Modules
                            </p>
                            <p className="text-slate-500 text-sm sm:text-base mt-2">REACH + ATTRACT + ENGAGE</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-400">
                                $10K/month
                            </p>
                            <p className="text-slate-500 text-sm sm:text-base mt-2">Free Google Ads</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-amber-400">
                                From $59/mo
                            </p>
                            <p className="text-slate-500 text-sm sm:text-base mt-2">Starting price</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                11. TESTIMONIALS
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="py-24 bg-gradient-to-b from-slate-900/50 to-slate-950">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 mb-6">Early Adopter Feedback</Badge>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                            What our{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                                beta testers
                            </span>
                            {" "}are saying
                        </h2>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className="relative p-8 md:p-12 rounded-3xl bg-white/5 border border-white/10">
                            <Quote className="absolute top-6 left-6 w-12 h-12 text-purple-500/20" />

                            <div className="relative">
                                <p className="text-xl md:text-2xl text-slate-300 leading-relaxed mb-8">
                                    "{TESTIMONIALS[activeTestimonial].quote}"
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-xl font-bold text-white">
                                            {TESTIMONIALS[activeTestimonial].name.split(" ").map(n => n[0]).join("")}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{TESTIMONIALS[activeTestimonial].name}</p>
                                            <p className="text-sm text-slate-500">{TESTIMONIALS[activeTestimonial].role}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Dots */}
                            <div className="flex justify-center gap-2 mt-8">
                                {TESTIMONIALS.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveTestimonial(idx)}
                                        className={`w-2 h-2 rounded-full transition-all ${idx === activeTestimonial
                                            ? "w-8 bg-purple-500"
                                            : "bg-white/20 hover:bg-white/40"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                12. FAQ
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900/30">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 mb-6">FAQ</Badge>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                            Frequently asked{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                                questions
                            </span>
                        </h2>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-4">
                        {FAQ_ITEMS.map((item, idx) => (
                            <details key={idx} className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                                <summary className="flex items-center justify-between cursor-pointer list-none">
                                    <h3 className="text-lg font-semibold text-white pr-4">{item.question}</h3>
                                    <ChevronRight className="w-5 h-5 text-slate-500 group-open:rotate-90 transition-transform flex-shrink-0" />
                                </summary>
                                <p className="mt-4 text-slate-400 leading-relaxed">{item.answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                13. FINAL CTA
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-cyan-900/40 -z-10" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)] -z-10" />

                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 max-w-4xl mx-auto">
                        Ready to get your church{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                            $10,000/month
                        </span>
                        {" "}in free advertising?
                    </h2>

                    <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                        Most churches qualify. Find out in 60 seconds — completely free, no signup required.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                        <a href="#eligibility">
                            <Button size="lg" className="h-12 sm:h-16 px-6 sm:px-10 text-base sm:text-xl bg-white text-slate-950 hover:bg-slate-100 rounded-full shadow-2xl shadow-white/20 hover:shadow-white/30 transition-all hover:scale-105">
                                Check Your Eligibility — Free
                                <ArrowRight className="ml-2 w-5 sm:w-6 h-5 sm:h-6" />
                            </Button>
                        </a>
                        <a href="#eligibility">
                            <Button size="lg" variant="outline" className="h-12 sm:h-16 px-6 sm:px-10 text-base sm:text-xl border-white/20 text-white hover:bg-white/10 rounded-full">
                                Or talk to our AI
                                <Phone className="ml-2 w-5 h-5" />
                            </Button>
                        </a>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span>No credit card required</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span>Setup in 5 minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span>Cancel anytime</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                14. FOOTER
            ═══════════════════════════════════════════════════════════════════ */}
            <footer className="py-16 border-t border-white/10 bg-slate-950">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <LogoIcon className="w-9 h-9" />
                                <span className="text-xl font-bold text-white">KeepFlock</span>
                            </div>
                            <p className="text-slate-500 mb-6 max-w-sm">
                                The AI-managed church growth platform. Qualify for Google Ads, let AI create and optimize your campaigns, and keep every member connected.
                            </p>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-6">Product</h4>
                            <ul className="space-y-4 text-sm">
                                <li><a href="#features" className="text-slate-500 hover:text-purple-400 transition-colors">Features</a></li>
                                <li><Link to="/pricing" className="text-slate-500 hover:text-purple-400 transition-colors">Pricing</Link></li>
                                <li><Link to="/demo" className="text-slate-500 hover:text-purple-400 transition-colors">Demo</Link></li>
                                <li><a href="#eligibility" className="text-slate-500 hover:text-purple-400 transition-colors">Check Eligibility</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-6">Company</h4>
                            <ul className="space-y-4 text-sm">
                                <li><a href="mailto:support@keepflock.com" className="text-slate-500 hover:text-purple-400 transition-colors">Contact</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-6">Legal</h4>
                            <ul className="space-y-4 text-sm">
                                <li><Link to="/privacy" className="text-slate-500 hover:text-purple-400 transition-colors">Privacy Policy</Link></li>
                                <li><Link to="/terms" className="text-slate-500 hover:text-purple-400 transition-colors">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-slate-600">
                            &copy; 2026 LawOne Cloud LLC. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

// ── Data ─────────────────────────────────────────────────────────────────────

const TESTIMONIALS = [
    {
        quote: "The eligibility checker saved us weeks of guesswork. We found out in minutes that our church qualified for the Google Ad Grant, and the step-by-step application guide made the whole process painless.",
        name: "FaithTech Alliance",
        role: "Beta Program Participant — faithtechalliance.org"
    },
    {
        quote: "We looked into managed Ad Grant services and they all wanted $8,000 to $10,000 per month. KeepFlock automates the same compliance monitoring at a fraction of the cost. The GUARDIAN feature alone is worth it.",
        name: "Early Adopter Church",
        role: "Beta Program Participant — 200-member congregation"
    },
    {
        quote: "We had no idea our church was sitting on $10,000 a month in free Google advertising. KeepFlock walked us through every step from verification to our first live campaign.",
        name: "Beta Church Leader",
        role: "Early Adopter Feedback — Applied via KeepFlock REACH"
    }
];

const FAQ_ITEMS = [
    {
        question: "What is the Google Ad Grant?",
        answer: "Google gives eligible 501(c)(3) nonprofit organizations up to $10,000 per month in free Google Search advertising. That means your church can appear at the top of Google when people search for things like 'churches near me' or 'Sunday service times' — completely free."
    },
    {
        question: "Is my church eligible?",
        answer: "Most churches qualify. You need to be a registered 501(c)(3) nonprofit, have a functioning website, and not be a hospital, school, or government entity. KeepFlock's free eligibility checker tells you in under 2 minutes whether your church qualifies."
    },
    {
        question: "How long does approval take?",
        answer: "Typically 2 to 4 weeks from the time you submit your application to having live ads running on Google. KeepFlock guides you through every step — Google for Nonprofits enrollment, website compliance, and the Ad Grant application itself."
    },
    {
        question: "What is GUARDIAN?",
        answer: "GUARDIAN is KeepFlock's AI-managed advertising system. First, AdPilot researches keywords, creates compliant campaigns, and writes ad copy for your church — no Google Ads experience needed. Then GUARDIAN monitors your account 24/7, automatically pauses low-performing keywords, optimizes campaigns weekly, and alerts you to any issues. 73% of churches lose their Ad Grant in the first year — GUARDIAN makes sure that does not happen to you."
    },
    {
        question: "What does ENGAGE do?",
        answer: "ENGAGE is KeepFlock's AI communication module. It handles birthday calls, first-timer follow-ups, SMS campaigns, and pastoral care alerts automatically. Your AI assistant makes calls and sends messages so your staff can focus on ministry instead of manual outreach."
    },
    {
        question: "How is this different from a managed service?",
        answer: "Managed Ad Grant agencies charge $8,000 to $10,000 per month for a human account manager who creates campaigns and checks your account periodically. KeepFlock's AdPilot does the same thing — researching keywords, creating campaigns, writing ad copy, and optimizing weekly — for $199 per month, with 24/7 GUARDIAN compliance monitoring instead of business-hours-only coverage."
    },
    {
        question: "Can we cancel anytime?",
        answer: "Yes. Monthly plans can be canceled at any time with no penalties or long-term contracts. Annual plans include all 12 months and come with 2 months free."
    },
    {
        question: "Do we need technical expertise?",
        answer: "Not at all. KeepFlock is completely hands-free. You answer a few questions about your church, and AdPilot handles the rest — researching keywords, creating campaigns, writing ad copy, and optimizing performance. No Google Ads experience required. Your pastor never needs to log into Google Ads."
    }
];
