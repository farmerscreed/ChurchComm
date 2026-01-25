import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import {
    Brain,
    Phone,
    MessageSquare,
    Calendar,
    Mail,
    MapPin,
    History,
    Lightbulb,
    MessageCircle,
    Sparkles,
    Send,
    Loader2,
    Edit2,
    Clock,
    Heart,
    User,
    ChevronRight,
    PhoneCall,
    CheckCircle2,
} from 'lucide-react';

interface Person {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone_number: string | null;
    member_status: string;
    tags: string[] | null;
    address: any | null;
    birthday: string | null;
    notes: string | null;
    created_at: string;
}

interface MemberMemory {
    id: string;
    content: string;
    memory_type: 'call_summary' | 'prayer_request' | 'personal_note' | 'preference';
    source_call_id: string | null;
    created_at: string;
}

interface MemberProfilePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    person: Person | null;
    onEditClick: () => void;
}

const MEMORY_TYPE_CONFIG = {
    call_summary: {
        label: 'Call Summary',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        icon: PhoneCall,
    },
    prayer_request: {
        label: 'Prayer Request',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
        icon: Heart,
    },
    personal_note: {
        label: 'Personal Note',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        icon: MessageCircle,
    },
    preference: {
        label: 'Preference',
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        icon: Lightbulb,
    },
};

