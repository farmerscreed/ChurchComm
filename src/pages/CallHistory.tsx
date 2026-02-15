import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Clock,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  User,
  Calendar,
  Timer,
  BarChart3,
  Activity,
  Heart,
  AlertCircle,
  ChevronRight,
  Play,
  FileText,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Minus,
  RefreshCw,
  Download,
  Eye,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallLog {
  id: string;
  vapi_call_id: string | null;
  call_status: string | null;
  call_duration: number | null;
  call_summary: string | null;
  full_transcript: string | null;
  member_response_type: 'positive' | 'neutral' | 'negative' | 'unclear' | 'no_response' | null;
  crisis_indicators: boolean | null;
  crisis_details: string | null;
  follow_up_needed: boolean | null;
  needs_pastoral_care: boolean | null;
  prayer_requests: string[] | null;
  specific_interests: string[] | null;
  escalation_priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  created_at: string;
  updated_at: string | null;
  member_id: string;
  phone_number_used: string | null;
  people?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    email: string | null;
  } | null;
  ended_reason: string | null;
  escalation_status: 'open' | 'resolved' | 'ignored' | null;
}

interface CallStats {
  totalCalls: number;
  completedCalls: number;
  avgDuration: number;
  positiveResponses: number;
  neutralResponses: number;
  negativeResponses: number;
  escalations: number;
  followUpsNeeded: number;
}

