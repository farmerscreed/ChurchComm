import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ArrowLeft, MessageSquare, Phone, Sparkles, CheckCircle, Users, FileText, Rocket, Volume2, Send, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommunicationsDocs() {
    const sections = [
        {
            id: 'overview',
            title: 'Getting Started with Communications',
            description: 'The Communications page is where you reach out to your church family through SMS text messages and AI-powered phone calls. Send a quick reminder, launch a group campaign, or let AI make personalized calls on your behalf.',
            icon: Sparkles,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10',
        },
        {
            id: 'sms',
            title: 'Sending an SMS Message',
            description: 'Send a text message to a group of members or your entire congregation in just a few steps.',
            icon: MessageSquare,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            steps: [
                'Go to Communications from the sidebar menu',
                'Make sure the "SMS Messages" tab is selected',
                'Choose who to send to: click "All Members" or select a specific group',
                'Type your message in the text box',
                'Use {Name} anywhere in the message to insert each person\'s first name automatically',
                'Check the phone preview on the right to see how it will look',
                'Click "Send Campaign" to deliver your message',
            ],
        },
        {
            id: 'calling',
            title: 'Launching an AI Call',
            description: 'Let AI make personalized phone calls to your members using a script you create. Great for follow-ups, reminders, and check-ins.',
            icon: Phone,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
            steps: [
                'Go to Communications and click the "AI Calling" tab',
                'Select a calling script from the dropdown (or create a new one — see below)',
                'Click "Listen to AI" to preview how the script sounds',
                'Select the group you want to call',
                'Click "Start Campaign" to launch the calls',
                'The AI will call each person in the group and follow your script naturally',
            ],
        },
        {
            id: 'scripts',
            title: 'Creating a Calling Script',
            description: 'Scripts tell the AI what to say during calls. Write it like a natural conversation — the AI will speak it in a friendly, human-like voice.',
            icon: FileText,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
            steps: [
                'On the AI Calling tab, click the "+ New Script" button',
                'Give your script a name (e.g., "Sunday Reminder" or "Visitor Follow-up")',
                'Write your script content as if you\'re having a conversation',
                'Use {Name} to personalize — the AI will say each person\'s name',
                'Click "Create Script" to save it',
                'You can now select this script when launching a call campaign',
            ],
        },
        {
            id: 'campaigns',
            title: 'Using the Campaign Builder',
            description: 'The Campaign Builder gives you more control over outreach — choose the type, pick your audience, and schedule delivery.',
            icon: Rocket,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            steps: [
                'Click the "New Campaign" button at the top of the Communications page',
                'Choose your campaign type: Voice Call or SMS Message',
                'Select a script (for calls) or compose a message (for SMS)',
                'Choose your audience: a specific group or all members',
                'Review your campaign details',
                'Click "Launch" to start or schedule your campaign',
            ],
        },
    ];

    const tips = [
        { icon: Send, text: 'Use {Name} in every message — personalized texts get much higher response rates.' },
        { icon: Volume2, text: 'Always preview your AI scripts before launching — click "Listen to AI" to hear it.' },
        { icon: Users, text: 'Create groups in the People section to target specific audiences for outreach.' },
        { icon: Clock, text: 'Send messages during morning hours (9–10 AM) for the best engagement.' },
    ];

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-10">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-black p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
                <div className="relative z-10 space-y-4">
                    <Button variant="ghost" size="sm" asChild className="text-white/70 hover:text-white hover:bg-white/10 -ml-3 rounded-full">
                        <Link to="/communications">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Communications
                        </Link>
                    </Button>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight flex items-center gap-3">
                        <MessageSquare className="h-10 w-10 text-blue-300" />
                        Communications Guide
                    </h1>
                    <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
                        Learn how to reach your congregation through text messages and AI-powered phone calls.
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
                                            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
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
            <Card className="border-none shadow-xl bg-gradient-to-br from-purple-500 to-blue-600 text-white overflow-hidden">
                <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-yellow-300" />
                        Pro Tips for Great Outreach
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-3 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                <tip.icon className="h-5 w-5 text-blue-200 shrink-0 mt-0.5" />
                                <span className="text-blue-50">{tip.text}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Need Help? */}
            <div className="text-center text-slate-500 py-4">
                <p>Still have questions? <Link to="/settings" className="text-blue-500 font-medium hover:underline">Contact Support</Link></p>
            </div>
        </div>
    );
}
