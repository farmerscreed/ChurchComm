
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayCircle, Calendar, MessageSquare, PhoneCall, Users, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function DemoPage() {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 relative selection:bg-cyan-500/30 font-sans overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[20%] left-[10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[100px]" />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-white">C</span>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            ChurchComm
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link to="/login">
                            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">Sign In</Button>
                        </Link>
                        <Link to="/login">
                            <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="pt-32 pb-24 container mx-auto px-6">

                {/* Header */}
                <div className="text-center max-w-4xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-900/20 text-cyan-400 text-sm border border-cyan-500/20 mb-6">
                        <PlayCircle className="w-4 h-4" />
                        <span>See it in action</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                        The Future of Ministry, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                            Demonstrated.
                        </span>
                    </h1>
                    <p className="text-xl text-slate-400">
                        Watch how ChurchComm automates 80% of your administrative work so you can focus on people.
                    </p>
                </div>

                {/* Video Placeholder */}
                <div className="max-w-5xl mx-auto relative group aspect-video rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl shadow-cyan-900/20 mb-24">
                    {/* Faux Interface inside video area */}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 group-hover:bg-slate-900/40 transition-colors cursor-pointer">
                        <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <PlayCircle className="w-10 h-10 text-white fill-white" />
                        </div>
                    </div>

                    {/* Mock Video Content (Static) */}
                    <div className="w-full h-full p-8 flex flex-col opacity-50">
                        <div className="flex gap-4 mb-4">
                            <div className="w-1/4 h-full bg-white/5 rounded-lg border border-white/5" />
                            <div className="w-3/4 h-full space-y-4">
                                <div className="w-full h-12 bg-white/10 rounded-lg" />
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="h-32 bg-white/5 rounded-lg" />
                                    <div className="h-32 bg-white/5 rounded-lg" />
                                    <div className="h-32 bg-white/5 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interactive Walkthrough / Call to Action */}
                <div className="grid md:grid-cols-2 gap-16 max-w-6xl mx-auto items-center">
                    <div>
                        <h2 className="text-3xl font-bold mb-6">Experience the platform live</h2>
                        <p className="text-slate-400 mb-8 leading-relaxed">
                            Our team would love to walk you through the platform and show you exactly how it can solve your church's specific challenges.
                        </p>

                        <div className="space-y-6">
                            <FeatureRow
                                icon={<PhoneCall className="w-5 h-5 text-cyan-400" />}
                                title="Live AI Call Demo"
                                desc="We'll simulate a visitor follow-up call during the demo."
                            />
                            <FeatureRow
                                icon={<MessageSquare className="w-5 h-5 text-purple-400" />}
                                title="SMS Blast Test"
                                desc="See how easy it is to reach your entire congregation."
                            />
                            <FeatureRow
                                icon={<Users className="w-5 h-5 text-green-400" />}
                                title="Workflow Setup"
                                desc="Build a custom automation workflow in under 5 minutes."
                            />
                        </div>
                    </div>

                    {/* Booking Form (Visual Mock) */}
                    <Card className="bg-white/5 border-white/10 p-2">
                        <CardContent className="p-6">
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-2">Schedule a Walkthrough</h3>
                                <p className="text-sm text-slate-400">30-minute personalized session</p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">First Name</Label>
                                        <Input className="bg-white/5 border-white/10 text-white" placeholder="John" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Last Name</Label>
                                        <Input className="bg-white/5 border-white/10 text-white" placeholder="Doe" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Church Email</Label>
                                    <Input className="bg-white/5 border-white/10 text-white" placeholder="pastor@church.com" />
                                </div>

                                <div className="pt-4">
                                    <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-6 text-lg">
                                        Book Demo
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}

function FeatureRow({ icon, title, desc }: any) {
    return (
        <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div>
                <h4 className="font-semibold text-white">{title}</h4>
                <p className="text-sm text-slate-400">{desc}</p>
            </div>
        </div>
    )
}
