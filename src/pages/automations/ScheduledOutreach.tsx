import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ArrowLeft,
    Plus,
    Clock,
    Users,
    MessageSquare,
    Calendar,
    Send,
    MoreVertical,
    Trash2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Phone,
    Loader2,
    Globe,
    Search,
    Filter
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Group {
    id: string;
    name: string;
}

interface CallScript {
    id: string;
    name: string;
    description: string;
}

interface ScheduledOutreach {
    id: string;
    message_type: 'sms' | 'call';
    content: string;
    recipient_type: string;
    recipient_ids: string[];
    scheduled_for: string;
    status: string;
    sent_count: number;
    failed_count: number;
    created_at: string;
    subject: string | null; // Used for script_id for calls
}

export default function ScheduledOutreach() {
    const { currentOrganization } = useAuthStore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [scheduling, setScheduling] = useState(false);
    const [outreaches, setOutreaches] = useState<ScheduledOutreach[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [scripts, setScripts] = useState<CallScript[]>([]);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        outreachType: 'sms' as 'sms' | 'call',
        recipientType: 'all',
        groupId: '',
        content: '',
        scriptId: '',
        scheduledDate: '',
        scheduledTime: '09:00',
    });

    useEffect(() => {
        if (currentOrganization?.id) {
            fetchData();
        }
    }, [currentOrganization?.id]);

    const fetchData = async () => {
        if (!currentOrganization?.id) return;

        setLoading(true);
        try {
            // Fetch scheduled outreaches
            const { data: outreachData, error: outreachError } = await supabase
                .from('scheduled_messages')
                .select('*')
                .eq('organization_id', currentOrganization.id)
                .order('scheduled_for', { ascending: true });

            if (outreachError && outreachError.code !== 'PGRST116' && outreachError.code !== 'PGRST205') {
                console.error('Error fetching outreaches:', outreachError);
            }

            setOutreaches(outreachData || []);

            // Fetch groups
            const { data: groupData } = await supabase
                .from('groups')
                .select('id, name')
                .eq('organization_id', currentOrganization.id);

            setGroups(groupData || []);

            // Fetch call scripts
            const { data: scriptData } = await supabase
                .from('call_scripts')
                .select('id, name, description')
                .eq('organization_id', currentOrganization.id);

            setScripts(scriptData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const createScheduledOutreach = async () => {
        if (!currentOrganization?.id) return;

        // Validate
        if (!formData.scheduledDate) {
            toast({ title: 'Error', description: 'Please select a date', variant: 'destructive' });
            return;
        }
        if (formData.outreachType === 'sms' && !formData.content) {
            toast({ title: 'Error', description: 'Please enter a message', variant: 'destructive' });
            return;
        }
        if (formData.outreachType === 'call' && !formData.scriptId) {
            toast({ title: 'Error', description: 'Please select a script', variant: 'destructive' });
            return;
        }

        // Interpret the user's date/time input as the organization's timezone
        // and convert to UTC for storage. The scheduled_for column is timestamp with time zone.
        const orgTimezone = currentOrganization?.timezone || 'America/New_York';
        const localDateTimeStr = `${formData.scheduledDate}T${formData.scheduledTime}:00`;

        // Build a Date object in the org's timezone by calculating the UTC offset
        // Using Intl.DateTimeFormat to determine the offset for the org's timezone
        const tempDate = new Date(localDateTimeStr + 'Z'); // treat as UTC temporarily
        const utcFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: orgTimezone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
        });
        // Get what UTC time looks like in the org's timezone
        const orgParts = utcFormatter.formatToParts(tempDate);
        const getPartValue = (type: string) => orgParts.find(p => p.type === type)?.value || '0';
        const orgViewOfUtc = new Date(
            `${getPartValue('year')}-${getPartValue('month')}-${getPartValue('day')}T${getPartValue('hour')}:${getPartValue('minute')}:${getPartValue('second')}Z`
        );
        // The offset is the difference between UTC and what UTC looks like in the org TZ
        const offsetMs = orgViewOfUtc.getTime() - tempDate.getTime();
        // Subtract the offset from the user's intended local time to get UTC
        const utcTime = new Date(tempDate.getTime() - offsetMs);
        const scheduledFor = utcTime.toISOString();

        setScheduling(true);
        try {
            const { error } = await supabase.from('scheduled_messages').insert({
                organization_id: currentOrganization.id,
                message_type: formData.outreachType,
                subject: formData.outreachType === 'call' ? formData.scriptId : null, // Store script ID in subject field
                content: formData.outreachType === 'sms' ? formData.content : `AI Call - Script: ${scripts.find(s => s.id === formData.scriptId)?.name || 'Unknown'}`,
                recipient_type: formData.recipientType,
                recipient_ids: formData.recipientType === 'group' && formData.groupId ? [formData.groupId] : [],
                scheduled_for: scheduledFor,
                status: 'scheduled',
            });

            if (error) throw error;

            toast({
                title: 'Outreach Scheduled!',
                description: `Your ${formData.outreachType === 'sms' ? 'SMS' : 'AI Call'} campaign is scheduled for ${new Date(scheduledFor).toLocaleString()}`,
            });

            setShowCreateDialog(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error creating scheduled outreach:', error);
            toast({
                title: 'Error',
                description: 'Failed to schedule outreach.',
                variant: 'destructive',
            });
        } finally {
            setScheduling(false);
        }
    };

    const cancelOutreach = async (id: string) => {
        try {
            const { error } = await supabase
                .from('scheduled_messages')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) throw error;

            setOutreaches((prev) =>
                prev.map((m) => (m.id === id ? { ...m, status: 'cancelled' } : m))
            );

            toast({ title: 'Outreach cancelled' });
        } catch (error) {
            console.error('Error cancelling outreach:', error);
            toast({ title: 'Error', description: 'Failed to cancel.', variant: 'destructive' });
        }
    };

    const deleteOutreach = async (id: string) => {
        try {
            const { error } = await supabase
                .from('scheduled_messages')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setOutreaches((prev) => prev.filter((m) => m.id !== id));
            toast({ title: 'Outreach deleted' });
        } catch (error) {
            console.error('Error deleting outreach:', error);
            toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
        }
    };

    const resetForm = () => {
        setFormData({
            outreachType: 'sms',
            recipientType: 'all',
            groupId: '',
            content: '',
            scriptId: '',
            scheduledDate: '',
            scheduledTime: '09:00',
        });
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            processing: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            sent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            failed: 'bg-red-500/10 text-red-400 border-red-500/20',
            cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        };
        const icons: Record<string, React.ReactNode> = {
            scheduled: <Clock className="h-3 w-3 mr-1" />,
            processing: <AlertCircle className="h-3 w-3 mr-1" />,
            sent: <CheckCircle2 className="h-3 w-3 mr-1" />,
            completed: <CheckCircle2 className="h-3 w-3 mr-1" />,
            failed: <XCircle className="h-3 w-3 mr-1" />,
            cancelled: <XCircle className="h-3 w-3 mr-1" />,
        };

        return (
            <Badge variant="outline" className={styles[status] || styles.scheduled}>
                {icons[status]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const getRecipientLabel = (outreach: ScheduledOutreach) => {
        if (outreach.recipient_type === 'all') return 'All Members';
        if (outreach.recipient_type === 'group') {
            const group = groups.find((g) => outreach.recipient_ids.includes(g.id));
            return group ? group.name : 'Selected Group';
        }
        return `${outreach.recipient_ids.length} person(s)`;
    };

    const formatTimeUntil = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = date.getTime() - now.getTime();

        if (diff < 0) return 'Past due';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `In ${days} day${days > 1 ? 's' : ''}`;
        if (hours > 0) return `In ${hours} hour${hours > 1 ? 's' : ''}`;
        return 'Less than an hour';
    };

    const getMinDate = () => new Date().toISOString().split('T')[0];
    const scheduledOutreaches = outreaches.filter((m) => m.status === 'scheduled');
    const completedOutreaches = outreaches.filter((m) => ['sent', 'completed', 'failed', 'cancelled'].includes(m.status));

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-6 space-y-6">
                <Skeleton className="h-12 w-48 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
            {/* Standard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                            <Link to="/automations">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Automations
                            </Link>
                        </Button>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Scheduled Outreach</h1>
                    <p className="text-muted-foreground mt-1">
                        Plan and schedule SMS messages and AI calls for the future.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Campaign
                    </Button>
                </div>
            </div>

            {/* Stats Cards - Gradient Style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        title: "Total Campaigns",
                        value: outreaches.length,
                        icon: Calendar,
                        color: "text-blue-400",
                        bgColor: "bg-blue-500/20",
                        cardBg: "from-blue-500/10 to-blue-500/5",
                        borderColor: "border-blue-500/20"
                    },
                    {
                        title: "Scheduled",
                        value: scheduledOutreaches.length,
                        icon: Clock,
                        color: "text-amber-400",
                        bgColor: "bg-amber-500/20",
                        cardBg: "from-amber-500/10 to-amber-500/5",
                        borderColor: "border-amber-500/20"
                    },
                    {
                        title: "Completed",
                        value: completedOutreaches.filter(o => o.status === 'sent' || o.status === 'completed').length,
                        icon: CheckCircle2,
                        color: "text-teal-400",
                        bgColor: "bg-teal-500/20",
                        cardBg: "from-teal-500/10 to-teal-500/5",
                        borderColor: "border-teal-500/20"
                    },
                    {
                        title: "Failed",
                        value: completedOutreaches.filter(o => o.status === 'failed').length,
                        icon: XCircle,
                        color: "text-rose-400",
                        bgColor: "bg-rose-500/20",
                        cardBg: "from-rose-500/10 to-rose-500/5",
                        borderColor: "border-rose-500/20"
                    }
                ].map((stat, idx) => (
                    <div key={idx} className={cn("p-5 rounded-xl bg-gradient-to-br border", stat.cardBg, stat.borderColor)}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bgColor)}>
                                <stat.icon className={cn("h-5 w-5", stat.color)} />
                            </div>
                            <p className="text-sm font-medium text-slate-400">{stat.title}</p>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 gap-8">
                {/* Scheduled Outreaches */}
                <Card>
                    <CardHeader className="px-6 py-4 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Upcoming Queue</CardTitle>
                                <CardDescription>Campaigns waiting to be sent</CardDescription>
                            </div>
                            <Badge variant="secondary">{scheduledOutreaches.length} scheduled</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {scheduledOutreaches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <Clock className="h-10 w-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium">No scheduled campaigns</p>
                                <Button variant="link" onClick={() => setShowCreateDialog(true)} className="text-primary mt-1">
                                    Schedule one now
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {scheduledOutreaches.map((outreach) => (
                                    <div key={outreach.id} className="p-4 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 group">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={`p-2.5 rounded-full shrink-0 ${outreach.message_type === 'call' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                                }`}>
                                                {outreach.message_type === 'call' ? <Phone className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                                            </div>
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">
                                                        {outreach.message_type === 'call' ? 'AI Voice Call' : 'SMS Campaign'}
                                                    </span>
                                                    {getStatusBadge(outreach.status)}
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-1 break-all">
                                                    {outreach.content}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {getRecipientLabel(outreach)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(outreach.scheduled_for).toLocaleDateString()} at {new Date(outreach.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 self-start sm:self-center ml-14 sm:ml-0 w-full sm:w-auto justify-between sm:justify-end">
                                            <Badge variant="outline" className="bg-muted/50 whitespace-nowrap">
                                                {formatTimeUntil(outreach.scheduled_for)}
                                            </Badge>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => cancelOutreach(outreach.id)}>
                                                        <XCircle className="h-4 w-4 mr-2" /> Cancel
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => deleteOutreach(outreach.id)} className="text-destructive">
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* History */}
                {completedOutreaches.length > 0 && (
                    <Card>
                        <CardHeader className="px-6 py-4 border-b bg-muted/20">
                            <CardTitle className="text-lg">History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {completedOutreaches.slice(0, 10).map((outreach) => (
                                    <div key={outreach.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors opacity-80 hover:opacity-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${outreach.message_type === 'call' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                                }`}>
                                                {outreach.message_type === 'call' ? <Phone className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium line-clamp-1">{outreach.content}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <span>{new Date(outreach.scheduled_for).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>{outreach.sent_count} sent</span>
                                                </p>
                                            </div>
                                        </div>
                                        {getStatusBadge(outreach.status)}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0">
                    <div className="p-6 bg-muted/30 border-b">
                        <DialogHeader>
                            <DialogTitle className="text-xl flex items-center gap-2">
                                <Send className="h-5 w-5 text-primary" />
                                Schedule New Outreach
                            </DialogTitle>
                            <DialogDescription>
                                Create a new campaign to connect with your members.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                        {/* Type Selection */}
                        <div className="space-y-3">
                            <Label>Campaign Type</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:bg-muted/50 ${formData.outreachType === 'sms' ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : 'border-transparent bg-muted/30'
                                        }`}
                                    onClick={() => setFormData({ ...formData, outreachType: 'sms' })}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-full ${formData.outreachType === 'sms' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <MessageSquare className="h-4 w-4" />
                                        </div>
                                        <span className="font-semibold">SMS Message</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Send a text message directly to members.</p>
                                </div>
                                <div
                                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:bg-muted/50 ${formData.outreachType === 'call' ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/10' : 'border-transparent bg-muted/30'
                                        }`}
                                    onClick={() => setFormData({ ...formData, outreachType: 'call' })}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-full ${formData.outreachType === 'call' ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <span className="font-semibold">Voice Call</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Send an interactive AI voice call.</p>
                                </div>
                            </div>
                        </div>

                        {/* Audience */}
                        <div className="space-y-4">
                            <Label>Audience</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground font-normal">Who to send to?</Label>
                                    <Select
                                        value={formData.recipientType}
                                        onValueChange={(value) => setFormData({ ...formData, recipientType: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Members</SelectItem>
                                            <SelectItem value="group">Specific Group</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.recipientType === 'group' && (
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground font-normal">Select Group</Label>
                                        <Select
                                            value={formData.groupId}
                                            onValueChange={(value) => setFormData({ ...formData, groupId: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose group..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {groups.map((group) => (
                                                    <SelectItem key={group.id} value={group.id}>
                                                        {group.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Validated Content Section */}
                        <div className="space-y-3">
                            {formData.outreachType === 'sms' ? (
                                <div className="space-y-2">
                                    <Label>Message Content</Label>
                                    <Textarea
                                        rows={4}
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="Type your message here..."
                                    />
                                    <p className="text-xs text-muted-foreground">Shortcodes: {'{Name}'}, {'{Church}'}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Select Script</Label>
                                    <Select
                                        value={formData.scriptId}
                                        onValueChange={(value) => setFormData({ ...formData, scriptId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a call script" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {scripts.map((script) => (
                                                <SelectItem key={script.id} value={script.id}>
                                                    <span className="font-medium">{script.name}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {scripts.length === 0 && (
                                        <p className="text-xs text-destructive">No call scripts found. Please create one in Settings.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Scheduling */}
                        <div className="space-y-3">
                            <Label>Schedule</Label>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        type="date"
                                        min={getMinDate()}
                                        value={formData.scheduledDate}
                                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        type="time"
                                        value={formData.scheduledTime}
                                        onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Globe className="h-3 w-3" />
                                Times are in {currentOrganization?.timezone || 'UTC'}
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-muted/30 border-t">
                        <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        <Button onClick={createScheduledOutreach} disabled={scheduling}>
                            {scheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Schedule Campaign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
