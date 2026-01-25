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
      const escalations = logs.filter(l => l.crisis_indicators === true || l.needs_pastoral_care === true).length;
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
        {[
          {
            title: "Total Calls",
            value: stats.totalCalls,
            subtext: `${stats.completedCalls} completed`,
            icon: Phone,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            progress: stats.totalCalls > 0 ? (stats.completedCalls / stats.totalCalls) * 100 : 0
          },
          {
            title: "Avg Duration",
            value: formatDuration(stats.avgDuration),
            subtext: "minutes per call",
            icon: Timer,
            color: "text-violet-500",
            bgColor: "bg-violet-500/10",
            progress: null
          },
          {
            title: "Positive Sentiment",
            value: stats.positiveResponses,
            subtext: `${stats.totalCalls > 0 ? Math.round((stats.positiveResponses / stats.totalCalls) * 100) : 0}% of total`,
            icon: ThumbsUp,
            color: "text-teal-500",
            bgColor: "bg-teal-500/10",
            progress: stats.totalCalls > 0 ? (stats.positiveResponses / stats.totalCalls) * 100 : 0
          },
          {
            title: "Needs Attention",
            value: stats.escalations + stats.followUpsNeeded,
            subtext: `${stats.escalations} urgent · ${stats.followUpsNeeded} follow-up`,
            icon: AlertTriangle,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            progress: null
          }
        ].map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <div className={cn("p-2 rounded-full", stat.bgColor)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </div>
              <div className="flex flex-col gap-1 mt-2">
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.subtext}</p>
              </div>
              {stat.progress !== null && (
                <Progress value={stat.progress} className={cn("h-1.5 mt-4", stat.bgColor.replace('/10', '/20'))} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Call Filters & List (Takes 3 columns) */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="px-6 py-4 border-b">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                  <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1">
                    <TabsTrigger value="all">All Logs</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="escalations" className="text-amber-600 data-[state=active]:text-amber-700">Needs Action</TabsTrigger>
                    <TabsTrigger value="follow-ups">Follow-ups</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search transcripts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-muted/30 border-none focus-visible:ring-1"
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-320px)] min-h-[500px]">
                {filteredCalls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 opacity-50" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No calls found</h3>
                    <p className="text-sm max-w-xs mx-auto mt-1">
                      We couldn't find any call logs matching your current filters.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredCalls.map((call) => (
                      <div
                        key={call.id}
                        className="group flex flex-col sm:flex-row gap-4 p-4 sm:p-6 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedCall(call);
                          setIsDetailOpen(true);
                        }}
                      >
                        {/* Left: Avatar & Sentiment */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:w-16 shrink-0">
                          <div className="relative">
                            <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                              <AvatarFallback className={cn(
                                "text-sm font-bold",
                                call.member_response_type === 'positive' && "bg-teal-50 text-teal-700",
                                call.member_response_type === 'negative' && "bg-rose-50 text-rose-700",
                                call.member_response_type === 'neutral' && "bg-indigo-50 text-indigo-700",
                                !call.member_response_type && "bg-gray-100 text-gray-500"
                              )}>
                                {getInitials(call.people?.first_name, call.people?.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm">
                              {getSentimentIcon(call.member_response_type)}
                            </div>
                          </div>
                        </div>

                        {/* Middle: Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-base text-foreground">
                                {call.people?.first_name || call.people?.last_name
                                  ? `${call.people?.first_name || ''} ${call.people?.last_name || ''}`.trim()
                                  : (call.phone_number_used || 'Unknown')
                                }
                              </h4>
                              {/* Mini Status Badge */}
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide",
                                call.call_status === 'completed' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700"
                              )}>
                                {call.call_status}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                              {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                            </span>
                          </div>

                          <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                            {call.call_summary || <span className="italic text-muted-foreground">No summary available.</span>}
                          </p>

                          {/* Tags Row */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            {call.crisis_indicators && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-1">
                                <AlertTriangle className="h-3 w-3" /> Crisis
                              </Badge>
                            )}
                            {call.prayer_requests && call.prayer_requests.length > 0 && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1 bg-violet-100 text-violet-700 hover:bg-violet-200">
                                <Sparkles className="h-3 w-3" /> {call.prayer_requests.length} Prayer Req
                              </Badge>
                            )}
                            {call.call_duration !== null && (
                              <span className="inline-flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                <Timer className="h-3 w-3 mr-1" />
                                {formatDuration(call.call_duration)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Action Arrow */}
                        <div className="hidden sm:flex items-center justify-center w-8 shrink-0">
                          <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Quick Insights */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-gradient-to-b from-card to-muted/20">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sentiment Trend */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Call Sentiment</span>
                  <span className="text-xs text-muted-foreground">Last 30 days</span>
                </div>
                <div className="flex h-2 w-full rounded-full overflow-hidden">
                  <div style={{ width: `${(stats.positiveResponses / (stats.totalCalls || 1)) * 100}%` }} className="bg-teal-500" />
                  <div style={{ width: `${(stats.neutralResponses / (stats.totalCalls || 1)) * 100}%` }} className="bg-amber-400" />
                  <div style={{ width: `${(stats.negativeResponses / (stats.totalCalls || 1)) * 100}%` }} className="bg-rose-500" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-teal-500" /> Positive</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> Neutral</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Negative</div>
                </div>
              </div>

              <Separator />

              {/* Recent escalations mini-list */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  Urgent Needs
                </h4>
                {callLogs.filter(c => c.crisis_indicators || c.needs_pastoral_care).length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">No urgent needs detected.</div>
                ) : (
                  <div className="space-y-2">
                    {callLogs.filter(c => c.crisis_indicators || c.needs_pastoral_care).slice(0, 3).map(call => (
                      <div key={call.id} className="text-xs flex items-center justify-between p-2 rounded bg-background border">
                        <span className="font-medium truncate max-w-[100px]">
                          {call.people?.first_name || 'Unknown'}
                        </span>
                        {call.crisis_indicators ? (
                          <Badge variant="destructive" className="h-4 text-[9px] px-1">CRISIS</Badge>
                        ) : (
                          <Badge variant="outline" className="h-4 text-[9px] px-1 border-pink-200 text-pink-600">CARE</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Timer className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium text-sm">
                    {formatDuration(selectedCall?.call_duration || 0)}
                  </p>
                </div>
              </div>

              {/* Alerts */}
              {(selectedCall?.crisis_indicators || selectedCall?.needs_pastoral_care || selectedCall?.follow_up_needed) && (
                <div className="flex flex-wrap gap-2">
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
