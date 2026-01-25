import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowRight,
    CheckCircle,
    ChevronRight,
    Clock,
    Globe,
    Heart,
    MessageCircle,
    Phone,
    Play,
    Quote,
    Rocket,
    Shield,
    Sparkles,
    Star,
    TrendingUp,
    Users,
    Zap,
    PhoneCall,
    Calendar,
    Bell,
    BarChart3,
    Award,
    Timer,
    UserPlus,
    Send,
    Volume2,
    Brain
} from "lucide-react";
import { Link } from "react-router-dom";

// Animated counter hook
function useCounter(end: number, duration: number = 2000, start: number = 0) {
    const [count, setCount] = useState(start);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!isVisible) return;

        let startTime: number | null = null;
        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            setCount(Math.floor(progress * (end - start) + start));
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [isVisible, end, duration, start]);

    return { count, setIsVisible };
}

export default function LandingPage() {
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    const churches = useCounter(500, 2000);
    const calls = useCounter(50000, 2500);
    const hours = useCounter(2400, 2000);
    const satisfaction = useCounter(98, 1500);

    useEffect(() => {
        // Trigger counters when component mounts
        const timer = setTimeout(() => {
            churches.setIsVisible(true);
            calls.setIsVisible(true);
            hours.setIsVisible(true);
            satisfaction.setIsVisible(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Auto-rotate testimonials
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden relative selection:bg-purple-500/30">
            {/* Animated Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-500/20 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute top-[30%] right-[5%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
                <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] bg-pink-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1.5s" }} />

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-9 h-9 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
                            <Heart className="w-5 h-5 text-white fill-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            ChurchComm
                        </span>
                    </Link>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
                        <a href="#how-it-works" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">How It Works</a>
                        <Link to="/demo" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Demo</Link>
                        <Link to="/pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login">
                            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
                                Sign In
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all">
                                Start Free
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-28 pb-16 md:pt-40 md:pb-24 px-6">
                <div className="container mx-auto max-w-6xl">
                    {/* Announcement Banner */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 text-xs">NEW</Badge>
                            <span className="text-sm text-slate-300">AI Voice Agents now speak 12+ languages</span>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        </div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                            Your Church's AI
                            <br />
                            <span className="relative">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                                    Communication Team
                                </span>
                                <Sparkles className="absolute -top-2 -right-8 w-8 h-8 text-yellow-400 animate-pulse" />
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                            Stop losing visitors. Our AI makes <span className="text-white font-medium">personal phone calls</span> and sends <span className="text-white font-medium">targeted SMS</span> so every member feels valued—automatically.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                            <Link to="/login">
                                <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-950 hover:bg-slate-100 rounded-full shadow-2xl shadow-white/20 hover:shadow-white/30 transition-all hover:scale-105 group">
                                    Start Free 14-Day Trial
                                    <Rocket className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <Link to="/demo">
                                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10 rounded-full group">
                                    <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Watch Demo
                                </Button>
                            </Link>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
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
                                <span>Cancel anytime</span>
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
                                        <span>app.churchcomm.ai</span>
                                    </div>
                                </div>
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                                    Live
                                </Badge>
                            </div>

                            {/* Dashboard Content */}
                            <div className="p-6 md:p-8">
                                {/* Top Bar */}
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Good morning, Pastor Sarah</h2>
                                        <p className="text-slate-500 text-sm">Your AI assistant completed 23 calls while you slept</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="border-white/10 text-slate-400 bg-white/5">
                                            <Bell className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                                            <Zap className="w-4 h-4 mr-1" />
                                            New Campaign
                                        </Button>
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <PhoneCall className="w-4 h-4 text-purple-400" />
                                            <span className="text-xs text-purple-300">Calls Today</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">47</p>
                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> +12%
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MessageCircle className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs text-blue-300">SMS Sent</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">156</p>
                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> +8%
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="w-4 h-4 text-green-400" />
                                            <span className="text-xs text-green-300">New Visitors</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">12</p>
                                        <p className="text-xs text-slate-500">Followed up</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Award className="w-4 h-4 text-amber-400" />
                                            <span className="text-xs text-amber-300">Response Rate</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">94%</p>
                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> +5%
                                        </p>
                                    </div>
                                </div>

                                {/* AI Activity Feed */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-white flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-purple-400" />
                                                AI Activity
                                            </h3>
                                            <span className="text-xs text-slate-500">Just now</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                                    <Phone className="w-4 h-4 text-green-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-white">Called Maria Santos</p>
                                                    <p className="text-xs text-slate-500">3 min call • Very positive response</p>
                                                </div>
                                                <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">Success</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                    <Send className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-white">SMS to Youth Group</p>
                                                    <p className="text-xs text-slate-500">34 delivered • Event reminder</p>
                                                </div>
                                                <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">Sent</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-white flex items-center gap-2">
                                                <Bell className="w-4 h-4 text-amber-400" />
                                                Needs Attention
                                            </h3>
                                            <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">2 urgent</Badge>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border-l-2 border-amber-500">
                                                <div className="flex-1">
                                                    <p className="text-sm text-white">James Wilson mentioned health concerns</p>
                                                    <p className="text-xs text-slate-500">Detected during follow-up call</p>
                                                </div>
                                                <Button size="sm" variant="ghost" className="text-amber-400 hover:bg-amber-500/20">
                                                    Review
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border-l-2 border-red-500">
                                                <div className="flex-1">
                                                    <p className="text-sm text-white">Emily requested pastoral visit</p>
                                                    <p className="text-xs text-slate-500">Urgent • Family crisis</p>
                                                </div>
                                                <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/20">
                                                    Assign
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Elements */}
                        <div className="absolute -left-4 top-1/4 p-4 rounded-xl bg-slate-900/90 border border-white/10 shadow-xl backdrop-blur-sm animate-bounce" style={{ animationDuration: "3s" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                                    <Volume2 className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">AI Calling</p>
                                    <p className="text-sm font-medium text-white">Maria Santos</p>
                                </div>
                            </div>
                        </div>

                        <div className="absolute -right-4 bottom-1/4 p-4 rounded-xl bg-slate-900/90 border border-white/10 shadow-xl backdrop-blur-sm animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/30 to-cyan-500/30 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Just now</p>
                                    <p className="text-sm font-medium text-white">12 visitors followed up</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof Stats */}
            <section className="py-20 border-y border-white/5 bg-gradient-to-b from-slate-950 to-slate-900/50">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                        <div className="text-center">
                            <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                                {churches.count}+
                            </p>
                            <p className="text-slate-500 mt-2">Churches Trust Us</p>
                        </div>
                        <div className="text-center">
                            <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                                {calls.count.toLocaleString()}+
                            </p>
                            <p className="text-slate-500 mt-2">AI Calls Made</p>
                        </div>
                        <div className="text-center">
                            <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-400">
                                {hours.count}+
                            </p>
                            <p className="text-slate-500 mt-2">Hours Saved Weekly</p>
                        </div>
                        <div className="text-center">
                            <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-amber-400">
                                {satisfaction.count}%
                            </p>
                            <p className="text-slate-500 mt-2">Satisfaction Rate</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem/Solution Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center mb-16">
                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 mb-6">The Problem</Badge>
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">
                            <span className="text-red-400">80% of first-time visitors</span> never return
                        </h2>
                        <p className="text-xl text-slate-400">
                            Not because they didn't like your church—but because no one followed up. Pastors are busy.
                            Phone calls slip through the cracks. Visitors feel forgotten.
                        </p>
                    </div>

                    <div className="relative max-w-5xl mx-auto">
                        {/* Arrow */}
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
                                    Before ChurchComm
                                </h3>
                                <ul className="space-y-4">
                                    {[
                                        "Visitor cards pile up on your desk",
                                        "Follow-up calls take hours you don't have",
                                        "Members feel disconnected between Sundays",
                                        "Urgent pastoral needs get missed",
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
                                    With ChurchComm
                                </h3>
                                <ul className="space-y-4">
                                    {[
                                        "Every visitor called within 24 hours—automatically",
                                        "AI handles calls while you focus on ministry",
                                        "Personalized touchpoints keep members engaged",
                                        "Crisis alerts ensure no one slips through",
                                        "Your team does more with less stress"
                                    ].map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-slate-300">
                                            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Memory Feature Showcase */}
            <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900/50 relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />

                <div className="container mx-auto px-6 relative">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            {/* Left: Content */}
                            <div>
                                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 mb-6">
                                    <Brain className="w-3 h-3 mr-1.5" />
                                    AI Memory
                                </Badge>
                                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                                    Your AI{" "}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                                        remembers everything
                                    </span>
                                </h2>
                                <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                                    Every conversation, every prayer request, every life update—our AI remembers it all.
                                    The next time Maria picks up the phone, she hears someone who remembers her daughter
                                    just started college. That's not a cold script. That's genuine connection at scale.
                                </p>

                                <div className="space-y-4 mb-8">
                                    {[
                                        { title: "Automatic Insight Extraction", desc: "AI captures key details from every call—names, events, concerns" },
                                        { title: "Personalized Call Scripts", desc: "Next calls reference past conversations naturally" },
                                        { title: "Relationship Timeline", desc: "See the complete history of every member interaction" },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <CheckCircle className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{item.title}</p>
                                                <p className="text-sm text-slate-400">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Link to="/demo">
                                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 h-12 px-6">
                                        See AI Memory in Action
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </div>

                            {/* Right: Visual Demo */}
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-3xl blur-xl" />
                                <div className="relative rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-6 shadow-2xl">
                                    {/* Member Profile Header */}
                                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center text-xl font-bold text-white">
                                            MS
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-lg font-semibold text-white">Maria Santos</h4>
                                            <p className="text-sm text-slate-400">8 calls · Member since March 2024</p>
                                        </div>
                                        <Badge className="bg-green-500/20 text-green-400 border-0">Active</Badge>
                                    </div>

                                    {/* Memory Insights */}
                                    <div className="mb-6">
                                        <h5 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                                            <Brain className="w-4 h-4" />
                                            AI-Remembered Insights
                                        </h5>
                                        <div className="flex flex-wrap gap-2">
                                            {["Daughter Emma in college", "Birthday: Jan 10", "Works as nurse", "Interested in women's ministry", "Mother in Brazil"].map((tag, idx) => (
                                                <Badge key={idx} variant="outline" className="border-purple-500/30 text-purple-300 text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Last Conversation */}
                                    <div className="p-4 rounded-xl bg-white/5 mb-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-slate-500">Last Call - Jan 23, 2026</span>
                                            <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">Positive</Badge>
                                        </div>
                                        <p className="text-sm text-slate-300">
                                            Discussed upcoming women's retreat. Maria expressed interest but mentioned budget concerns.
                                        </p>
                                    </div>

                                    {/* AI Generated Next Call */}
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles className="w-4 h-4 text-green-400" />
                                            <span className="text-sm font-medium text-green-300">AI-Generated Next Call Script</span>
                                        </div>
                                        <p className="text-sm text-slate-300 italic">
                                            "Hi Maria! I hope Emma is settling in well at college! I'm calling about the women's retreat—great news, we now have scholarships available..."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-slate-900/50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 mb-6">Features</Badge>
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">
                            Everything you need to{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                                connect deeper
                            </span>
                        </h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Powerful AI tools designed specifically for church communication and pastoral care.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {FEATURES.map((feature, idx) => (
                            <div
                                key={idx}
                                className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 mb-6">How It Works</Badge>
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">
                            Up and running in{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                                5 minutes
                            </span>
                        </h2>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    step: "01",
                                    title: "Import Your People",
                                    description: "Upload a CSV or connect your ChMS. We'll organize your members, visitors, and groups automatically.",
                                    icon: UserPlus
                                },
                                {
                                    step: "02",
                                    title: "Create Your Script",
                                    description: "Use our templates or write your own. Add personalization like {Name} and the AI handles the rest.",
                                    icon: MessageCircle
                                },
                                {
                                    step: "03",
                                    title: "Launch & Relax",
                                    description: "Hit send and watch your AI make calls and send messages. Get notified of important responses.",
                                    icon: Rocket
                                }
                            ].map((item, idx) => (
                                <div key={idx} className="relative">
                                    {idx < 2 && (
                                        <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-purple-500/50 to-transparent" />
                                    )}
                                    <div className="text-center">
                                        <div className="relative inline-flex mb-6">
                                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                                                <item.icon className="w-10 h-10 text-purple-400" />
                                            </div>
                                            <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold text-white">
                                                {item.step}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                        <p className="text-slate-400">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-24 bg-gradient-to-b from-slate-900/50 to-slate-950">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 mb-6">Testimonials</Badge>
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">
                            Loved by{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                                church leaders
                            </span>
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
                                        className={`w-2 h-2 rounded-full transition-all ${
                                            idx === activeTestimonial
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

            {/* Pricing Preview */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 mb-6">Pricing</Badge>
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">
                            Start free, scale as you{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
                                grow
                            </span>
                        </h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Plans for churches of all sizes. No hidden fees. Cancel anytime.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6 mb-12">
                        {[
                            { name: "Starter", price: 29, desc: "Small churches", members: "200 members", minutes: "50 AI minutes" },
                            { name: "Growth", price: 79, desc: "Growing churches", members: "1,000 members", minutes: "200 AI minutes", popular: true },
                            { name: "Enterprise", price: 199, desc: "Large ministries", members: "Unlimited", minutes: "500 AI minutes" },
                        ].map((plan, idx) => (
                            <div
                                key={idx}
                                className={`relative p-6 rounded-2xl border w-full max-w-xs ${
                                    plan.popular
                                        ? "bg-gradient-to-b from-purple-500/10 to-blue-500/10 border-purple-500/30"
                                        : "bg-white/5 border-white/10"
                                }`}
                            >
                                {plan.popular && (
                                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
                                        Most Popular
                                    </Badge>
                                )}
                                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                                <p className="text-sm text-slate-500 mb-4">{plan.desc}</p>
                                <p className="text-4xl font-bold text-white mb-4">
                                    ${plan.price}<span className="text-lg text-slate-500">/mo</span>
                                </p>
                                <ul className="space-y-2 mb-6">
                                    <li className="text-sm text-slate-400 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        {plan.members}
                                    </li>
                                    <li className="text-sm text-slate-400 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        {plan.minutes}
                                    </li>
                                    <li className="text-sm text-slate-400 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        Unlimited SMS
                                    </li>
                                </ul>
                                <Link to="/pricing">
                                    <Button className={`w-full ${
                                        plan.popular
                                            ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                                            : "bg-white/10 hover:bg-white/20"
                                    }`}>
                                        Get Started
                                    </Button>
                                </Link>
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <Link to="/pricing" className="text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-2">
                            Compare all features
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-cyan-900/40 -z-10" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)] -z-10" />

                <div className="container mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-purple-300 mb-8">
                        <Timer className="w-4 h-4" />
                        <span>Limited time: Get 2 months free with annual plans</span>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-bold mb-6 max-w-3xl mx-auto">
                        Ready to transform how your church{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                            connects?
                        </span>
                    </h2>

                    <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                        Join 500+ churches already using AI to build deeper relationships and never miss a follow-up again.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                        <Link to="/login">
                            <Button size="lg" className="h-16 px-10 text-xl bg-white text-slate-950 hover:bg-slate-100 rounded-full shadow-2xl shadow-white/20 hover:shadow-white/30 transition-all hover:scale-105">
                                Start Your Free Trial
                                <ArrowRight className="ml-2 w-6 h-6" />
                            </Button>
                        </Link>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span>14-day free trial</span>
                        </div>
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

            {/* Footer */}
            <footer className="py-16 border-t border-white/10 bg-slate-950">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-5 gap-12 mb-12">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-9 h-9 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                                    <Heart className="w-5 h-5 text-white fill-white" />
                                </div>
                                <span className="text-xl font-bold text-white">ChurchComm</span>
                            </div>
                            <p className="text-slate-500 mb-6 max-w-sm">
                                Empowering churches with AI to reach more people, care deeper, and grow stronger communities.
                            </p>
                            <div className="flex gap-4">
                                {["twitter", "facebook", "linkedin", "youtube"].map((social) => (
                                    <a
                                        key={social}
                                        href="#"
                                        className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <Globe className="w-5 h-5" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-6">Product</h4>
                            <ul className="space-y-4 text-sm">
                                <li><a href="#features" className="text-slate-500 hover:text-purple-400 transition-colors">Features</a></li>
                                <li><Link to="/pricing" className="text-slate-500 hover:text-purple-400 transition-colors">Pricing</Link></li>
                                <li><Link to="/demo" className="text-slate-500 hover:text-purple-400 transition-colors">Demo</Link></li>
                                <li><a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">Integrations</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-6">Company</h4>
                            <ul className="space-y-4 text-sm">
                                <li><a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">About Us</a></li>
                                <li><a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">Blog</a></li>
                                <li><a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">Careers</a></li>
                                <li><a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">Contact</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-6">Legal</h4>
                            <ul className="space-y-4 text-sm">
                                <li><a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">Terms of Service</a></li>
                                <li><a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">Security</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-slate-600">
                            © {new Date().getFullYear()} ChurchComm by LawOne Cloud LLC. All rights reserved.
                        </p>
                        <p className="text-sm text-slate-600 flex items-center gap-2">
                            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> for churches everywhere
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

// Data
const FEATURES = [
    {
        icon: Phone,
        title: "AI Voice Calling",
        description: "Natural, human-like AI calls for visitor follow-ups, birthday wishes, and care check-ins. Powered by VAPI.",
        gradient: "from-purple-500/20 to-purple-500/5"
    },
    {
        icon: MessageCircle,
        title: "Smart SMS Campaigns",
        description: "Send personalized mass texts with {Name} variables. Two-way conversations with automatic replies.",
        gradient: "from-blue-500/20 to-blue-500/5"
    },
    {
        icon: Users,
        title: "People Management",
        description: "Track members, visitors, and families. Organize by groups, status, and custom tags.",
        gradient: "from-cyan-500/20 to-cyan-500/5"
    },
    {
        icon: Bell,
        title: "Pastoral Care Alerts",
        description: "AI detects prayer requests and crisis mentions, alerting your team for immediate follow-up.",
        gradient: "from-amber-500/20 to-amber-500/5"
    },
    {
        icon: Calendar,
        title: "Auto-Triggers",
        description: "Schedule automatic calls for birthdays, visitor follow-ups, missed attendance, and more.",
        gradient: "from-green-500/20 to-green-500/5"
    },
    {
        icon: BarChart3,
        title: "Real-Time Analytics",
        description: "Track call success rates, response sentiment, engagement trends, and campaign performance.",
        gradient: "from-pink-500/20 to-pink-500/5"
    }
];

const TESTIMONIALS = [
    {
        quote: "ChurchComm transformed our visitor follow-up. We went from losing 80% of first-time guests to retaining over 60%. The AI calls feel so personal that people don't even realize it's automated.",
        name: "Pastor Michael Torres",
        role: "Lead Pastor, Grace Community Church"
    },
    {
        quote: "I used to spend 15 hours a week making follow-up calls. Now our AI handles it while I focus on what matters—shepherding our people. This is a game-changer for bivocational pastors.",
        name: "Rev. Sarah Johnson",
        role: "Senior Pastor, Hope Fellowship"
    },
    {
        quote: "The pastoral care alerts are incredible. When a member mentioned struggling with health during a call, we were notified immediately. We could respond with prayer and support that same day.",
        name: "Pastor David Kim",
        role: "Executive Pastor, New Life Church"
    },
    {
        quote: "Our youth ministry grew 40% after we started using ChurchComm for event reminders and parent communication. The engagement is through the roof.",
        name: "Emily Chen",
        role: "Youth Director, Harvest Church"
    }
];
