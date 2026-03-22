import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ArrowLeft, Users, UserPlus, Upload, Edit, Search, Sparkles, CheckCircle, Phone, Heart, Tag, FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PeopleDocs() {
    const sections = [
        {
            id: 'overview',
            title: 'Getting Started with People',
            description: 'The People Directory is your central hub for managing everyone connected to your church — members, visitors, and prospects. Think of it as your church\'s contact book with superpowers.',
            icon: Sparkles,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10',
        },
        {
            id: 'adding',
            title: 'Adding a New Person',
            description: 'Add someone to your directory manually — perfect for walk-in visitors or new contacts you meet during the week.',
            icon: UserPlus,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
            steps: [
                'Go to People from the sidebar menu',
                'Click the "Add Person" button at the top right',
                'Fill in their first name and last name (required)',
                'Add optional info: phone number, email, birthday, address',
                'Choose their status: First Time Visitor, Member, Regular Attendee, etc.',
                'Add any notes (e.g., "Visited on Sunday, interested in youth group")',
                'Click "Save" to add them to your directory',
            ],
        },
        {
            id: 'import',
            title: 'Importing People from a Spreadsheet',
            description: 'Already have a list of members in Excel or Google Sheets? Import them all at once using a CSV file.',
            icon: FileSpreadsheet,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            steps: [
                'Go to People and click the "Bulk Import" tab',
                'Download the sample template if you need the correct format',
                'Open your spreadsheet and make sure columns are labeled: first_name, last_name, email, phone_number',
                'Save your file as a .CSV file (most spreadsheet apps can do this)',
                'Click "Upload CSV" and select your file',
                'Review the preview to make sure everything looks right',
                'Click "Import" to add everyone to your directory',
            ],
        },
        {
            id: 'managing',
            title: 'Editing & Managing People',
            description: 'Keep your records up to date. You can edit someone\'s info, change their status, or add notes at any time.',
            icon: Edit,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
            steps: [
                'Find the person using the search bar or by scrolling the list',
                'Click on their name to open their profile',
                'Update any field — name, phone, email, address, birthday, etc.',
                'Change their status (e.g., move a "First Time Visitor" to "Regular Attendee")',
                'Add or update notes to keep track of conversations or prayer requests',
                'Click "Save" when you\'re done',
            ],
        },
        {
            id: 'searching',
            title: 'Finding People',
            description: 'Quickly find anyone in your directory using search and filters.',
            icon: Search,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            steps: [
                'Use the search bar at the top of the People page',
                'Type any part of a name, phone number, or email',
                'Results update as you type — no need to press Enter',
                'Use filters to narrow by status (Member, Visitor, etc.)',
            ],
        },
    ];

    const tips = [
        { icon: Phone, text: 'Always add a phone number — it\'s needed for SMS and AI calling features.' },
        { icon: Heart, text: 'Add birthdays so the system can send automatic birthday wishes.' },
        { icon: Tag, text: 'Use statuses to track each person\'s journey (Visitor → Member).' },
        { icon: CheckCircle, text: 'Keep notes updated — they help your team provide personal follow-up.' },
    ];

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-10">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-black p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
                <div className="relative z-10 space-y-4">
                    <Button variant="ghost" size="sm" asChild className="text-white/70 hover:text-white hover:bg-white/10 -ml-3 rounded-full">
                        <Link to="/people">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to People Directory
                        </Link>
                    </Button>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight flex items-center gap-3">
                        <Users className="h-10 w-10 text-emerald-300" />
                        People Guide
                    </h1>
                    <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
                        Everything you need to know about managing your church directory — adding, editing, and organizing your people.
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
                                            <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
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
            <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden">
                <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-yellow-300" />
                        Pro Tips for a Great Directory
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-3 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                <tip.icon className="h-5 w-5 text-emerald-200 shrink-0 mt-0.5" />
                                <span className="text-emerald-50">{tip.text}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Need Help? */}
            <div className="text-center text-slate-500 py-4">
                <p>Still have questions? <Link to="/settings" className="text-emerald-500 font-medium hover:underline">Contact Support</Link></p>
            </div>
        </div>
    );
}
