
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    CheckCircle,
    ChevronRight,
    Globe,
    Heart,
    MessageCircle,
    Phone,
    ShieldCheck,
    Users,
    Zap
} from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden relative selection:bg-purple-500/30">

            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-500/10 rounded-full blur-[100px] animate-bounce duration-[10000ms]" />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/50 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <Heart className="w-5 h-5 text-white fill-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            ChurchComm
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Features</a>
                        <Link to="/demo" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Demo</Link>
                        <Link to="/pricing" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Pricing</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login">
                            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
                                Sign In
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/25">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
                <div className="container mx-auto text-center max-w-5xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-purple-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <Zap className="w-4 h-4 fill-purple-300" />
                        <span>Powering the next generation of ministry</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                        Ministry Management <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                            Reimagined for AI
                        </span>
                    </h1>

                    <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                        Automate follow-ups, engage your community with AI calling, and organize your church with the most advanced CRM built for growth.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <Link to="/login">
                            <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-950 hover:bg-slate-200 rounded-full">
                                Start Free Trial
                                <ChevronRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link to="#demo">
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-slate-700 text-slate-300 hover:bg-white/5 hover:text-white rounded-full bg-transparent">
                                View Live Demo
                            </Button>
                        </Link>
                    </div>

                    {/* Abstract UI Preview */}
                    <div className="mt-20 relative mx-auto max-w-5xl animate-in fade-in zoom-in duration-1000 delay-500">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-xl blur opacity-30"></div>
                        <div className="relative rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[16/9]">
                            {/* Mock Interface Header */}
                            <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                </div>
                                <div className="mx-auto w-1/3 h-6 bg-white/5 rounded-md" />
                            </div>
                            {/* Mock Dashboard Grid */}
                            <div className="p-8 grid grid-cols-3 gap-6 h-full">
                                <div className="col-span-1 space-y-4">
                                    <div className="h-32 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/5 p-4 flex flex-col justify-between">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-2 w-16 bg-white/10 rounded" />
                                            <div className="h-6 w-12 bg-white/20 rounded" />
                                        </div>
                                    </div>
                                    <div className="h-48 rounded-lg bg-white/5 border border-white/5 p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="h-2 w-20 bg-white/10 rounded" />
                                            <div className="h-2 w-8 bg-green-500/50 rounded" />
                                        </div>
                                        <div className="space-y-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white/10" />
                                                    <div className="flex-1 space-y-1">
                                                        <div className="h-2 w-full bg-white/10 rounded" />
                                                        <div className="h-2 w-2/3 bg-white/5 rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-2 rounded-lg bg-white/5 border border-white/5 p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 pointer-events-none">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs border border-green-500/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            AI Agent Active
                                        </div>
                                    </div>
                                    <div className="mt-8 space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                                <Zap className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div className="flex-1 bg-white/5 rounded-2xl p-4 rounded-tl-none">
                                                <p className="text-sm text-slate-300">
                                                    I've just completed calls to the 15 first-time visitors from Sunday. 12 answered, and 3 requested a follow-up about the Youth Ministry.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4 flex-row-reverse">
                                            <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center">
                                                <div className="w-full text-center text-xs text-white">You</div>
                                            </div>
                                            <div className=" bg-blue-600/20 border border-blue-500/20 rounded-2xl p-4 rounded-tr-none">
                                                <p className="text-sm text-blue-100">
                                                    That's great! Please schedule the follow-ups for Tuesday at 2 PM.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Glow effect under preview */}
                        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[80%] h-40 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-slate-950 relative">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for the <span className="text-purple-400">Future</span></h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            Everything you need to manage your church, supercharged with artificial intelligence.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Phone className="w-8 h-8 text-blue-400" />}
                            title="AI Voice Agents"
                            description="Automated, human-like voice calls for visitor follow-ups, event reminders, and birthday wishes."
                        />
                        <FeatureCard
                            icon={<MessageCircle className="w-8 h-8 text-purple-400" />}
                            title="Smart SMS"
                            description="Personalized mass text messaging with high deliverability and two-way conversation management."
                        />
                        <FeatureCard
                            icon={<Users className="w-8 h-8 text-pink-400" />}
                            title="People Management"
                            description="Track members, visitors, and families with detailed profiles and attendance history."
                        />
                        <FeatureCard
                            icon={<ShieldCheck className="w-8 h-8 text-green-400" />}
                            title="Secure & Private"
                            description="Enterprise-grade security with role-based access control and encrypted database storage."
                        />
                        <FeatureCard
                            icon={<Globe className="w-8 h-8 text-cyan-400" />}
                            title="Cloud Native"
                            description="Access your dashboard from anywhere, on any device. Always in sync, always available."
                        />
                        <FeatureCard
                            icon={<Zap className="w-8 h-8 text-amber-400" />}
                            title="Smart Workflows"
                            description="Trigger automated actions based on member behavior, dates, or custom events."
                        />
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="py-20 border-y border-white/5 bg-slate-900/50">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-8">Trusted by forward-thinking ministries</p>
                    <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Simple text placeholders for logos for now */}
                        <span className="text-xl font-bold text-white">Elevate Church</span>
                        <span className="text-xl font-bold text-white">Grace City</span>
                        <span className="text-xl font-bold text-white">New Life Center</span>
                        <span className="text-xl font-bold text-white">Kingdom Builders</span>
                        <span className="text-xl font-bold text-white">Hope Community</span>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 -z-10" />
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to transform your ministry?</h2>
                    <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
                        Join thousands of church leaders using AI to build deeper connections.
                    </p>
                    <Link to="/login">
                        <Button size="lg" className="h-16 px-10 text-xl bg-white text-slate-950 hover:bg-slate-200 rounded-full shadow-2xl shadow-purple-500/20 transition-all hover:scale-105">
                            Get Started Now
                        </Button>
                    </Link>
                    <div className="mt-8 flex items-center justify-center gap-6 text-slate-500 text-sm">
                        <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> No credit card required</span>
                        <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> 14-day free trial</span>
                        <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Cancel anytime</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10 bg-slate-950 text-slate-400">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <Heart className="w-5 h-5 text-purple-500 fill-purple-500" />
                                <span className="text-lg font-bold text-white">ChurchComm</span>
                            </div>
                            <p className="text-sm">
                                Empowering churches with technology to reach more people and change more lives.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-6">Product</h4>
                            <ul className="space-y-4 text-sm">
                                <li><a href="#" className="hover:text-purple-400 transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-purple-400 transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-purple-400 transition-colors">Roadmap</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-6">Company</h4>
                            <ul className="space-y-4 text-sm">
                                <li><a href="#" className="hover:text-purple-400 transition-colors">About Us</a></li>
                                <li><a href="#" className="hover:text-purple-400 transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-purple-400 transition-colors">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-6">Legal</h4>
                            <ul className="space-y-4 text-sm">
                                <li><a href="#" className="hover:text-purple-400 transition-colors">Privacy</a></li>
                                <li><a href="#" className="hover:text-purple-400 transition-colors">Terms</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-white/5 text-center text-xs">
                        © {new Date().getFullYear()} ChurchComm. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors group">
            <CardContent className="p-8">
                <div className="mb-6 w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-slate-400 leading-relaxed">
                    {description}
                </p>
            </CardContent>
        </Card>
    )
}