export default function CallHistory() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [stats, setStats] = useState<CallStats>({
    totalCalls: 0,
    completedCalls: 0,
    avgDuration: 0,
    positiveResponses: 0,
    neutralResponses: 0,
    negativeResponses: 0,
    escalations: 0,
    followUpsNeeded: 0
  });
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (currentOrganization?.id) {
      loadCallData();
    }
  }, [currentOrganization]);

  const loadCallData = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      // Query vapi_call_logs with people join via member_id foreign key
      const { data, error } = await supabase
        .from('vapi_call_logs')
        .select(`
          *,
          people:member_id (
            id,
            first_name,
            last_name,
            phone_number,
            email
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching call logs:', error);
        throw error;
      }

      console.log('Loaded call logs:', data?.length || 0);
      const logs = (data || []) as CallLog[];
      setCallLogs(logs);

      // Calculate stats with null safety
      const completed = logs.filter(l => l.call_status === 'completed' || l.call_status === 'ended').length;
      const totalDuration = logs.reduce((sum, l) => sum + (l.call_duration ?? 0), 0);
      const positive = logs.filter(l => l.member_response_type === 'positive').length;
      const neutral = logs.filter(l => l.member_response_type === 'neutral' || !l.member_response_type).length;
      const negative = logs.filter(l => l.member_response_type === 'negative').length;
      // Only count OPEN escalations for stats
      const escalations = logs.filter(l =>
        (l.crisis_indicators === true || l.needs_pastoral_care === true) &&
        l.escalation_status === 'open'
      ).length;
      const followUps = logs.filter(l => l.follow_up_needed === true).length;

      setStats({
        totalCalls: logs.length,
        completedCalls: completed,
        avgDuration: logs.length > 0 ? Math.round(totalDuration / logs.length) : 0,
        positiveResponses: positive,
        neutralResponses: neutral,
        negativeResponses: negative,
        escalations,
        followUpsNeeded: followUps
      });
    } catch (error: any) {
      console.error('Error loading call data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load call history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCalls = callLogs.filter(call => {
    const personName = `${call.people?.first_name || ''} ${call.people?.last_name || ''}`.toLowerCase();
    const phoneNum = call.phone_number_used || call.people?.phone_number || '';

    const matchesSearch = searchQuery === '' ||
      personName.includes(searchQuery.toLowerCase()) ||
      phoneNum.includes(searchQuery) ||
      call.call_summary?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || call.call_status === statusFilter;
    const matchesSentiment = sentimentFilter === 'all' ||
      call.member_response_type === sentimentFilter ||
      (sentimentFilter === 'neutral' && !call.member_response_type);

    const matchesTab = activeTab === 'all' ||
      (activeTab === 'escalations' && (call.crisis_indicators === true || call.needs_pastoral_care === true)) ||
      (activeTab === 'follow-ups' && call.follow_up_needed === true) ||
      (activeTab === 'completed' && (call.call_status === 'completed' || call.call_status === 'ended'));

    return matchesSearch && matchesStatus && matchesSentiment && matchesTab;
  });

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-teal-400" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-rose-400" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-amber-400" />;
      default:
        return <Minus className="h-4 w-4 text-slate-500" />;
    }
  };

  const getSentimentBadge = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-teal-500/20 text-teal-400 border-0">Positive</Badge>;
      case 'negative':
        return <Badge className="bg-rose-500/20 text-rose-400 border-0">Negative</Badge>;
      case 'neutral':
        return <Badge className="bg-amber-500/20 text-amber-400 border-0">Neutral</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-0">Unknown</Badge>;
    }
  };

  const getFailureReason = (call: CallLog): string | null => {
    if (call.call_status === 'completed' || call.call_status === 'ended') return null;
    if (call.call_status === 'in_progress' || call.call_status === 'queued' || call.call_status === 'initiated') return null;

    const reason = (call.ended_reason || call.call_status || '').toLowerCase();

    if (reason.includes('no-answer') || reason.includes('unanswered') || reason === 'customer-did-not-pick-up' || reason === 'no_answer')
      return 'Recipient did not answer';
    if (reason.includes('busy') || reason === 'customer-busy')
      return 'Phone line was busy';
    if (reason.includes('voicemail'))
      return 'Went to voicemail';
    if (reason.includes('rejected') || reason.includes('declined'))
      return 'Call was declined';
    if (reason.includes('invalid') || reason.includes('wrong-number'))
      return 'Invalid phone number';
    if (reason.includes('pipeline-error') || reason.includes('error'))
      return 'Technical error occurred';
    if (reason.includes('silence') || reason.includes('timeout'))
      return 'Call timed out (no response)';
    if (reason.includes('max-duration'))
      return 'Maximum call duration reached';
    if (reason.includes('insufficient') || reason.includes('balance') || reason.includes('funds'))
      return 'Insufficient account balance';
    if (reason === 'failed')
      return 'Call could not be connected';

    return reason ? `Failed: ${call.ended_reason || call.call_status}` : 'Call failed';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'ended':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'no_answer':
        return <PhoneMissed className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
      case 'queued':
        return <PhoneCall className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Phone className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  const resolveEscalation = async (callId: string) => {
    try {
      const { error } = await supabase
        .from('vapi_call_logs')
        .update({ escalation_status: 'resolved' })
        .eq('id', callId);

      if (error) throw error;

      // Update local state
      setCallLogs(prev => prev.map(c =>
        c.id === callId ? { ...c, escalation_status: 'resolved' } : c
      ));

      // Update stats (decrement escalations count)
      setStats(prev => ({
        ...prev,
        escalations: Math.max(0, prev.escalations - 1)
      }));

      // Update selected call if open
      if (selectedCall?.id === callId) {
        setSelectedCall(prev => prev ? { ...prev, escalation_status: 'resolved' } : null);
      }

      toast({
        title: 'Escalation Resolved',
        description: 'The call has been marked as resolved.',
      });
    } catch (error) {
      console.error('Error resolving escalation:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve escalation.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading call history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <PhoneCall className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Call History & Analytics
            </span>
          </h1>
          <p className="text-slate-400 mt-1">
            Track and analyze all AI calling activity
          </p>
        </div>
        <Button onClick={loadCallData} variant="outline" className="gap-2 self-start sm:self-auto border-white/10 text-slate-300 hover:bg-white/5">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Calls",
            value: stats.totalCalls,
            subtext: `${stats.completedCalls} completed`,
            icon: Phone,
            color: "text-blue-400",
            bgColor: "bg-blue-500/20",
            cardBg: "from-blue-500/10 to-blue-500/5",
            borderColor: "border-blue-500/20",
            progressColor: "bg-blue-500",
            progress: stats.totalCalls > 0 ? (stats.completedCalls / stats.totalCalls) * 100 : 0
          },
          {
            title: "Avg Duration",
            value: formatDuration(stats.avgDuration),
            subtext: "minutes per call",
            icon: Timer,
            color: "text-violet-400",
            bgColor: "bg-violet-500/20",
            cardBg: "from-violet-500/10 to-violet-500/5",
            borderColor: "border-violet-500/20",
            progressColor: "bg-violet-500",
            progress: null
          },
          {
            title: "Positive Sentiment",
            value: stats.positiveResponses,
            subtext: `${stats.totalCalls > 0 ? Math.round((stats.positiveResponses / stats.totalCalls) * 100) : 0}% of total`,
            icon: ThumbsUp,
            color: "text-teal-400",
            bgColor: "bg-teal-500/20",
            cardBg: "from-teal-500/10 to-teal-500/5",
            borderColor: "border-teal-500/20",
            progressColor: "bg-teal-500",
            progress: stats.totalCalls > 0 ? (stats.positiveResponses / stats.totalCalls) * 100 : 0
          },
          {
            title: "Needs Attention",
            value: stats.escalations + stats.followUpsNeeded,
            subtext: `${stats.escalations} urgent · ${stats.followUpsNeeded} follow-up`,
            icon: AlertTriangle,
            color: "text-amber-400",
            bgColor: "bg-amber-500/20",
            cardBg: "from-amber-500/10 to-amber-500/5",
            borderColor: "border-amber-500/20",
            progressColor: "bg-amber-500",
            progress: null
          }
        ].map((stat, idx) => (
          <div key={idx} className={cn("p-5 rounded-xl bg-gradient-to-br border", stat.cardBg, stat.borderColor)}>
            <div className="flex items-center justify-between mb-4">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <p className="text-sm font-medium text-slate-400">{stat.title}</p>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <p className="text-xs text-slate-500">{stat.subtext}</p>
            </div>
            {stat.progress !== null && (
              <Progress value={stat.progress} className={cn("h-2 mt-4", stat.progressColor)} />
            )}
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Call Filters & List (Takes 3 columns) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex flex-col gap-4">
                {/* Scrollable tabs on mobile */}
                <div className="overflow-x-auto scrollbar-hide -mx-6 px-6">
                  <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1 min-w-max">
                    {[
                      { id: "all", label: "All" },
                      { id: "completed", label: "Completed" },
                      { id: "escalations", label: "Urgent" },
                      { id: "follow-ups", label: "Follow-ups" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                          activeTab === tab.id
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      placeholder="Search transcripts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500"
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 hover:bg-white/5">
                    <Filter className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-0">
              <ScrollArea className="h-[calc(100vh-320px)] min-h-[500px]">
                {filteredCalls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-medium text-white">No calls found</h3>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">
                      We couldn't find any call logs matching your current filters.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {filteredCalls.map((call) => (
                      <div
                        key={call.id}
                        className="group flex flex-col sm:flex-row gap-4 p-4 sm:p-6 bg-white/5 border-b border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedCall(call);
                          setIsDetailOpen(true);
                        }}
                      >
                        {/* Left: Avatar & Sentiment */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:w-16 shrink-0">
                          <div className="relative">
                            <Avatar className="h-12 w-12 border-2 border-slate-800 shadow-sm">
                              <AvatarFallback className={cn(
                                "text-sm font-bold",
                                call.member_response_type === 'positive' && "bg-gradient-to-br from-teal-500/40 to-teal-500/30 text-teal-300",
                                call.member_response_type === 'negative' && "bg-gradient-to-br from-rose-500/40 to-rose-500/30 text-rose-300",
                                call.member_response_type === 'neutral' && "bg-gradient-to-br from-amber-500/40 to-amber-500/30 text-amber-300",
                                !call.member_response_type && "bg-gradient-to-br from-slate-500/40 to-slate-500/30 text-slate-300"
                              )}>
                                {getInitials(call.people?.first_name, call.people?.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "absolute -bottom-1 -right-1 rounded-full p-1 shadow-sm",
                              call.member_response_type === 'positive' && "bg-teal-500/20",
                              call.member_response_type === 'negative' && "bg-rose-500/20",
                              call.member_response_type === 'neutral' && "bg-amber-500/20",
                              !call.member_response_type && "bg-slate-500/20"
                            )}>
                              {getSentimentIcon(call.member_response_type)}
                            </div>
                          </div>
                        </div>

                        {/* Middle: Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-base text-white">
                                {call.people?.first_name || call.people?.last_name
                                  ? `${call.people?.first_name || ''} ${call.people?.last_name || ''}`.trim()
                                  : (call.phone_number_used || 'Unknown')
                                }
                              </h4>
                              {/* Status Badge with appropriate colors */}
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide flex items-center gap-1",
                                (call.call_status === 'completed' || call.call_status === 'ended') && "bg-green-500/20 text-green-400",
                                call.call_status === 'failed' && "bg-red-500/20 text-red-400",
                                call.call_status === 'no_answer' && "bg-yellow-500/20 text-yellow-400",
                                (call.call_status === 'in_progress' || call.call_status === 'queued' || call.call_status === 'initiated') && "bg-blue-500/20 text-blue-400",
                                !['completed', 'ended', 'failed', 'no_answer', 'in_progress', 'queued', 'initiated'].includes(call.call_status || '') && "bg-slate-500/20 text-slate-400"
                              )}>
                                {getStatusIcon(call.call_status || '')}
                                {call.call_status === 'initiated' ? 'Pending' : call.call_status}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                            </span>
                          </div>

                          <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                            {call.call_summary || <span className="italic text-slate-500">No summary available.</span>}
                          </p>

                          {/* Tags Row */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            {call.crisis_indicators && (
                              <Badge className="h-5 px-2 text-[10px] gap-1 bg-red-500/20 text-red-400 border-0">
                                <AlertTriangle className="h-3 w-3" /> Crisis
                              </Badge>
                            )}
                            {call.prayer_requests && call.prayer_requests.length > 0 && (
                              <Badge className="h-5 px-2 text-[10px] gap-1 bg-purple-500/20 text-purple-400 border-0">
                                <Sparkles className="h-3 w-3" /> {call.prayer_requests.length} Prayer Req
                              </Badge>
                            )}
                            {call.call_duration !== null && (
                              <span className="inline-flex items-center text-xs text-slate-400 bg-slate-500/20 px-2 py-0.5 rounded-full">
                                <Timer className="h-3 w-3 mr-1" />
                                {formatDuration(call.call_duration)}
                              </span>
                            )}
                            {getFailureReason(call) && (
                              <span className="inline-flex items-center text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {getFailureReason(call)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Action Arrow */}
                        <div className="hidden sm:flex items-center justify-center w-8 shrink-0">
                          <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-purple-400 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Quick Insights */}
        <div className="space-y-6">
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">Recent Activity</h3>

            <div className="space-y-6">
              {/* Sentiment Trend */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white">Call Sentiment</span>
                  <span className="text-xs text-slate-500">Last 30 days</span>
                </div>
                <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-800">
                  <div style={{ width: `${(stats.positiveResponses / (stats.totalCalls || 1)) * 100}%` }} className="bg-teal-500" />
                  <div style={{ width: `${(stats.neutralResponses / (stats.totalCalls || 1)) * 100}%` }} className="bg-amber-400" />
                  <div style={{ width: `${(stats.negativeResponses / (stats.totalCalls || 1)) * 100}%` }} className="bg-rose-500" />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-teal-500" /> Positive</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> Neutral</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Negative</div>
                </div>
              </div>

              <div className="border-t border-white/10" />

              {/* Recent escalations mini-list */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  Urgent Needs
                </h4>
                {callLogs.filter(c => c.crisis_indicators || c.needs_pastoral_care).length === 0 ? (
                  <div className="text-xs text-slate-500 italic">No urgent needs detected.</div>
                ) : (
                  <div className="space-y-2">
                    {callLogs.filter(c => c.crisis_indicators || c.needs_pastoral_care).slice(0, 3).map(call => (
                      <div key={call.id} className="text-xs flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="font-medium text-white truncate max-w-[100px]">
                          {call.people?.first_name || 'Unknown'}
                        </span>
                        {call.crisis_indicators ? (
                          <Badge className="h-5 text-[9px] px-2 bg-red-500/20 text-red-400 border-0">CRISIS</Badge>
                        ) : (
                          <Badge className="h-5 text-[9px] px-2 bg-pink-500/20 text-pink-400 border-0">CARE</Badge>
                        )}
                        {call.escalation_status === 'resolved' && (
                          <Badge className="h-5 text-[9px] px-2 bg-green-500/20 text-green-400 border-0 ml-1">RESOLVED</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call Detail Dialog - Overhauled Modern Design */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] w-[95vw] sm:w-full overflow-hidden flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-white/10 p-0">
          {/* Header with gradient background */}
          <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-purple-900/30 via-blue-900/20 to-slate-900/30 border-b border-white/10">
            <DialogHeader>
              <DialogTitle className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
                <div className="relative">
                  <Avatar className="h-16 w-16 border-2 border-white/20 shadow-xl">
                    <AvatarFallback className={cn(
                      "text-xl font-bold",
                      selectedCall?.member_response_type === 'positive' && "bg-gradient-to-br from-teal-500 to-emerald-600 text-white",
                      selectedCall?.member_response_type === 'negative' && "bg-gradient-to-br from-rose-500 to-red-600 text-white",
                      selectedCall?.member_response_type === 'neutral' && "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
                      !selectedCall?.member_response_type && "bg-gradient-to-br from-slate-500 to-slate-600 text-white"
                    )}>
                      {getInitials(selectedCall?.people?.first_name ?? undefined, selectedCall?.people?.last_name ?? undefined)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 rounded-full p-1.5 shadow-lg border-2 border-slate-900",
                    selectedCall?.member_response_type === 'positive' && "bg-teal-500",
                    selectedCall?.member_response_type === 'negative' && "bg-rose-500",
                    selectedCall?.member_response_type === 'neutral' && "bg-amber-500",
                    !selectedCall?.member_response_type && "bg-slate-500"
                  )}>
                    {getSentimentIcon(selectedCall?.member_response_type || null)}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-xl font-semibold text-white">
                      {selectedCall?.people?.first_name || selectedCall?.people?.last_name
                        ? `${selectedCall?.people?.first_name || ''} ${selectedCall?.people?.last_name || ''}`.trim()
                        : 'Unknown Caller'}
                    </span>
                    {/* Status badge */}
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wide flex items-center gap-1.5",
                      (selectedCall?.call_status === 'completed' || selectedCall?.call_status === 'ended') && "bg-green-500/20 text-green-400 border border-green-500/30",
                      selectedCall?.call_status === 'failed' && "bg-red-500/20 text-red-400 border border-red-500/30",
                      selectedCall?.call_status === 'no_answer' && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
                      (selectedCall?.call_status === 'in_progress' || selectedCall?.call_status === 'queued') && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                      !['completed', 'ended', 'failed', 'no_answer', 'in_progress', 'queued'].includes(selectedCall?.call_status || '') && "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                    )}>
                      {getStatusIcon(selectedCall?.call_status || '')}
                      {selectedCall?.call_status?.replace('_', ' ') || 'Unknown'}
                    </span>
                    {/* Resolution Button */}
                    {(selectedCall?.crisis_indicators || selectedCall?.needs_pastoral_care) && selectedCall?.escalation_status === 'open' && (
                      <Button
                        size="sm"
                        onClick={() => selectedCall && resolveEscalation(selectedCall.id)}
                        className="ml-auto sm:ml-2 h-7 bg-green-600 hover:bg-green-700 text-white border-0 text-xs font-semibold shadow-lg shadow-green-900/20"
                      >
                        <Check className="h-3 w-3 mr-1.5" />
                        Resolve Issue
                      </Button>
                    )}
                    {(selectedCall?.crisis_indicators || selectedCall?.needs_pastoral_care) && selectedCall?.escalation_status === 'resolved' && (
                      <Badge variant="outline" className="ml-auto sm:ml-2 border-green-500/30 text-green-400 bg-green-500/10">
                        <Check className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {selectedCall?.phone_number_used || selectedCall?.people?.phone_number || 'No phone'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {selectedCall && format(new Date(selectedCall.created_at), 'MMM d, yyyy')}
                    </span>
                    {selectedCall?.ended_reason && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1.5 text-slate-500" title="Ended Reason">
                          <PhoneOff className="h-3.5 w-3.5" />
                          {selectedCall.ended_reason}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription className="sr-only">Call details and transcript</DialogDescription>
            </DialogHeader>
          </div>

          {/* Stats Bar */}
          <div className="px-6 py-3 bg-white/5 border-b border-white/10">
            <div className="flex flex-wrap items-center justify-center gap-6 text-center">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Time</p>
                  <p className="text-sm font-semibold text-white">
                    {selectedCall && format(new Date(selectedCall.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Timer className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Duration</p>
                  <p className="text-sm font-semibold text-white">
                    {selectedCall?.call_duration ? formatDuration(selectedCall.call_duration) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center",
                  selectedCall?.member_response_type === 'positive' && "bg-teal-500/20",
                  selectedCall?.member_response_type === 'negative' && "bg-rose-500/20",
                  (!selectedCall?.member_response_type || selectedCall?.member_response_type === 'neutral') && "bg-amber-500/20"
                )}>
                  {selectedCall?.member_response_type === 'positive' && <ThumbsUp className="h-4 w-4 text-teal-400" />}
                  {selectedCall?.member_response_type === 'negative' && <ThumbsDown className="h-4 w-4 text-rose-400" />}
                  {(!selectedCall?.member_response_type || selectedCall?.member_response_type === 'neutral') && <Minus className="h-4 w-4 text-amber-400" />}
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Sentiment</p>
                  <p className={cn(
                    "text-sm font-semibold capitalize",
                    selectedCall?.member_response_type === 'positive' && "text-teal-400",
                    selectedCall?.member_response_type === 'negative' && "text-rose-400",
                    (!selectedCall?.member_response_type || selectedCall?.member_response_type === 'neutral') && "text-amber-400"
                  )}>
                    {selectedCall?.member_response_type || 'Neutral'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections - Replaced ScrollArea with native div for better mobile scrolling */}
          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            <div className="space-y-6 pb-10">
              {/* Alert Badges */}
              {(selectedCall?.crisis_indicators || selectedCall?.needs_pastoral_care || selectedCall?.follow_up_needed) && (
                <div className="flex flex-wrap gap-2 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                  <span className="w-full text-xs uppercase tracking-wider text-red-400/70 mb-1 font-medium">⚠️ Attention Required</span>
                  {selectedCall?.crisis_indicators && (
                    <Badge className="gap-1.5 bg-red-500/30 text-red-300 border border-red-500/40 px-3 py-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Crisis Detected
                    </Badge>
                  )}
                  {selectedCall?.needs_pastoral_care && (
                    <Badge className="bg-pink-500/30 text-pink-300 border border-pink-500/40 px-3 py-1 gap-1.5">
                      <Heart className="h-3.5 w-3.5" />
                      Needs Pastoral Care
                    </Badge>
                  )}
                  {selectedCall?.follow_up_needed && (
                    <Badge className="bg-blue-500/30 text-blue-300 border border-blue-500/40 px-3 py-1 gap-1.5">
                      <PhoneCall className="h-3.5 w-3.5" />
                      Follow-up Required
                    </Badge>
                  )}
                </div>
              )}

              {/* AI Summary */}
              {selectedCall?.call_summary && (
                <div className="rounded-xl overflow-hidden border border-purple-500/20">
                  <div className="px-4 py-2.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-purple-500/20">
                    <h4 className="font-medium text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      AI Summary
                    </h4>
                  </div>
                  <div className="p-4 bg-purple-500/5">
                    <p className="text-sm text-slate-300 leading-relaxed">{selectedCall.call_summary}</p>
                  </div>
                </div>
              )}

              {/* Crisis Details */}
              {selectedCall?.crisis_details && (
                <div className="rounded-xl overflow-hidden border border-red-500/30">
                  <div className="px-4 py-2.5 bg-gradient-to-r from-red-500/20 to-orange-500/20 border-b border-red-500/30">
                    <h4 className="font-medium text-red-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Crisis Details
                    </h4>
                  </div>
                  <div className="p-4 bg-red-500/5">
                    <p className="text-sm text-red-200">{selectedCall.crisis_details}</p>
                  </div>
                </div>
              )}

              {/* Prayer Requests */}
              {selectedCall?.prayer_requests && selectedCall.prayer_requests.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-purple-500/20">
                  <div className="px-4 py-2.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-purple-500/20">
                    <h4 className="font-medium text-white flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-400" />
                      Prayer Requests ({selectedCall.prayer_requests.length})
                    </h4>
                  </div>
                  <div className="p-4 bg-purple-500/5 space-y-2">
                    {selectedCall.prayer_requests.map((prayer, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm text-purple-200 p-3 bg-purple-500/10 rounded-lg">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs font-medium">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{prayer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              {selectedCall?.specific_interests && selectedCall.specific_interests.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-cyan-500/20">
                  <div className="px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-cyan-500/20">
                    <h4 className="font-medium text-white flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-400" />
                      Interests Mentioned
                    </h4>
                  </div>
                  <div className="p-4 bg-cyan-500/5 flex flex-wrap gap-2">
                    {selectedCall.specific_interests.map((interest, idx) => (
                      <Badge key={idx} className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Transcript - Conversation Style (No nested scroll) */}
              <div className="rounded-xl overflow-hidden border border-white/10">
                <div className="px-4 py-2.5 bg-gradient-to-r from-slate-700/50 to-slate-800/50 border-b border-white/10 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-400" />
                    Call Transcript
                  </h4>
                  {selectedCall?.full_transcript && (
                    <span className="text-xs text-slate-500">
                      {selectedCall.full_transcript.split('\n').filter(l => l.trim()).length} messages
                    </span>
                  )}
                </div>
                <div className="p-4 bg-slate-900/50">
                  {selectedCall?.full_transcript ? (
                    <div className="space-y-4">
                      {selectedCall.full_transcript.split('\n').filter(line => line.trim()).map((line, idx) => {
                        const isAI = line.toLowerCase().startsWith('ai:') || line.toLowerCase().startsWith('assistant:') || line.toLowerCase().startsWith('bot:');
                        const isUser = line.toLowerCase().startsWith('user:') || line.toLowerCase().startsWith('customer:') || line.toLowerCase().startsWith('human:');
                        const cleanLine = line.replace(/^(ai|assistant|bot|user|customer|human):\s*/i, '').trim();

                        // If we can't determine the speaker, check for patterns
                        const inferredIsAI = !isUser && (isAI || idx % 2 === 0);

                        return (
                          <div key={idx} className={cn(
                            "flex gap-3",
                            inferredIsAI ? "justify-start" : "justify-end"
                          )}>
                            <div className={cn(
                              "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                              inferredIsAI
                                ? "bg-gradient-to-br from-blue-600/20 to-purple-600/10 text-slate-200 rounded-tl-sm border border-blue-500/20"
                                : "bg-gradient-to-br from-slate-700/40 to-slate-800/30 text-slate-200 rounded-tr-sm border border-slate-500/20"
                            )}>
                              <div className={cn(
                                "text-[10px] uppercase tracking-wider mb-1 font-bold flex items-center gap-1.5",
                                inferredIsAI ? "text-blue-400" : "text-amber-500/80"
                              )}>
                                {inferredIsAI ? '🤖 AI Assistant' : '👤 Member'}
                              </div>
                              <p className="leading-relaxed text-sm">{cleanLine || line}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No transcript available</p>
                      <p className="text-xs mt-1 opacity-70">The call may still be processing or no conversation was recorded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  className="gap-2 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white h-11"
                  onClick={() => {
                    if (selectedCall?.people?.phone_number) {
                      window.location.href = `tel:${selectedCall.people.phone_number}`;
                    }
                  }}
                  disabled={!selectedCall?.people?.phone_number}
                >
                  <Phone className="h-4 w-4" />
                  Call Back
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white h-11"
                  onClick={() => {
                    // Copy transcript to clipboard
                    if (selectedCall?.full_transcript) {
                      navigator.clipboard.writeText(selectedCall.full_transcript);
                      toast({
                        title: 'Copied!',
                        description: 'Transcript copied to clipboard',
                      });
                    }
                  }}
                  disabled={!selectedCall?.full_transcript}
                >
                  <FileText className="h-4 w-4" />
                  Copy Text
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
