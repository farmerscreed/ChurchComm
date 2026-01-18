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
  Eye
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
}

interface CallStats {
  totalCalls: number;
  completedCalls: number;
  avgDuration: number;
  callsWithDuration: number;
  totalTalkTime: number;
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
    callsWithDuration: 0,
    totalTalkTime: 0,
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
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set());

  const toggleTranscript = (callId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the detail dialog
    setExpandedTranscripts(prev => {
      const next = new Set(prev);
      if (next.has(callId)) {
        next.delete(callId);
      } else {
        next.add(callId);
      }
      return next;
    });
  };

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
      // Only calculate avg duration from calls that have actual duration > 0
      const callsWithDuration = logs.filter(l => (l.call_duration ?? 0) > 0);
      const totalDuration = callsWithDuration.reduce((sum, l) => sum + (l.call_duration ?? 0), 0);
      const positive = logs.filter(l => l.member_response_type === 'positive').length;
      const neutral = logs.filter(l => l.member_response_type === 'neutral' || !l.member_response_type).length;
      const negative = logs.filter(l => l.member_response_type === 'negative').length;
      const escalations = logs.filter(l => l.crisis_indicators === true || l.needs_pastoral_care === true).length;
      const followUps = logs.filter(l => l.follow_up_needed === true).length;

      setStats({
        totalCalls: logs.length,
        completedCalls: completed,
        avgDuration: callsWithDuration.length > 0 ? Math.round(totalDuration / callsWithDuration.length) : 0,
        callsWithDuration: callsWithDuration.length,
        totalTalkTime: totalDuration,
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
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-yellow-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSentimentBadge = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Positive</Badge>;
      case 'negative':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Negative</Badge>;
      case 'neutral':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Neutral</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-600 text-white border-red-700">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">High Priority</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Low</Badge>;
      default:
        return null;
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <PhoneCall className="h-7 w-7 md:h-8 md:w-8 text-primary" />
            Call History & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze all AI calling activity
          </p>
        </div>
        <Button onClick={loadCallData} variant="outline" className="gap-2 self-start sm:self-auto">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Calls */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{stats.totalCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedCalls} completed
            </p>
            <Progress
              value={stats.totalCalls > 0 ? (stats.completedCalls / stats.totalCalls) * 100 : 0}
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>

        {/* Average Duration - Prominent */}
        <Card className="relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Avg Call Duration</CardTitle>
            <Timer className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-bold text-blue-600">{formatDuration(stats.avgDuration)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.callsWithDuration > 0
                ? `Based on ${stats.callsWithDuration} call${stats.callsWithDuration !== 1 ? 's' : ''} with recorded duration`
                : 'No calls with duration yet'}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3 text-blue-500" />
              <span className="text-muted-foreground">
                Total talk time: {formatDuration(stats.totalTalkTime)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Breakdown */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sentiment</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                <span className="text-md md:text-lg font-bold">{stats.positiveResponses}</span>
              </div>
              <div className="flex items-center gap-1">
                <Minus className="h-4 w-4 text-yellow-500" />
                <span className="text-md md:text-lg font-bold">{stats.neutralResponses}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="h-4 w-4 text-red-500" />
                <span className="text-md md:text-lg font-bold">{stats.negativeResponses}</span>
              </div>
            </div>
            <div className="flex gap-1 mt-2">
              <div
                className="h-2 bg-green-500 rounded-l"
                style={{ width: `${stats.totalCalls > 0 ? (stats.positiveResponses / stats.totalCalls) * 100 : 33}%` }}
              />
              <div
                className="h-2 bg-yellow-500"
                style={{ width: `${stats.totalCalls > 0 ? (stats.neutralResponses / stats.totalCalls) * 100 : 34}%` }}
              />
              <div
                className="h-2 bg-red-500 rounded-r"
                style={{ width: `${stats.totalCalls > 0 ? (stats.negativeResponses / stats.totalCalls) * 100 : 33}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Escalations */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{stats.escalations + stats.followUpsNeeded}</div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0 sm:gap-2 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-red-500" />
                {stats.escalations} escalations
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-pink-500" />
                {stats.followUpsNeeded} follow-ups
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Call List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or summary..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="no_answer">No Answer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Sentiment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiment</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="all" className="gap-2">
                <Phone className="h-4 w-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </TabsTrigger>
              <TabsTrigger value="escalations" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Escalations
              </TabsTrigger>
              <TabsTrigger value="follow-ups" className="gap-2">
                <Heart className="h-4 w-4" />
                Follow-ups
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    {filteredCalls.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Phone className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">No calls found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {callLogs.length === 0
                            ? "Start an AI calling campaign to see call history here"
                            : "Try adjusting your filters"}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredCalls.map((call) => (
                          <div
                            key={call.id}
                            className="p-3 sm:p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              setSelectedCall(call);
                              setIsDetailOpen(true);
                            }}
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              {/* Avatar */}
                              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-background shadow">
                                <AvatarFallback className={cn(
                                  "text-sm font-medium",
                                  call.member_response_type === 'positive' && "bg-green-500/10 text-green-600",
                                  call.member_response_type === 'negative' && "bg-red-500/10 text-red-600",
                                  call.member_response_type === 'neutral' && "bg-yellow-500/10 text-yellow-600"
                                )}>
                                  {getInitials(call.people?.first_name, call.people?.last_name)}
                                </AvatarFallback>
                              </Avatar>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-medium truncate text-sm sm:text-base">
                                    {call.people?.first_name || call.people?.last_name
                                      ? `${call.people?.first_name || ''} ${call.people?.last_name || ''}`.trim()
                                      : call.phone_number_used || 'Unknown Caller'}
                                  </h4>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {getStatusIcon(call.call_status || 'unknown')}
                                    {getSentimentIcon(call.member_response_type)}
                                  </div>
                                </div>

                                <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                                  {call.phone_number_used || call.people?.phone_number || 'No phone number'}
                                </p>

                                {call.call_summary && (
                                  <p className="text-sm mt-2 line-clamp-2 text-foreground/80">
                                    {call.call_summary}
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(call.created_at), 'MMM d, yyyy')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(call.created_at), 'h:mm a')}
                                  </span>
                                  {(call.call_duration ?? 0) > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Timer className="h-3 w-3" />
                                      {formatDuration(call.call_duration ?? 0)}
                                    </span>
                                  )}
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {call.escalation_priority && call.escalation_priority !== 'low' && (
                                    getPriorityBadge(call.escalation_priority)
                                  )}
                                  {call.crisis_indicators === true && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Crisis
                                    </Badge>
                                  )}
                                  {call.needs_pastoral_care === true && (
                                    <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/20 text-xs">
                                      <Heart className="h-3 w-3 mr-1" />
                                      Pastoral Care
                                    </Badge>
                                  )}
                                  {call.follow_up_needed === true && (
                                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                                      <PhoneCall className="h-3 w-3 mr-1" />
                                      Follow-up
                                    </Badge>
                                  )}
                                  {call.prayer_requests && call.prayer_requests.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      {call.prayer_requests.length} Prayer Request{call.prayer_requests.length > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {/* View Transcript Button */}
                                  {call.full_transcript && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-xs gap-1"
                                      onClick={(e) => toggleTranscript(call.id, e)}
                                    >
                                      <FileText className="h-3 w-3" />
                                      {expandedTranscripts.has(call.id) ? 'Hide' : 'View'} Transcript
                                    </Button>
                                  )}
                                </div>

                                {/* Expandable Transcript */}
                                {expandedTranscripts.has(call.id) && call.full_transcript && (
                                  <div className="mt-3 p-3 bg-muted/50 rounded-lg border" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="h-4 w-4 text-primary" />
                                      <span className="text-sm font-medium">Call Transcript</span>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                      <p className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                                        {call.full_transcript}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 self-center" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Quick Insights */}
        <div className="space-y-4">
          {/* Recent Escalations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Recent Escalations
              </CardTitle>
              <CardDescription>Calls requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              {callLogs.filter(c => c.crisis_indicators || c.needs_pastoral_care).slice(0, 3).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No escalations to show
                </p>
              ) : (
                <div className="space-y-3">
                  {callLogs
                    .filter(c => c.crisis_indicators || c.needs_pastoral_care)
                    .slice(0, 3)
                    .map((call) => (
                      <div
                        key={call.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          setSelectedCall(call);
                          setIsDetailOpen(true);
                        }}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-amber-500/10 text-amber-600">
                            {getInitials(call.people?.first_name, call.people?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {call.people?.first_name} {call.people?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {call.crisis_indicators ? (
                          <Badge variant="destructive" className="text-xs">Crisis</Badge>
                        ) : (
                          <Badge className="bg-pink-500/10 text-pink-600 text-xs">Care</Badge>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prayer Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Recent Prayer Requests
              </CardTitle>
              <CardDescription>Extracted from call conversations</CardDescription>
            </CardHeader>
            <CardContent>
              {callLogs.filter(c => c.prayer_requests && c.prayer_requests.length > 0).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No prayer requests recorded
                </p>
              ) : (
                <div className="space-y-3">
                  {callLogs
                    .filter(c => c.prayer_requests && c.prayer_requests.length > 0)
                    .slice(0, 5)
                    .map((call) => (
                      <div key={call.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {call.people?.first_name} {call.people?.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <ul className="text-muted-foreground space-y-1">
                          {call.prayer_requests?.slice(0, 2).map((prayer, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-purple-500 mt-1">•</span>
                              <span className="line-clamp-1">{prayer}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Response Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Response Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                    Positive
                  </span>
                  <span className="font-medium">{stats.positiveResponses}</span>
                </div>
                <Progress
                  value={stats.totalCalls > 0 ? (stats.positiveResponses / stats.totalCalls) * 100 : 0}
                  className="h-2 bg-green-500/20 [&>div]:bg-green-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-yellow-500" />
                    Neutral
                  </span>
                  <span className="font-medium">{stats.neutralResponses}</span>
                </div>
                <Progress
                  value={stats.totalCalls > 0 ? (stats.neutralResponses / stats.totalCalls) * 100 : 0}
                  className="h-2 bg-yellow-500/20 [&>div]:bg-yellow-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                    Negative
                  </span>
                  <span className="font-medium">{stats.negativeResponses}</span>
                </div>
                <Progress
                  value={stats.totalCalls > 0 ? (stats.negativeResponses / stats.totalCalls) * 100 : 0}
                  className="h-2 bg-red-500/20 [&>div]:bg-red-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {getInitials(selectedCall?.people?.first_name ?? undefined, selectedCall?.people?.last_name ?? undefined)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-lg">
                    {selectedCall?.people?.first_name || selectedCall?.people?.last_name
                      ? `${selectedCall?.people?.first_name || ''} ${selectedCall?.people?.last_name || ''}`.trim()
                      : selectedCall?.phone_number_used || 'Unknown Caller'}
                  </span>
                  {getSentimentBadge(selectedCall?.member_response_type || null)}
                </div>
                <p className="text-sm font-normal text-muted-foreground">
                  {selectedCall?.phone_number_used || selectedCall?.people?.phone_number || 'No phone number'}
                </p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">Call details and transcript</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 pb-4">
              {/* Call Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-sm">
                    {selectedCall && format(new Date(selectedCall.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-medium text-sm">
                    {selectedCall && format(new Date(selectedCall.created_at), 'h:mm a')}
                  </p>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Timer className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium text-sm text-blue-600">
                    {formatDuration(selectedCall?.call_duration || 0)}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  {getStatusIcon(selectedCall?.call_status || 'unknown')}
                  <p className="text-xs text-muted-foreground mt-1">Status</p>
                  <p className="font-medium text-sm capitalize">
                    {selectedCall?.call_status || 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Vapi Call ID - for reference */}
              {selectedCall?.vapi_call_id && (
                <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded flex items-center gap-2">
                  <span className="font-medium">Vapi Call ID:</span>
                  <code className="bg-background px-2 py-0.5 rounded text-xs">{selectedCall.vapi_call_id}</code>
                </div>
              )}

              {/* Alerts & Priority */}
              {(selectedCall?.crisis_indicators || selectedCall?.needs_pastoral_care || selectedCall?.follow_up_needed || selectedCall?.escalation_priority) && (
                <div className="flex flex-wrap gap-2">
                  {selectedCall?.escalation_priority && getPriorityBadge(selectedCall.escalation_priority)}
                  {selectedCall?.crisis_indicators && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Crisis Detected
                    </Badge>
                  )}
                  {selectedCall?.needs_pastoral_care && (
                    <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/20 gap-1">
                      <Heart className="h-3 w-3" />
                      Needs Pastoral Care
                    </Badge>
                  )}
                  {selectedCall?.follow_up_needed && (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
                      <PhoneCall className="h-3 w-3" />
                      Follow-up Required
                    </Badge>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedCall?.call_summary && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Summary
                  </h4>
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-sm leading-relaxed">{selectedCall.call_summary}</p>
                  </div>
                </div>
              )}

              {/* Crisis Details */}
              {selectedCall?.crisis_details && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    Crisis Details
                  </h4>
                  <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                    <p className="text-sm">{selectedCall.crisis_details}</p>
                  </div>
                </div>
              )}

              {/* Prayer Requests */}
              {selectedCall?.prayer_requests && selectedCall.prayer_requests.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Prayer Requests
                  </h4>
                  <ul className="space-y-2">
                    {selectedCall.prayer_requests.map((prayer, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm p-2 bg-purple-500/5 rounded-lg">
                        <span className="text-purple-500 font-bold">•</span>
                        {prayer}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interests */}
              {selectedCall?.specific_interests && selectedCall.specific_interests.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Interests Mentioned</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCall.specific_interests.map((interest, idx) => (
                      <Badge key={idx} variant="outline">{interest}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcript */}
              {selectedCall?.full_transcript && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Full Transcript
                  </h4>
                  <div className="p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap font-mono">
                      {selectedCall.full_transcript}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