const SENTIMENT_CONFIG: Record<string, { label: string; color: string }> = {
    positive: { label: 'Positive', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
    neutral: { label: 'Neutral', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
    negative: { label: 'Negative', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    'very positive': { label: 'Very Positive', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
};

function getInitials(firstName: string, lastName: string): string {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

// Extract AI insights from memories
function extractInsights(memories: MemberMemory[]): string[] {
    const insights: string[] = [];

    // Find preferences
    const preferences = memories.filter(m => m.memory_type === 'preference');
    preferences.forEach(p => insights.push(p.content));

    // Analyze call patterns
    const callSummaries = memories.filter(m => m.memory_type === 'call_summary');
    if (callSummaries.length > 0) {
        insights.push(`${callSummaries.length} previous conversations recorded`);
    }

    // Find prayer requests
    const prayerRequests = memories.filter(m => m.memory_type === 'prayer_request');
    if (prayerRequests.length > 0) {
        insights.push(`${prayerRequests.length} active prayer request(s)`);
    }

    // Extract key themes from recent notes
    const notes = memories.filter(m => m.memory_type === 'personal_note').slice(0, 3);
    notes.forEach(n => {
        if (n.content.length < 100) {
            insights.push(n.content);
        }
    });

    return insights.slice(0, 5);
}

// Generate personalized call context based on memories
function generateCallContext(person: Person, memories: MemberMemory[]): string {
    const firstName = person.first_name;
    const recentMemories = memories.slice(0, 3);
    const prayerRequests = memories.filter(m => m.memory_type === 'prayer_request');
    const preferences = memories.filter(m => m.memory_type === 'preference');

    let context = `Hi ${firstName}! It's wonderful to reach you.`;

    if (recentMemories.length > 0) {
        const lastContact = recentMemories[0];
        if (lastContact.memory_type === 'call_summary') {
            context += `\n\nLast time we spoke, you mentioned: "${lastContact.content.slice(0, 100)}..."`;
        }
    }

    if (prayerRequests.length > 0) {
        context += `\n\nI wanted to follow up on your prayer request. How has that situation been going?`;
    }

    if (preferences.length > 0) {
        context += `\n\n(Remember: ${preferences[0].content})`;
    }

    if (memories.length === 0) {
        context = `Hi ${firstName}! It's great to connect with you. I'd love to learn more about you and how we can better support you in your faith journey.`;
    }

    return context;
}

export function MemberProfilePanel({
    open,
    onOpenChange,
    person,
    onEditClick,
}: MemberProfilePanelProps) {
    const { currentOrganization } = useAuthStore();
    const { toast } = useToast();
    const [selectedMemoryIndex, setSelectedMemoryIndex] = useState(0);
    const [showSmsForm, setShowSmsForm] = useState(false);
    const [showCallForm, setShowCallForm] = useState(false);
    const [smsMessage, setSmsMessage] = useState('');
    const [callScript, setCallScript] = useState('');
    const [sendingSms, setSendingSms] = useState(false);
    const [initiatingCall, setInitiatingCall] = useState(false);

    // Fetch member memories
    const { data: memories = [], isLoading: memoriesLoading } = useQuery({
        queryKey: ['member-memories', person?.id],
        queryFn: async (): Promise<MemberMemory[]> => {
            if (!person?.id) return [];

            const { data, error } = await supabase
                .from('member_memories')
                .select('*')
                .eq('person_id', person.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching memories:', error);
                return [];
            }

            return data as MemberMemory[];
        },
        enabled: !!person?.id && open,
    });

    // Fetch call attempts for this person
    const { data: callHistory = [] } = useQuery({
        queryKey: ['member-calls', person?.id],
        queryFn: async () => {
            if (!person?.id) return [];

            const { data, error } = await supabase
                .from('call_attempts')
                .select('*')
                .eq('person_id', person.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching call history:', error);
                return [];
            }

            return data;
        },
        enabled: !!person?.id && open,
    });

    // Reset state when person changes
    useEffect(() => {
        if (person) {
            setSelectedMemoryIndex(0);
            setShowSmsForm(false);
            setShowCallForm(false);
            setSmsMessage('');
            setCallScript('');
        }
    }, [person?.id]);

    // Send SMS handler
    const handleSendSms = async () => {
        if (!person?.phone_number || !smsMessage.trim()) {
            toast({
                title: 'Error',
                description: 'Phone number and message are required',
                variant: 'destructive',
            });
            return;
        }

        setSendingSms(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('You must be logged in');

            const { error } = await supabase.functions.invoke('send-sms', {
                body: {
                    recipientType: 'individual',
                    recipientId: person.id,
                    message: smsMessage,
                    organizationId: currentOrganization?.id,
                    createdBy: user.id,
                },
            });

            if (error) throw error;

            toast({
                title: 'SMS Sent',
                description: `Message sent to ${person.first_name}`,
            });
            setSmsMessage('');
            setShowSmsForm(false);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to send SMS',
                variant: 'destructive',
            });
        } finally {
            setSendingSms(false);
        }
    };

    // Initiate call handler
    const handleInitiateCall = async () => {
        if (!person?.phone_number) {
            toast({
                title: 'Error',
                description: 'This person does not have a phone number',
                variant: 'destructive',
            });
            return;
        }

        setInitiatingCall(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('You must be logged in');

            const { error } = await supabase.functions.invoke('send-group-call', {
                body: {
                    recipientType: 'individual',
                    recipientId: person.id,
                    script: callScript || generateCallContext(person, memories),
                    organizationId: currentOrganization?.id,
                    campaignName: `Personal call to ${person.first_name} ${person.last_name}`,
                    createdBy: user.id,
                },
            });

            if (error) throw error;

            toast({
                title: 'Call Initiated',
                description: `AI call started to ${person.first_name}`,
            });
            setCallScript('');
            setShowCallForm(false);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to initiate call',
                variant: 'destructive',
            });
        } finally {
            setInitiatingCall(false);
        }
    };

    if (!person) return null;

    const initials = getInitials(person.first_name, person.last_name);
    const aiInsights = extractInsights(memories);
    const personalizedContext = generateCallContext(person, memories);
    const selectedMemory = memories[selectedMemoryIndex];
    const callSummaries = memories.filter(m => m.memory_type === 'call_summary');
    const totalCalls = callHistory.length || callSummaries.length;
    const lastContact = memories[0] ? getRelativeTime(memories[0].created_at) : 'No contact yet';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-2xl lg:max-w-4xl p-0 overflow-hidden bg-slate-950 text-slate-50 border-white/10"
            >
                <ScrollArea className="h-full">
                    <div className="p-6">
                        {/* Header */}
                        <SheetHeader className="mb-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Brain className="h-6 w-6 text-purple-400" />
                                        <SheetTitle className="text-xl font-bold text-white">AI Memory & Relationship Intelligence</SheetTitle>
                                    </div>
                                    <p className="text-slate-400 text-sm">Every conversation remembered. Every call more personal.</p>
                                </div>
                                <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 px-4 py-1">
                                    <Sparkles className="w-3 w-3 mr-1.5" />
                                    Powered by AI
                                </Badge>
                            </div>
                        </SheetHeader>

                        {/* Profile Card */}
                        <Card className="mb-6 overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center text-white text-2xl font-bold">
                                            {initials}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h2 className="text-lg font-semibold text-white truncate">
                                                    {person.first_name} {person.last_name}
                                                </h2>
                                                <p className="text-sm text-slate-400 capitalize">
                                                    {person.member_status.replace('_', ' ')}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={onEditClick}
                                                className="border-white/10 text-slate-300 hover:bg-white/5"
                                            >
                                                <Edit2 className="h-4 w-4 mr-1" />
                                                Edit
                                            </Button>
                                        </div>

                                        {/* Tags */}
                                        {person.tags && person.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-3">
                                                {person.tags.map((tag, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="outline"
                                                        className="text-xs border-white/10 text-slate-400"
                                                    >
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-slate-500">Total Calls</p>
                                        <p className="text-lg font-semibold text-white">{totalCalls}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-slate-500">Last Contact</p>
                                        <p className="text-lg font-semibold text-white">{lastContact}</p>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="mt-4 space-y-2">
                                    {person.email && (
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <Mail className="h-4 w-4" />
                                            <span>{person.email}</span>
                                        </div>
                                    )}
                                    {person.phone_number && (
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <Phone className="h-4 w-4" />
                                            <span>{person.phone_number}</span>
                                        </div>
                                    )}
                                    {person.birthday && (
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <Calendar className="h-4 w-4" />
                                            <span>Birthday: {formatDate(person.birthday)}</span>
                                        </div>
                                    )}
                                    {person.address?.street && (
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <MapPin className="h-4 w-4" />
                                            <span>{person.address.street}, {person.address.city}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        {person.phone_number && (
                            <Card className="mb-6 border border-white/10 bg-white/5">
                                <CardContent className="p-4">
                                    <div className="flex gap-2 mb-4">
                                        <Button
                                            variant={showSmsForm ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => {
                                                setShowSmsForm(!showSmsForm);
                                                setShowCallForm(false);
                                            }}
                                            className={
                                                showSmsForm
                                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0'
                                                    : 'border-white/10 text-slate-300 hover:bg-white/5'
                                            }
                                        >
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Send SMS
                                        </Button>
                                        <Button
                                            variant={showCallForm ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => {
                                                setShowCallForm(!showCallForm);
                                                setShowSmsForm(false);
                                            }}
                                            className={
                                                showCallForm
                                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0'
                                                    : 'border-white/10 text-slate-300 hover:bg-white/5'
                                            }
                                        >
                                            <Phone className="h-4 w-4 mr-2" />
                                            AI Call
                                        </Button>
                                    </div>

                                    {/* SMS Form */}
                                    {showSmsForm && (
                                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            <Textarea
                                                placeholder="Type your message..."
                                                value={smsMessage}
                                                onChange={(e) => setSmsMessage(e.target.value)}
                                                rows={3}
                                                className="resize-none bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                                            />
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500">
                                                    {smsMessage.length}/160 characters
                                                </span>
                                                <Button
                                                    size="sm"
                                                    onClick={handleSendSms}
                                                    disabled={sendingSms || !smsMessage.trim()}
                                                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                                                >
                                                    {sendingSms ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Sending...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="h-4 w-4 mr-2" />
                                                            Send
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Call Form */}
                                    {showCallForm && (
                                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            <Textarea
                                                placeholder="Custom script (leave blank for AI-personalized call based on memories)..."
                                                value={callScript}
                                                onChange={(e) => setCallScript(e.target.value)}
                                                rows={3}
                                                className="resize-none bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                                            />
                                            <div className="flex justify-end">
                                                <Button
                                                    size="sm"
                                                    onClick={handleInitiateCall}
                                                    disabled={initiatingCall}
                                                    className="bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white"
                                                >
                                                    {initiatingCall ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Calling...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Phone className="h-4 w-4 mr-2" />
                                                            Start Personalized Call
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* AI Memory Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                            {/* AI Insights Card */}
                            <Card className="lg:col-span-1 border border-white/10 bg-white/5">
                                <CardContent className="p-5">
                                    <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                                        <Lightbulb className="h-4 w-4 text-amber-400" />
                                        AI-Generated Insights
                                    </h3>
                                    {memoriesLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                        </div>
                                    ) : aiInsights.length > 0 ? (
                                        <ul className="space-y-2">
                                            {aiInsights.map((insight, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                                                    {insight}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-center py-6">
                                            <Brain className="h-10 w-10 mx-auto text-slate-600 mb-2" />
                                            <p className="text-sm text-slate-500">
                                                No insights yet. Insights will appear after conversations.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Conversation History */}
                            <Card className="lg:col-span-2 border border-white/10 bg-white/5">
                                <CardContent className="p-5">
                                    <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                                        <History className="h-4 w-4 text-cyan-400" />
                                        Conversation History
                                    </h3>
                                    {memoriesLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                        </div>
                                    ) : memories.length > 0 ? (
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                            {memories.map((memory, idx) => {
                                                const config = MEMORY_TYPE_CONFIG[memory.memory_type];
                                                const Icon = config.icon;
                                                const isSelected = idx === selectedMemoryIndex;

                                                return (
                                                    <button
                                                        key={memory.id}
                                                        onClick={() => setSelectedMemoryIndex(idx)}
                                                        className={`w-full text-left p-3 rounded-lg transition-all ${
                                                            isSelected
                                                                ? 'bg-purple-500/20 border border-purple-500/30'
                                                                : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-3.5 w-3.5 text-slate-400" />
                                                                <span className="text-xs text-slate-500">
                                                                    {formatDate(memory.created_at)}
                                                                </span>
                                                            </div>
                                                            <Badge
                                                                className={`text-xs border-0 ${
                                                                    memory.memory_type === 'call_summary'
                                                                        ? 'bg-blue-500/20 text-blue-400'
                                                                        : memory.memory_type === 'prayer_request'
                                                                        ? 'bg-purple-500/20 text-purple-400'
                                                                        : memory.memory_type === 'personal_note'
                                                                        ? 'bg-green-500/20 text-green-400'
                                                                        : 'bg-amber-500/20 text-amber-400'
                                                                }`}
                                                            >
                                                                {config.label}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-white font-medium line-clamp-2">{memory.content}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <MessageCircle className="h-10 w-10 mx-auto text-slate-600 mb-2" />
                                            <p className="text-sm text-slate-500">
                                                No conversation history yet.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Selected Memory Details */}
                        {selectedMemory && (
                            <Card className="mb-6 border border-white/10 bg-white/5">
                                <CardContent className="p-5">
                                    <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
                                        <MessageCircle className="h-4 w-4 text-blue-400" />
                                        Conversation Details
                                    </h3>
                                    <div className="p-3 rounded-lg bg-white/5 mb-3">
                                        <p className="text-sm text-slate-300">{selectedMemory.content}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-2">Key Insights Captured:</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge
                                                variant="outline"
                                                className="border-purple-500/30 text-purple-300 text-xs"
                                            >
                                                {MEMORY_TYPE_CONFIG[selectedMemory.memory_type].label}
                                            </Badge>
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(selectedMemory.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* AI-Personalized Call Context */}
                        <Card className="border border-green-500/20 bg-gradient-to-br from-green-500/10 to-cyan-500/10 mb-6">
                            <CardContent className="p-5">
                                <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
                                    <Sparkles className="h-4 w-4 text-green-400" />
                                    AI-Personalized Next Call
                                </h3>
                                <p className="text-xs text-green-300 mb-3">
                                    Based on all previous conversations, here's a personalized script:
                                </p>
                                <div className="p-3 rounded-lg bg-slate-900/50 font-mono text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                                    {personalizedContext.split('\n').map((line, idx) => (
                                        <p key={idx} className="mb-2">{line}</p>
                                    ))}
                                </div>
                                {person.phone_number && (
                                    <Button
                                        size="sm"
                                        className="w-full mt-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white"
                                        onClick={() => {
                                            setCallScript(personalizedContext);
                                            setShowCallForm(true);
                                            setShowSmsForm(false);
                                        }}
                                    >
                                        <Phone className="h-4 w-4 mr-2" />
                                        Start Personalized Call
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* How AI Memory Works */}
                        <div className="p-6 rounded-xl bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-500/20">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                    <Brain className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-white mb-2">How AI Memory Works</h4>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Every phone call and SMS conversation is automatically analyzed and remembered. The AI extracts key details—names,
                                        life events, prayer requests, interests—and uses them to make future interactions feel genuinely personal.
                                        When {person.first_name} picks up the phone, they don't hear a cold script. They hear someone who remembers them and cares about them as a person.
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
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
