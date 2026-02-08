import { useState, useEffect, useMemo } from 'react';
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
    CalendarClock,
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
    Zap,
    Loader2,
    Globe
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

        // The time the user enters is interpreted as their browser's local timezone
        // and converted to UTC for storage. The scheduled_for column is timestamp with time zone.
        const scheduledFor = new Date(
            `${formData.scheduledDate}T${formData.scheduledTime}`
        ).toISOString();

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

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-600 p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-white/20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-4">
                        <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 px-0 hover:px-2 transition-all -ml-2">
                            <Link to="/automations">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Automations
                            </Link>
                        </Button>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <CalendarClock className="h-10 w-10 text-blue-100" />
                            Scheduled Outreach
                        </h1>
                        <p className="text-lg text-blue-50 max-w-xl">
                            Plan ahead. Schedule SMS messages and AI calls to go out exactly when you want them to.
                        </p>
                    </div>

                    <Button
                        size="lg"
                        onClick={() => setShowCreateDialog(true)}
                        className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg border-0 font-semibold"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Schedule Outreach
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Scheduled</p>
                                <p className="text-2xl font-bold text-white">{scheduledOutreaches.length}</p>
                            </div>
                            <Clock className="h-8 w-8 text-blue-500/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">SMS Queued</p>
                                <p className="text-2xl font-bold text-white">
                                    {scheduledOutreaches.filter(o => o.message_type === 'sms').length}
                                </p>
                            </div>
                            <MessageSquare className="h-8 w-8 text-green-500/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">AI Calls Queued</p>
                                <p className="text-2xl font-bold text-white">
                                    {scheduledOutreaches.filter(o => o.message_type === 'call').length}
                                </p>
                            </div>
                            <Phone className="h-8 w-8 text-purple-500/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Completed</p>
                                <p className="text-2xl font-bold text-white">
                                    {completedOutreaches.filter(o => o.status === 'sent' || o.status === 'completed').length}
                                </p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-emerald-500/30" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Scheduled Outreaches */}
            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Upcoming Outreach</CardTitle>
                    <CardDescription>Scheduled SMS and AI Calls waiting to be sent</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="p-4 border border-white/10 rounded-lg">
                                    <Skeleton className="h-5 w-40 mb-2 bg-white/10" />
                                    <Skeleton className="h-4 w-full mb-2 bg-white/10" />
                                    <Skeleton className="h-4 w-24 bg-white/10" />
                                </div>
                            ))}
                        </div>
                    ) : scheduledOutreaches.length === 0 ? (
                        <div className="text-center py-12">
                            <CalendarClock className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                            <h3 className="font-medium text-white mb-1">No scheduled outreach</h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Schedule your first SMS or AI Call campaign
                            </p>
                            <Button onClick={() => setShowCreateDialog(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Schedule Outreach
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {scheduledOutreaches.map((outreach) => (
                                <div
                                    key={outreach.id}
                                    className="p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-start gap-3">
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${outreach.message_type === 'call'
                                                ? 'bg-purple-500/20'
                                                : 'bg-green-500/20'
                                                }`}>
                                                {outreach.message_type === 'call'
                                                    ? <Phone className="h-5 w-5 text-purple-400" />
                                                    : <MessageSquare className="h-5 w-5 text-green-400" />
                                                }
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <Badge variant="outline" className={
                                                        outreach.message_type === 'call'
                                                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                                            : 'bg-green-500/20 text-green-300 border-green-500/30'
                                                    }>
                                                        {outreach.message_type === 'call' ? 'AI Call' : 'SMS'}
                                                    </Badge>
                                                    {getStatusBadge(outreach.status)}
                                                </div>
                                                <p className="text-sm text-slate-300 line-clamp-2">{outreach.content}</p>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-slate-400">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => cancelOutreach(outreach.id)}>
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    Cancel
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => deleteOutreach(outreach.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Users className="h-4 w-4" />
                                            {getRecipientLabel(outreach)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(outreach.scheduled_for).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {new Date(outreach.scheduled_for).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        <Badge variant="secondary" className="ml-auto bg-white/10 text-slate-300">
                                            {formatTimeUntil(outreach.scheduled_for)}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* History */}
            {completedOutreaches.length > 0 && (
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Outreach History</CardTitle>
                        <CardDescription>Previously sent campaigns</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {completedOutreaches.slice(0, 10).map((outreach) => (
                                <div
                                    key={outreach.id}
                                    className="p-4 border border-white/10 rounded-lg opacity-75"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={
                                                outreach.message_type === 'call'
                                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                                    : 'bg-green-500/20 text-green-300 border-green-500/30'
                                            }>
                                                {outreach.message_type === 'call' ? 'AI Call' : 'SMS'}
                                            </Badge>
                                            {getStatusBadge(outreach.status)}
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {new Date(outreach.scheduled_for).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm line-clamp-1 text-slate-400">
                                        {outreach.content}
                                    </p>
                                    {(outreach.status === 'sent' || outreach.status === 'completed') && (
                                        <p className="text-xs text-slate-500 mt-2">
                                            Sent to {outreach.sent_count} recipient(s)
                                            {outreach.failed_count > 0 && `, ${outreach.failed_count} failed`}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-xl bg-slate-950 border-white/10 max-h-[90vh] overflow-y-auto p-0 gap-0">
                    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 border-b border-white/10">
                        <DialogHeader className="p-0">
                            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                                <CalendarClock className="h-6 w-6 text-blue-400" />
                                Schedule Outreach
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 text-base">
                                Setup a new campaign to reach your members.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <div className="space-y-6 p-6">
                        {/* Outreach Type */}
                        <div className="space-y-4">
                            <Label className="text-slate-300 text-base font-medium">What type of outreach?</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div
                                    onClick={() => setFormData({ ...formData, outreachType: 'sms' })}
                                    className={`cursor-pointer relative overflow-hidden rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-lg ${formData.outreachType === 'sms'
                                            ? 'border-green-500 bg-green-500/10 shadow-green-900/20'
                                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-3 rounded-full ${formData.outreachType === 'sms' ? 'bg-green-500 text-white' : 'bg-white/10 text-slate-400'
                                            }`}>
                                            <MessageSquare className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold ${formData.outreachType === 'sms' ? 'text-green-400' : 'text-slate-200'
                                                }`}>Send SMS</h3>
                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                Send a text message directly to members' phones.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => setFormData({ ...formData, outreachType: 'call' })}
                                    className={`cursor-pointer relative overflow-hidden rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-lg ${formData.outreachType === 'call'
                                            ? 'border-purple-500 bg-purple-500/10 shadow-purple-900/20'
                                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-3 rounded-full ${formData.outreachType === 'call' ? 'bg-purple-500 text-white' : 'bg-white/10 text-slate-400'
                                            }`}>
                                            <Phone className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold ${formData.outreachType === 'call' ? 'text-purple-400' : 'text-slate-200'
                                                }`}>AI Voice Call</h3>
                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                Initiate an interactive AI phone call to members.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recipients */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Recipients</Label>
                            <Select
                                value={formData.recipientType}
                                onValueChange={(value) => setFormData({ ...formData, recipientType: value })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
                                <Label className="text-slate-300">Select Group</Label>
                                <Select
                                    value={formData.groupId}
                                    onValueChange={(value) => setFormData({ ...formData, groupId: value })}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue placeholder="Choose a group" />
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

                        {/* SMS Message */}
                        {formData.outreachType === 'sms' && (
                            <div className="space-y-2">
                                <Label className="text-slate-300">Message</Label>
                                <Textarea
                                    rows={4}
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Enter your message..."
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                                />
                                <p className="text-xs text-slate-500">
                                    Use {'{Name}'} to personalize the message
                                </p>
                            </div>
                        )}

                        {/* AI Call Script */}
                        {formData.outreachType === 'call' && (
                            <div className="space-y-2">
                                <Label className="text-slate-300">Call Script</Label>
                                <Select
                                    value={formData.scriptId}
                                    onValueChange={(value) => setFormData({ ...formData, scriptId: value })}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue placeholder="Select a script" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {scripts.length === 0 ? (
                                            <div className="p-3 text-sm text-slate-500">
                                                No scripts available. Create one in Settings.
                                            </div>
                                        ) : (
                                            scripts.map((script) => (
                                                <SelectItem key={script.id} value={script.id}>
                                                    <div className="flex flex-col">
                                                        <span>{script.name}</span>
                                                        <span className="text-xs text-slate-500">{script.description}</span>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Date and Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Date</Label>
                                <Input
                                    type="date"
                                    min={getMinDate()}
                                    value={formData.scheduledDate}
                                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Time</Label>
                                <Input
                                    type="time"
                                    value={formData.scheduledTime}
                                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white"
                                />
                            </div>
                        </div>

                        {/* Timezone info */}
                        <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <Globe className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-blue-300">
                                Times are in your organization's timezone: <strong>{currentOrganization?.timezone || 'America/New_York'}</strong>
                            </span>
                        </div>
                    </div>
                    <DialogFooter className="p-6 pt-2 bg-slate-950/50 backdrop-blur-sm sticky bottom-0 border-t border-white/5">
                        <Button
                            variant="outline"
                            onClick={() => setShowCreateDialog(false)}
                            className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={createScheduledOutreach}
                            disabled={scheduling}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-900/20"
                        >
                            {scheduling ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            Schedule Campaign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
