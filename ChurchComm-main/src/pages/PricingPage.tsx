
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, Minus, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PricingPage() {
    const [isAnnual, setIsAnnual] = useState(true);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 relative selection:bg-purple-500/30 font-sans">
            {/* Background Gradients */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[10%] right-[20%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[0%] left-[10%] w-[30%] h-[30%] bg-blue-900/10 rounded-full blur-[100px]" />
            </div>

            {/* Navbar (Duplicated for consistency - normally would be a layout) */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
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
                            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="pt-32 pb-24 container mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">Simple, transparent pricing</h1>
                    <p className="text-xl text-slate-400 mb-8">
                        Choose the perfect plan for your church. No hidden fees. Change or cancel anytime.
                    </p>

                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm font-medium ${!isAnnual ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className="w-14 h-8 bg-white/10 rounded-full p-1 relative transition-colors hover:bg-white/20"
                        >
                            <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all duration-300 ${isAnnual ? 'left-7' : 'left-1'}`} />
                        </button>
                        <span className={`text-sm font-medium ${isAnnual ? 'text-white' : 'text-slate-400'}`}>
                            Yearly <span className="text-purple-400 text-xs ml-1">(Save 20%)</span>
                        </span>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {/* Starter Plan */}
                    <PricingCard
                        name="Starter"
                        price={isAnnual ? "0" : "0"}
                        description="Perfect for new church plants and small groups."
                        features={[
                            "Up to 50 members",
                            "Basic People Management",
                            "1 Group",
                            "Community Support",
                            "Basic Dashboard"
                        ]}
                        buttonText="Start for Free"
                        variant="outline"
                    />

                    {/* Growth Plan */}
                    <PricingCard
                        name="Growth"
                        price={isAnnual ? "49" : "59"}
                        description="For growing congregations needing automation."
                        features={[
                            "Up to 500 members",
                            "Unlimited Groups",
                            "AI Voice Agents (100 mins/mo)",
                            "Smart SMS Campaigns",
                            "Advanced Analytics",
                            "Priority Email Support"
                        ]}
                        highlighted={true}
                        buttonText="Start Free Trial"
                        variant="default"
                    />

                    {/* Kingdom Plan */}
                    <PricingCard
                        name="Kingdom"
                        price={isAnnual ? "149" : "179"}
                        description="Full power for established ministries."
                        features={[
                            "Unlimited members",
                            "Unlimited Groups",
                            "AI Voice Agents (500 mins/mo)",
                            "Custom AI Workflows",
                            "Dedicated Success Manager",
                            "API Access"
                        ]}
                        buttonText="Contact Sales"
                        variant="outline"
                    />
                </div>

                {/* Feature Comparison Table */}
                <div className="mt-32 max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Detailed Comparison</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="py-4 px-6 text-slate-400 font-medium">Features</th>
                                    <th className="py-4 px-6 text-white font-bold text-center">Starter</th>
                                    <th className="py-4 px-6 text-purple-400 font-bold text-center">Growth</th>
                                    <th className="py-4 px-6 text-white font-bold text-center">Kingdom</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <ComparisonRow feature="Member Profiles" starter="50" growth="500" kingdom="Unlimited" />
                                <ComparisonRow feature="Groups" starter="1" growth="Unlimited" kingdom="Unlimited" />
                                <ComparisonRow feature="AI Voice Calls" starter={false} growth="100 mins/mo" kingdom="500 mins/mo" />
                                <ComparisonRow feature="SMS Broadcasting" starter={false} growth={true} kingdom={true} />
                                <ComparisonRow feature="Workflow Automation" starter={false} growth="Basic" kingdom="Advanced" />
                                <ComparisonRow feature="Data Import/Export" starter={true} growth={true} kingdom={true} />
                                <ComparisonRow feature="API Access" starter={false} growth={false} kingdom={true} />
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PricingCard({
    name,
    price,
    description,
    features,
    highlighted = false,
    buttonText,
    variant = "outline"
}: any) {
    return (
        <Card className={`relative flex flex-col border-white/10 bg-white/5 backdrop-blur-sm ${highlighted ? 'border-purple-500/50 shadow-2xl shadow-purple-500/10' : ''}`}>
            {highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Most Popular
                </div>
            )}
            <CardHeader>
                <CardTitle className="text-xl text-slate-200">{name}</CardTitle>
                <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-bold text-white">${price}</span>
                    <span className="ml-1 text-slate-400">/mo</span>
                </div>
                <p className="text-sm text-slate-400 mt-2">{description}</p>
            </CardHeader>
            <CardContent className="flex-1">
                <ul className="space-y-4">
                    {features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                            {feature}
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                <Link to="/login" className="w-full">
                    <Button
                        className={`w-full ${highlighted ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500' : 'bg-white/10 hover:bg-white/20'}`}
                        variant={highlighted ? "default" : "secondary"}
                        size="lg"
                    >
                        {buttonText}
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}

function ComparisonRow({ feature, starter, growth, kingdom }: any) {
    const renderCell = (value: any) => {
        if (value === true) return <Check className="w-5 h-5 text-green-400 mx-auto" />;
        if (value === false) return <Minus className="w-5 h-5 text-slate-600 mx-auto" />;
        return <span className="text-slate-300">{value}</span>;
    }

    return (
        <tr>
            <td className="py-4 px-6 text-slate-300">{feature}</td>
            <td className="py-4 px-6 text-center">{renderCell(starter)}</td>
            <td className="py-4 px-6 text-center">{renderCell(growth)}</td>
            <td className="py-4 px-6 text-center">{renderCell(kingdom)}</td>
        </tr>
    )
}
