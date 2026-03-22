import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ArrowLeft, Zap, Cake, CalendarClock, Users, MessageSquare, Phone, Clock, Gift, Sparkles, CheckCircle, ChevronRight, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AutomationDocs() {
    const sections = [
        {
            id: 'overview',
            title: 'Getting Started with Automations',
            description: 'Automations let you set up "triggers" so that actions happen automatically without your intervention. This saves time and ensures no one falls through the cracks.',
            icon: Sparkles,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10',
        },
        {
            id: 'birthdays',
            title: 'Birthday & Anniversary',
            description: 'Automatically send personalized SMS messages to members on their birthday or anniversary. Go to settings to customize your message and the time it gets sent.',
            icon: Cake,
            color: 'text-pink-500',
            bgColor: 'bg-pink-500/10',
            steps: [
                'Navigate to Automations > Birthday Automations',
                'Toggle the switch to "Active"',
                'Customize your birthday message using placeholders like {Name}',
                'Set the time you want messages sent (e.g., 9:00 AM)',
                'Save your changes',
            ],
        },
        {
            id: 'scheduled',
            title: 'Scheduled Outreach',
            description: 'Plan and schedule SMS messages and AI phone calls in advance. Perfect for announcements, follow-ups, or reminders.',
            icon: CalendarClock,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            steps: [
                'Go to Automations > Scheduled Outreach',
                'Click "Schedule New" to create a campaign',
                'Choose the type: SMS Message or AI Call',
                'Select your recipients (all members, a group, or individuals)',
                'Compose your message or select a call script',
                'Pick a date and time for delivery',
                'Click "Schedule" to confirm',
            ],
        },
        {
            id: 'triggers',
            title: 'Event Triggers',
            description: 'Automatically react when something happens, like a visitor attending for the first time, or a member joining a group.',
            icon: Zap,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
            steps: [
                'Go to Automations > Event Triggers',
                'Click "New Trigger" to start',
                'Choose a Trigger Event (e.g., "First Visit", "Joins Group", "Leaves Group")',
                'Choose an Action Type: Send SMS or Make AI Call',
                'Compose the message or call script',
                'Set an optional delay (e.g., 1 hour after the event)',
                'Save and enable your trigger',
            ],
        },
    ];

    const tips = [
        { icon: CheckCircle, text: 'Always include {Name} to personalize your messages.' },
        { icon: Clock, text: 'Schedule messages for mornings (9-10 AM) for best engagement.' },
        { icon: Phone, text: 'AI Calls are great for follow-ups with first-time visitors.' },
        { icon: Users, text: 'Use Groups to segment your audience for targeted outreach.' },
    ];

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-10">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-black p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl"></div>
                <div className="relative z-10 space-y-4">
                    <Button variant="ghost" size="sm" asChild className="text-white/70 hover:text-white hover:bg-white/10 -ml-3 rounded-full">
                        <Link to="/automations">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Automation Center
                        </Link>
                    </Button>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                        Automation Guide
                    </h1>
                    <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
                        Learn how to set up powerful, time-saving workflows that run in the background.
                    </p>
                </div>
            </div>

            {/* Sections */}
            <div className="space-y-8">
                {sections.map((section) => (
                    <Card key={section.id} className="overflow-hidden border-none shadow-lg bg-white dark:bg-slate-900">
                        <CardHeader className="flex flex-row items-start gap-4 p-6 border-b dark:border-slate-800">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", section.bgColor)}>
                                <section.icon className={cn("h-7 w-7", section.color)} />
                            </div>
                            <div>
                                <CardTitle className="text-xl md:text-2xl">{section.title}</CardTitle>
                                <CardDescription className="text-base mt-1">{section.description}</CardDescription>
                            </div>
                        </CardHeader>
                        {section.steps && (
                            <CardContent className="p-6 bg-slate-50 dark:bg-slate-950">
                                <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-500 mb-4">How To</h4>
                                <ol className="space-y-3">
                                    {section.steps.map((step, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                            <span className="text-slate-700 dark:text-slate-300">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>

            {/* Pro Tips */}
            <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden">
                <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-yellow-300" />
                        Pro Tips for Success
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-3 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                <tip.icon className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
                                <span className="text-indigo-50">{tip.text}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Need Help? */}
            <div className="text-center text-slate-500 py-4">
                <p>Still have questions? <Link to="/settings" className="text-indigo-500 font-medium hover:underline">Contact Support</Link></p>
            </div>
        </div>
    );
}
