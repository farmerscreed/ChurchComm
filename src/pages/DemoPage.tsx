import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Heart,
    Phone,
    MessageSquare,
    Users,
    Zap,
    Play,
    ChevronRight,
    BarChart3,
    Bell,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    Sparkles,
    ArrowRight,
    Volume2,
    Send,
    UserPlus,
    TrendingUp,
    AlertTriangle,
    PhoneCall,
    Brain,
    History,
    MessageCircle,
    Lightbulb
} from "lucide-react";

// Demo data representing actual app features
const DEMO_STATS = {
    totalMembers: 342,
    activeGroups: 8,
    callsThisMonth: 127,
    smsThisMonth: 456,
    minutesUsed: 89,
    minutesIncluded: 200,
};

const DEMO_RECENT_CALLS = [
    { name: "Sarah Johnson", status: "completed", time: "2 min ago", duration: "3:24" },
    { name: "Michael Chen", status: "completed", time: "15 min ago", duration: "2:45" },
    { name: "Emily Davis", status: "voicemail", time: "1 hr ago", duration: "0:32" },
    { name: "James Wilson", status: "completed", time: "2 hrs ago", duration: "4:12" },
];

const DEMO_CAMPAIGNS = [
    { name: "Sunday Service Reminder", type: "voice", status: "active", sent: 45, total: 120 },
    { name: "Youth Group Event", type: "sms", status: "completed", sent: 67, total: 67 },
    { name: "First-Time Visitor Follow-up", type: "voice", status: "scheduled", sent: 0, total: 23 },
];

const DEMO_ESCALATIONS = [
    { name: "Martha Williams", reason: "Requested prayer for health", priority: "high" },
    { name: "Robert Brown", reason: "Mentioned family crisis", priority: "urgent" },
];

const DEMO_SCRIPT = `Hello {Name}, this is a friendly call from Grace Community Church.

We noticed you visited us this past Sunday and wanted to personally thank you for joining us!

We'd love to know if you have any questions about our services or ministries. Is there anything specific you'd like to learn more about?

[Wait for response]

That's wonderful to hear. We also have a newcomers lunch next Sunday after service - would you be interested in attending?

Thank you so much for your time, {Name}. We look forward to seeing you again soon. Have a blessed week!`;

// AI Memory Demo Data - showing how the system remembers conversations
const DEMO_MEMBER_MEMORY = {
    name: "Maria Santos",
    avatar: "MS",
    status: "Regular Attender",
    memberSince: "March 2024",
    totalCalls: 8,
    lastContact: "2 days ago",
    conversationHistory: [
        {
            date: "Jan 23, 2026",
            type: "AI Call",
            summary: "Discussed upcoming women's retreat. Maria expressed interest but mentioned budget concerns.",
            sentiment: "positive",
            keyInsights: ["Interested in women's ministry", "Budget-conscious", "Works as a nurse"]
        },
        {
            date: "Jan 10, 2026",
            type: "AI Call",
            summary: "Birthday call. Maria was touched by the personal greeting. Mentioned her daughter Emma just started college.",
            sentiment: "very positive",
            keyInsights: ["Birthday: Jan 10", "Daughter Emma in college", "Appreciates personal touches"]
        },
        {
            date: "Dec 15, 2025",
            type: "AI Call",
            summary: "Christmas service reminder. Maria confirmed attendance and mentioned she'd bring her mother visiting from Brazil.",
            sentiment: "positive",
            keyInsights: ["Mother lives in Brazil", "Family-oriented", "Bilingual (Portuguese)"]
        },
        {
            date: "Nov 28, 2025",
            type: "AI Call",
            summary: "Follow-up after missed Sunday. Maria explained she was working night shifts at the hospital.",
            sentiment: "neutral",
            keyInsights: ["Works night shifts", "Healthcare worker", "Committed despite schedule"]
        }
    ],
    aiInsights: [
        "Maria responds best to calls in the late morning (10-11 AM)",
        "She appreciates when we remember her daughter Emma",
        "Interested in serving but limited by work schedule",
        "Prefers text reminders for events",
        "Strong connection to Brazilian heritage"
    ],
    nextCallContext: `Hi Maria! It's wonderful to reach you again. I hope Emma is settling in well at college - I remember you mentioned she just started!

I'm calling because the women's retreat is coming up next month, and I know you expressed interest last time we spoke. Great news - we now have a scholarship fund available for those who need it. Would you like me to share the details?`
};

