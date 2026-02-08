import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DemoDataNotice } from "@/components/demo/DemoDataNotice";
import {
  Rocket,
  UserPlus,
  Loader2,
  Phone,
  Zap,
  TrendingUp,
  PhoneCall,
  Bell,
  Calendar,
  Clock,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  Users,
  Sparkles
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentOrganization, user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Widget Data States
  const [minuteUsage, setMinuteUsage] = useState({ used: 0, included: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [escalations, setEscalations] = useState({ urgent: 0, high: 0, medium: 0, total: 0 });
  const [callStats, setCallStats] = useState({ completed: 0, total: 0 });
  const [upcomingCalls, setUpcomingCalls] = useState<any[]>([]);
  const [hasDemoData, setHasDemoData] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchDashboardData();
    }
  }, [currentOrganization]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Minute Usage
      const { data: usage } = await supabase
        .from("minute_usage")
        .select("minutes_used, minutes_included")
        .eq("organization_id", currentOrganization?.id)
        .order("billing_period_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (usage) {
        setMinuteUsage({ used: usage.minutes_used, included: usage.minutes_included });
      }

      // 2. Active Campaigns
      const { data: campaignData } = await supabase
        .from("calling_campaigns")
        .select("*")
        .eq("organization_id", currentOrganization?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setCampaigns(campaignData || []);

      // 3. Recent Calls
      const { data: callData } = await supabase
        .from("call_attempts")
        .select("id, status, attempted_at, people(first_name, last_name)")
        .eq("organization_id", currentOrganization?.id)
        .order("attempted_at", { ascending: false, nullsFirst: false })
        .limit(5);

      setRecentCalls((callData || []).map((c: any) => ({
        ...c,
        person_name: c.people ? `${c.people.first_name || ''} ${c.people.last_name || ''}`.trim() : 'Unknown',
      })));

      // 4. Escalations
      const { data: escalationData } = await supabase
        .from("escalation_alerts")
        .select("priority")
        .eq("organization_id", currentOrganization?.id)
        .eq("status", "open");

      const escalationCounts = {
        urgent: escalationData?.filter(e => e.priority === "urgent").length || 0,
        high: escalationData?.filter(e => e.priority === "high").length || 0,
        medium: escalationData?.filter(e => e.priority === "medium").length || 0,
        total: escalationData?.length || 0,
      };
      setEscalations(escalationCounts);

      // 5. Call Success (Last 30 Days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: statsData } = await supabase
        .from("call_attempts")
        .select("status")
        .eq("organization_id", currentOrganization?.id)
        .gte("attempted_at", thirtyDaysAgo.toISOString());

      setCallStats({
        completed: statsData?.filter(c => c.status === "completed").length || 0,
        total: statsData?.length || 0,
      });

      // 6. Check for demo data
      const { count: demoCount } = await supabase
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", currentOrganization?.id)
        .eq("is_demo", true);

      setHasDemoData((demoCount || 0) > 0);

      // 7. Member count
      const { count: peopleCount } = await supabase
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", currentOrganization?.id);

      setMemberCount(peopleCount || 0);

      // 8. Upcoming Calls (Next 24h) from scheduled_messages
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: upcomingData } = await supabase
        .from("scheduled_messages")
        .select("id, message_type, scheduled_for, content")
        .eq("organization_id", currentOrganization?.id)
        .eq("status", "scheduled")
        .lte("scheduled_for", tomorrow.toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(5);

      setUpcomingCalls((upcomingData || []).map((c: any) => ({
        id: c.id,
        person_name: c.message_type === 'sms' ? 'SMS Campaign' : 'AI Call Campaign', // Placeholder as scheduled_messages might target groups
        trigger_type: c.message_type,
        scheduled_at: c.scheduled_for,
      })));

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  // Calculate stats
  const activeCampaigns = campaigns.filter(c => c.status === "in_progress" || c.status === "scheduled");
  const successRate = callStats.total > 0 ? Math.round((callStats.completed / callStats.total) * 100) : 0;
  const minutePercentage = minuteUsage.included > 0
    ? Math.min((minuteUsage.used / minuteUsage.included) * 100, 100)
    : 0;
  const isMinuteCritical = minutePercentage > 80;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {hasDemoData && <DemoDataNotice />}

      {/* URGENT ALERTS BANNER - Shows only when there are escalations */}
      {escalations.total > 0 && (
        <div
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/20 border border-red-500/30 p-4 cursor-pointer hover:border-red-500/50 transition-all"
          onClick={() => navigate("/call-history")}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent animate-pulse" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  {escalations.urgent > 0 && (
                    <Badge className="bg-red-500 text-white border-0">{escalations.urgent} Urgent</Badge>
                  )}
                  {escalations.high > 0 && (
                    <Badge className="bg-orange-500 text-white border-0">{escalations.high} High</Badge>
                  )}
                  {escalations.medium > 0 && (
                    <Badge className="bg-amber-500 text-white border-0">{escalations.medium} Medium</Badge>
                  )}
                  Escalation{escalations.total > 1 ? 's' : ''} Need Attention
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Review and respond to member concerns from recent calls
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      )}

      {/* Greeting + Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-tour="dashboard">
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening at {currentOrganization?.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/people")}
            className="border-white/10 text-slate-300 hover:bg-white/5"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Person
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/call-history")}
            className="border-white/10 text-slate-300 hover:bg-white/5"
          >
            <PhoneCall className="h-4 w-4 mr-1.5" />
            Call History
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/communications")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
          >
            <Zap className="h-4 w-4 mr-1.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Hero KPI Row - Always visible */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* AI Minutes Usage */}
        <div
          className={`p-5 rounded-xl bg-gradient-to-br ${isMinuteCritical
            ? 'from-red-500/10 to-red-500/5 border-red-500/20 hover:border-red-500/30'
            : 'from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:border-purple-500/30'
            } border transition-colors cursor-pointer`}
          onClick={() => navigate("/settings")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg ${isMinuteCritical ? 'bg-red-500/20' : 'bg-purple-500/20'} flex items-center justify-center`}>
              <Phone className={`w-5 h-5 ${isMinuteCritical ? 'text-red-400' : 'text-purple-400'}`} />
            </div>
            {isMinuteCritical && <Badge className="bg-red-500/20 text-red-300 border-0 text-xs">Low</Badge>}
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">
            {minuteUsage.used}<span className="text-lg text-slate-500">/{minuteUsage.included}</span>
          </p>
          <Progress
            value={minutePercentage}
            className={`h-1.5 mt-2 ${isMinuteCritical ? 'bg-red-500/20' : 'bg-purple-500/20'}`}
          />
          <p className="text-xs text-slate-500 mt-2">AI Minutes</p>
        </div>

        {/* Members */}
        <div
          className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/30 transition-colors cursor-pointer"
          onClick={() => navigate("/people")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{memberCount}</p>
          <p className="text-xs text-slate-500 mt-2">Total Members</p>
        </div>

        {/* Active Campaigns */}
        <div
          className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 hover:border-blue-500/30 transition-colors cursor-pointer"
          onClick={() => navigate("/communications")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            {activeCampaigns.length > 0 && (
              <Badge className="bg-blue-500/20 text-blue-300 border-0 text-xs">Active</Badge>
            )}
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{campaigns.length}</p>
          <p className="text-xs text-slate-500 mt-2">Campaigns</p>
        </div>

        {/* Success Rate */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 hover:border-green-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{successRate}%</p>
          <p className="text-xs text-slate-500 mt-2">Success Rate (30d)</p>
        </div>
      </div>

      {/* Detail Widgets Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Calls */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-purple-400" />
              Recent Calls
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-400 hover:text-purple-300 h-7 px-2"
              onClick={() => navigate("/call-history")}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentCalls.length > 0 ? (
              recentCalls.slice(0, 4).map((call) => (
                <div key={call.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-xs font-medium">
                      {call.person_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{call.person_name}</p>
                      <p className="text-xs text-slate-500">
                        {call.attempted_at ? new Date(call.attempted_at).toLocaleDateString() : "Recently"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${call.status === "completed"
                      ? "border-green-500/30 text-green-400"
                      : call.status === "voicemail"
                        ? "border-amber-500/30 text-amber-400"
                        : "border-slate-500/30 text-slate-400"
                      }`}
                  >
                    {call.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-slate-500">
                No recent calls
              </div>
            )}
          </div>
        </div>

        {/* Upcoming/Scheduled Calls */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Scheduled Calls
            </h3>
            <Badge className="bg-cyan-500/20 text-cyan-300 border-0 text-xs">
              {upcomingCalls.length} Pending
            </Badge>
          </div>
          <div className="space-y-3">
            {upcomingCalls.length > 0 ? (
              upcomingCalls.slice(0, 4).map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      {call.trigger_type === 'sms' ? <MessageSquare className="w-4 h-4 text-cyan-400" /> : <Phone className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{call.person_name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {call.trigger_type === 'call' ? 'AI Call' : 'SMS Message'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {call.scheduled_at ? new Date(call.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Soon"}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-slate-500">
                No scheduled calls
              </div>
            )}
          </div>
        </div>

        {/* Quick Insights */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Quick Actions
            </h3>
          </div>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start border-white/10 text-slate-300 hover:bg-white/5 h-12"
              onClick={() => navigate("/people")}
            >
              <UserPlus className="w-4 h-4 mr-3 text-purple-400" />
              <div className="text-left">
                <p className="text-sm">Add New Member</p>
                <p className="text-xs text-slate-500">Register a visitor or member</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-white/10 text-slate-300 hover:bg-white/5 h-12"
              onClick={() => navigate("/communications")}
            >
              <MessageSquare className="w-4 h-4 mr-3 text-blue-400" />
              <div className="text-left">
                <p className="text-sm">Send Message</p>
                <p className="text-xs text-slate-500">SMS to group or individual</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-white/10 text-slate-300 hover:bg-white/5 h-12"
              onClick={() => navigate("/settings")}
            >
              <Phone className="w-4 h-4 mr-3 text-green-400" />
              <div className="text-left">
                <p className="text-sm">Manage Scripts</p>
                <p className="text-xs text-slate-500">Edit AI call scripts</p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