export default function DemoPage() {
    const [activeTab, setActiveTab] = useState<"dashboard" | "calling" | "memory" | "sms" | "people">("dashboard");
    const [isPlaying, setIsPlaying] = useState(false);
    const [demoMessage, setDemoMessage] = useState("Hi {Name}, just a reminder about our Sunday service at 10am. Hope to see you there!");
    const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden relative selection:bg-purple-500/30">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-500/15 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[150px]" />
                <div className="absolute top-[50%] left-[30%] w-[25%] h-[25%] bg-cyan-500/10 rounded-full blur-[80px]" />
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
                        <span className="text-sm font-medium text-white">Demo</span>
                        <Link to="/pricing" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Pricing</Link>
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
            <section className="pt-32 pb-12 px-6">
                <div className="container mx-auto text-center max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-purple-300 mb-8">
                        <Play className="w-4 h-4" />
                        <span>Interactive Demo</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                        See ChurchComm{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                            in action
                        </span>
                    </h1>

                    <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
                        Explore our dashboard, AI calling, SMS campaigns, and people management - no sign-up required.
                    </p>
                </div>
            </section>

            {/* Interactive Demo Tabs */}
            <section className="pb-24 px-6">
                <div className="container mx-auto max-w-6xl">
                    {/* Tab Navigation */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1">
                            {[
                                { id: "dashboard", label: "Dashboard", icon: BarChart3 },
                                { id: "calling", label: "AI Calling", icon: Phone },
                                { id: "memory", label: "AI Memory", icon: Brain },
                                { id: "sms", label: "SMS", icon: MessageSquare },
                                { id: "people", label: "People", icon: Users },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all ${
                                        activeTab === tab.id
                                            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                                            : "text-slate-400 hover:text-white"
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Demo Content Area */}
                    <div className="relative">
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur opacity-50" />

                        {/* Demo Container */}
                        <div className="relative rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                            {/* Mock Browser Header */}
                            <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2 bg-slate-900/50">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                                </div>
                                <div className="flex-1 flex justify-center">
                                    <div className="px-4 py-1.5 bg-white/5 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                        app.churchcomm.ai/dashboard
                                    </div>
                                </div>
                                <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Live Demo
                                </Badge>
                            </div>

                            {/* Dashboard Tab */}
                            {activeTab === "dashboard" && (
                                <div className="p-6 md:p-8">
                                    {/* Greeting */}
                                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Good morning, Pastor James</h2>
                                            <p className="text-slate-400">Here's what's happening at Grace Community Church</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:bg-white/5">
                                                <UserPlus className="w-4 h-4 mr-1.5" />
                                                Add Person
                                            </Button>
                                            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                                                <Zap className="w-4 h-4 mr-1.5" />
                                                New Campaign
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid md:grid-cols-3 gap-4 mb-8">
                                        {/* Minute Usage */}
                                        <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                    <Phone className="w-5 h-5 text-purple-400" />
                                                </div>
                                                <Badge className="bg-purple-500/20 text-purple-300 border-0">AI Minutes</Badge>
                                            </div>
                                            <p className="text-3xl font-bold text-white mb-2">
                                                {DEMO_STATS.minutesUsed} <span className="text-lg text-slate-500">/ {DEMO_STATS.minutesIncluded}</span>
                                            </p>
                                            <Progress value={(DEMO_STATS.minutesUsed / DEMO_STATS.minutesIncluded) * 100} className="h-2 bg-purple-500/20" />
                                            <p className="text-xs text-slate-500 mt-2">{DEMO_STATS.minutesIncluded - DEMO_STATS.minutesUsed} minutes remaining this month</p>
                                        </div>

                                        {/* Active Campaigns */}
                                        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                    <Zap className="w-5 h-5 text-blue-400" />
                                                </div>
                                                <Badge className="bg-blue-500/20 text-blue-300 border-0">Campaigns</Badge>
                                            </div>
                                            <p className="text-3xl font-bold text-white mb-1">3</p>
                                            <p className="text-sm text-slate-400">1 active, 1 scheduled, 1 completed</p>
                                        </div>

                                        {/* Call Success Rate */}
                                        <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                                </div>
                                                <Badge className="bg-green-500/20 text-green-300 border-0">Success Rate</Badge>
                                            </div>
                                            <p className="text-3xl font-bold text-white mb-1">87%</p>
                                            <p className="text-sm text-slate-400">{DEMO_STATS.callsThisMonth} calls completed this month</p>
                                        </div>
                                    </div>

                                    {/* Bottom Row */}
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Recent Calls */}
                                        <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-white flex items-center gap-2">
                                                    <PhoneCall className="w-4 h-4 text-purple-400" />
                                                    Recent Calls
                                                </h3>
                                                <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300 h-7 px-2">
                                                    View All
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                {DEMO_RECENT_CALLS.slice(0, 3).map((call, idx) => (
                                                    <div key={idx} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-xs font-medium">
                                                                {call.name.split(" ").map(n => n[0]).join("")}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-white">{call.name}</p>
                                                                <p className="text-xs text-slate-500">{call.time}</p>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className={`text-xs ${
                                                            call.status === "completed"
                                                                ? "border-green-500/30 text-green-400"
                                                                : "border-amber-500/30 text-amber-400"
                                                        }`}>
                                                            {call.status}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Escalation Alerts */}
                                        <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-white flex items-center gap-2">
                                                    <Bell className="w-4 h-4 text-amber-400" />
                                                    Escalation Alerts
                                                </h3>
                                                <Badge className="bg-red-500/20 text-red-400 border-0">2 new</Badge>
                                            </div>
                                            <div className="space-y-3">
                                                {DEMO_ESCALATIONS.map((alert, idx) => (
                                                    <div key={idx} className="p-3 rounded-lg bg-white/5 border-l-2 border-amber-500">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <AlertTriangle className={`w-4 h-4 ${
                                                                alert.priority === "urgent" ? "text-red-400" : "text-amber-400"
                                                            }`} />
                                                            <p className="text-sm font-medium text-white">{alert.name}</p>
                                                        </div>
                                                        <p className="text-xs text-slate-400">{alert.reason}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Upcoming */}
                                        <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-white flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-cyan-400" />
                                                    Scheduled
                                                </h3>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                            <Phone className="w-4 h-4 text-purple-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-white">Visitor Follow-up</p>
                                                            <p className="text-xs text-slate-500">23 people</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        Tomorrow
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                            <MessageSquare className="w-4 h-4 text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-white">Event Reminder</p>
                                                            <p className="text-xs text-slate-500">156 people</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        Friday
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AI Calling Tab */}
                            {activeTab === "calling" && (
                                <div className="p-6 md:p-8">
                                    <div className="grid lg:grid-cols-2 gap-8">
                                        {/* Left: Script Editor */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                    <FileText className="w-5 h-5 text-purple-400" />
                                                    AI Call Script
                                                </h3>
                                                <Badge className="bg-green-500/20 text-green-400 border-0">
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    AI-Powered
                                                </Badge>
                                            </div>

                                            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                                    <span className="text-sm font-medium text-slate-300">First-Time Visitor Follow-up</span>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setIsPlaying(!isPlaying)}
                                                        className={isPlaying
                                                            ? "bg-red-500 hover:bg-red-600"
                                                            : "bg-gradient-to-r from-purple-600 to-blue-600"
                                                        }
                                                    >
                                                        {isPlaying ? (
                                                            <>Stop Preview</>
                                                        ) : (
                                                            <>
                                                                <Volume2 className="w-4 h-4 mr-1.5" />
                                                                Listen to AI
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                                <div className="p-4 font-mono text-sm leading-relaxed text-slate-300 max-h-64 overflow-y-auto">
                                                    {DEMO_SCRIPT.split("\n").map((line, idx) => (
                                                        <p key={idx} className={`${line.startsWith("[") ? "text-purple-400 italic" : ""} ${line.includes("{Name}") ? "" : ""}`}>
                                                            {line.split(/(\{Name\})/).map((part, i) =>
                                                                part === "{Name}"
                                                                    ? <span key={i} className="bg-purple-500/30 text-purple-300 px-1 rounded">John</span>
                                                                    : part
                                                            ) || <br />}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>

                                            {isPlaying && (
                                                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center animate-pulse">
                                                            <Volume2 className="w-5 h-5 text-purple-400" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-white">AI Voice Preview</p>
                                                            <p className="text-xs text-slate-400">Playing script with natural voice synthesis...</p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {[...Array(4)].map((_, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="w-1 bg-purple-400 rounded-full animate-pulse"
                                                                    style={{
                                                                        height: `${12 + Math.random() * 16}px`,
                                                                        animationDelay: `${i * 0.1}s`
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: Campaign Status */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                    <Zap className="w-5 h-5 text-blue-400" />
                                                    Active Campaigns
                                                </h3>
                                            </div>

                                            <div className="space-y-4">
                                                {DEMO_CAMPAIGNS.map((campaign, idx) => (
                                                    <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                                    campaign.type === "voice"
                                                                        ? "bg-purple-500/20"
                                                                        : "bg-blue-500/20"
                                                                }`}>
                                                                    {campaign.type === "voice"
                                                                        ? <Phone className="w-5 h-5 text-purple-400" />
                                                                        : <MessageSquare className="w-5 h-5 text-blue-400" />
                                                                    }
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-white">{campaign.name}</p>
                                                                    <p className="text-xs text-slate-500 capitalize">{campaign.type} campaign</p>
                                                                </div>
                                                            </div>
                                                            <Badge className={`${
                                                                campaign.status === "active"
                                                                    ? "bg-green-500/20 text-green-400"
                                                                    : campaign.status === "scheduled"
                                                                    ? "bg-amber-500/20 text-amber-400"
                                                                    : "bg-slate-500/20 text-slate-400"
                                                            } border-0`}>
                                                                {campaign.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="text-slate-400">Progress</span>
                                                                <span className="text-white">{campaign.sent} / {campaign.total}</span>
                                                            </div>
                                                            <Progress
                                                                value={(campaign.sent / campaign.total) * 100}
                                                                className="h-2 bg-white/10"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AI Memory Tab */}
                            {activeTab === "memory" && (
                                <div className="p-6 md:p-8">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                <Brain className="w-6 h-6 text-purple-400" />
                                                AI Memory & Relationship Intelligence
                                            </h3>
                                            <p className="text-slate-400 text-sm mt-1">Every conversation remembered. Every call more personal.</p>
                                        </div>
                                        <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 px-4 py-1">
                                            <Sparkles className="w-3 h-3 mr-1.5" />
                                            Powered by AI
                                        </Badge>
                                    </div>

                                    <div className="grid lg:grid-cols-3 gap-6">
                                        {/* Left: Member Profile */}
                                        <div className="lg:col-span-1 space-y-4">
                                            {/* Profile Card */}
                                            <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center text-2xl font-bold text-white">
                                                        {DEMO_MEMBER_MEMORY.avatar}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-semibold text-white">{DEMO_MEMBER_MEMORY.name}</h4>
                                                        <p className="text-sm text-slate-400">{DEMO_MEMBER_MEMORY.status}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 rounded-lg bg-white/5">
                                                        <p className="text-xs text-slate-500">Total Calls</p>
                                                        <p className="text-lg font-semibold text-white">{DEMO_MEMBER_MEMORY.totalCalls}</p>
                                                    </div>
                                                    <div className="p-3 rounded-lg bg-white/5">
                                                        <p className="text-xs text-slate-500">Last Contact</p>
                                                        <p className="text-lg font-semibold text-white">{DEMO_MEMBER_MEMORY.lastContact}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* AI Insights */}
                                            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                                <h4 className="font-semibold text-white flex items-center gap-2 mb-4">
                                                    <Lightbulb className="w-4 h-4 text-amber-400" />
                                                    AI-Generated Insights
                                                </h4>
                                                <ul className="space-y-2">
                                                    {DEMO_MEMBER_MEMORY.aiInsights.map((insight, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                                                            {insight}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Middle: Conversation History */}
                                        <div className="lg:col-span-1">
                                            <div className="p-5 rounded-xl bg-white/5 border border-white/10 h-full">
                                                <h4 className="font-semibold text-white flex items-center gap-2 mb-4">
                                                    <History className="w-4 h-4 text-cyan-400" />
                                                    Conversation History
                                                </h4>
                                                <div className="space-y-3">
                                                    {DEMO_MEMBER_MEMORY.conversationHistory.map((conv, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setSelectedHistoryIndex(idx)}
                                                            className={`w-full text-left p-3 rounded-lg transition-all ${
                                                                selectedHistoryIndex === idx
                                                                    ? "bg-purple-500/20 border border-purple-500/30"
                                                                    : "bg-white/5 hover:bg-white/10 border border-transparent"
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs text-slate-500">{conv.date}</span>
                                                                <Badge className={`text-xs border-0 ${
                                                                    conv.sentiment === "very positive" ? "bg-green-500/20 text-green-400" :
                                                                    conv.sentiment === "positive" ? "bg-blue-500/20 text-blue-400" :
                                                                    "bg-slate-500/20 text-slate-400"
                                                                }`}>
                                                                    {conv.sentiment}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-white font-medium">{conv.type}</p>
                                                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{conv.summary}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Selected Conversation & Next Call */}
                                        <div className="lg:col-span-1 space-y-4">
                                            {/* Selected Conversation Details */}
                                            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                                <h4 className="font-semibold text-white flex items-center gap-2 mb-3">
                                                    <MessageCircle className="w-4 h-4 text-blue-400" />
                                                    Conversation Details
                                                </h4>
                                                <div className="p-3 rounded-lg bg-white/5 mb-3">
                                                    <p className="text-sm text-slate-300">
                                                        {DEMO_MEMBER_MEMORY.conversationHistory[selectedHistoryIndex].summary}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 mb-2">Key Insights Captured:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {DEMO_MEMBER_MEMORY.conversationHistory[selectedHistoryIndex].keyInsights.map((insight, idx) => (
                                                            <Badge key={idx} variant="outline" className="border-purple-500/30 text-purple-300 text-xs">
                                                                {insight}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* AI-Generated Next Call Script */}
                                            <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-green-500/20">
                                                <h4 className="font-semibold text-white flex items-center gap-2 mb-3">
                                                    <Sparkles className="w-4 h-4 text-green-400" />
                                                    AI-Personalized Next Call
                                                </h4>
                                                <p className="text-xs text-green-300 mb-3">Based on all previous conversations, here's a personalized script:</p>
                                                <div className="p-3 rounded-lg bg-slate-900/50 font-mono text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                                                    {DEMO_MEMBER_MEMORY.nextCallContext.split('\n').map((line, idx) => (
                                                        <p key={idx} className="mb-2">{line}</p>
                                                    ))}
                                                </div>
                                                <Button size="sm" className="w-full mt-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500">
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    Start Personalized Call
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Feature Highlight */}
                                    <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-500/20">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                                <Brain className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-semibold text-white mb-2">How AI Memory Works</h4>
                                                <p className="text-slate-400 text-sm leading-relaxed">
                                                    Every phone call and SMS conversation is automatically analyzed and remembered. The AI extracts key details—names,
                                                    life events, prayer requests, interests—and uses them to make future interactions feel genuinely personal.
                                                    When Maria picks up the phone, she doesn't hear a cold script. She hears someone who remembers her daughter Emma just started college,
                                                    who knows about her interest in the women's retreat, and who cares about her as a person.
                                                </p>
                                                <div className="flex gap-4 mt-4">
                                                    <div className="flex items-center gap-2 text-sm text-purple-300">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Automatic insight extraction
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-blue-300">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Personalized call scripts
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-cyan-300">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Relationship building at scale
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SMS Tab */}
                            {activeTab === "sms" && (
                                <div className="p-6 md:p-8">
                                    <div className="grid lg:grid-cols-2 gap-8">
                                        {/* Left: Compose */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                    <MessageSquare className="w-5 h-5 text-blue-400" />
                                                    Compose Message
                                                </h3>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                    <label className="text-sm text-slate-400 mb-2 block">Send to</label>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" className="border-purple-500/50 bg-purple-500/10 text-purple-300">
                                                            Youth Group (34)
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="border-white/10 text-slate-400 hover:bg-white/5">
                                                            First-Time Visitors
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="border-white/10 text-slate-400 hover:bg-white/5">
                                                            All Members
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                    <label className="text-sm text-slate-400 mb-2 block">Message</label>
                                                    <textarea
                                                        value={demoMessage}
                                                        onChange={(e) => setDemoMessage(e.target.value)}
                                                        className="w-full h-32 bg-transparent text-white resize-none focus:outline-none"
                                                        placeholder="Type your message..."
                                                    />
                                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                                                        <span className="text-xs text-slate-500">
                                                            Use <code className="bg-purple-500/20 text-purple-300 px-1 rounded">{"{Name}"}</code> to personalize
                                                        </span>
                                                        <span className="text-xs text-slate-500">{demoMessage.length}/160</span>
                                                    </div>
                                                </div>

                                                <Button className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500">
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Send to 34 Recipients
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Right: Phone Preview */}
                                        <div className="flex justify-center items-center">
                                            <div className="relative">
                                                {/* Phone Frame */}
                                                <div className="w-64 h-[500px] bg-slate-800 rounded-[3rem] p-3 shadow-2xl border-4 border-slate-700">
                                                    {/* Screen */}
                                                    <div className="w-full h-full bg-slate-900 rounded-[2.25rem] overflow-hidden relative">
                                                        {/* Notch */}
                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-800 rounded-b-2xl" />

                                                        {/* Messages App */}
                                                        <div className="pt-10 px-4 h-full flex flex-col">
                                                            <div className="text-center mb-4">
                                                                <p className="text-xs text-slate-500">Messages</p>
                                                                <p className="text-sm font-medium text-white">Grace Church</p>
                                                            </div>

                                                            <div className="flex-1 flex flex-col justify-end pb-4 space-y-3">
                                                                <div className="self-start max-w-[85%]">
                                                                    <div className="bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                                                                        <p className="text-sm text-white">
                                                                            {demoMessage.replace("{Name}", "Sarah")}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-600 mt-1 ml-2">Now</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Glow */}
                                                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-[4rem] blur-xl -z-10" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* People Tab */}
                            {activeTab === "people" && (
                                <div className="p-6 md:p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">People Directory</h3>
                                            <p className="text-sm text-slate-400">{DEMO_STATS.totalMembers} total members across {DEMO_STATS.activeGroups} groups</p>
                                        </div>
                                        <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                                            <UserPlus className="w-4 h-4 mr-1.5" />
                                            Add Person
                                        </Button>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-4 gap-4 mb-6">
                                        {[
                                            { label: "Members", value: 245, color: "purple" },
                                            { label: "Regular Attenders", value: 67, color: "blue" },
                                            { label: "First-Time Visitors", value: 23, color: "cyan" },
                                            { label: "Leaders", value: 7, color: "green" },
                                        ].map((stat, idx) => (
                                            <div key={idx} className={`p-4 rounded-xl bg-${stat.color}-500/10 border border-${stat.color}-500/20`}>
                                                <p className={`text-2xl font-bold text-white`}>{stat.value}</p>
                                                <p className="text-xs text-slate-400">{stat.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* People Table */}
                                    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-white/10">
                                                        <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                                                        <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                                                        <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Groups</th>
                                                        <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Last Contact</th>
                                                        <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {[
                                                        { name: "Sarah Johnson", email: "sarah.j@email.com", status: "member", groups: ["Youth Leaders", "Worship"], lastContact: "2 days ago" },
                                                        { name: "Michael Chen", email: "m.chen@email.com", status: "member", groups: ["Men's Ministry"], lastContact: "1 week ago" },
                                                        { name: "Emily Davis", email: "emily.d@email.com", status: "first_time_visitor", groups: [], lastContact: "Yesterday" },
                                                        { name: "James Wilson", email: "jwilson@email.com", status: "regular_attender", groups: ["Greeters"], lastContact: "3 days ago" },
                                                        { name: "Maria Garcia", email: "m.garcia@email.com", status: "leader", groups: ["Women's Ministry", "Prayer Team"], lastContact: "Today" },
                                                    ].map((person, idx) => (
                                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-sm font-medium text-white">
                                                                        {person.name.split(" ").map(n => n[0]).join("")}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-white">{person.name}</p>
                                                                        <p className="text-xs text-slate-500">{person.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <Badge variant="outline" className={`text-xs ${
                                                                    person.status === "member" ? "border-green-500/30 text-green-400" :
                                                                    person.status === "leader" ? "border-purple-500/30 text-purple-400" :
                                                                    person.status === "first_time_visitor" ? "border-cyan-500/30 text-cyan-400" :
                                                                    "border-blue-500/30 text-blue-400"
                                                                }`}>
                                                                    {person.status.replace(/_/g, " ")}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex gap-1 flex-wrap">
                                                                    {person.groups.length > 0 ? person.groups.map((group, i) => (
                                                                        <Badge key={i} variant="outline" className="text-xs border-white/10 text-slate-400">
                                                                            {group}
                                                                        </Badge>
                                                                    )) : (
                                                                        <span className="text-xs text-slate-600">No groups</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-sm text-slate-400">{person.lastContact}</td>
                                                            <td className="p-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                                                                        <Phone className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                                                                        <MessageSquare className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Highlights */}
            <section className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why churches love ChurchComm</h2>
                        <p className="text-slate-400 text-lg">Real features that make a real difference</p>
                    </div>

                    {/* AI Memory - Featured */}
                    <div className="mb-8 p-8 rounded-2xl bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-500/20">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center flex-shrink-0">
                                <Brain className="w-8 h-8 text-purple-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl font-bold text-white">AI Memory & Relationship Intelligence</h3>
                                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 text-xs">
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        Core Feature
                                    </Badge>
                                </div>
                                <p className="text-slate-300 leading-relaxed">
                                    Every conversation is remembered forever. When your AI calls Maria next month, it remembers
                                    her daughter Emma just started college, that she's interested in the women's retreat, and that
                                    she works night shifts as a nurse. No more cold scripts—every call feels like catching up with
                                    an old friend who genuinely cares.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            {
                                icon: Phone,
                                title: "Natural AI Conversations",
                                description: "Our AI makes calls that sound human - warm, conversational, and personalized. Members feel genuinely cared for.",
                                color: "purple"
                            },
                            {
                                icon: Zap,
                                title: "Automated Follow-ups",
                                description: "Set triggers for birthdays, first-time visitors, or missed attendance. The AI handles outreach automatically.",
                                color: "blue"
                            },
                            {
                                icon: Bell,
                                title: "Pastoral Care Alerts",
                                description: "AI detects when someone mentions a crisis or prayer need, automatically alerting your pastoral team.",
                                color: "amber"
                            },
                            {
                                icon: CheckCircle2,
                                title: "Campaign Analytics",
                                description: "Track call completion rates, response sentiment, and engagement metrics in real-time.",
                                color: "green"
                            },
                        ].map((feature, idx) => (
                            <div key={idx} className="flex gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                                    <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                    <p className="text-slate-400">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-blue-900/30 -z-10" />
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to try it yourself?</h2>
                    <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                        Start your free 14-day trial and experience AI-powered ministry communication.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/login">
                            <Button size="lg" className="h-14 px-10 text-lg bg-white text-slate-950 hover:bg-slate-200 rounded-full shadow-2xl shadow-purple-500/20 transition-all hover:scale-105">
                                Start Free Trial
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                        <Link to="/pricing">
                            <Button size="lg" variant="outline" className="h-14 px-10 text-lg border-white/20 text-white hover:bg-white/10 rounded-full">
                                View Pricing
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                    </div>
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
