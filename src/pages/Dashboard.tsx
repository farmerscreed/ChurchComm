import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
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
  MessageSquare
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
  const { isAdmin, isPastor } = usePermissions();
  const [loading, setLoading] = useState(true);

  // Widget Data States
  const [minuteUsage, setMinuteUsage] = useState({ used: 0, included: 0 });
  const [campaigns, setCampaigns] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [escalations, setEscalations] = useState({ urgent: 0, high: 0, medium: 0, total: 0 });
  const [callStats, setCallStats] = useState({ completed: 0, total: 0 });
  const [upcomingCalls, setUpcomingCalls] = useState([]);
  const [hasDemoData, setHasDemoData] = useState(false);

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCampaigns(campaignData as any || []);

      // 3. Recent Calls
      const { data: callData } = await supabase
        .from("call_attempts")
        .select("id, status, attempted_at, people(first_name, last_name)")
        .eq("organization_id", currentOrganization?.id)
        .order("attempted_at", { ascending: false, nullsFirst: false })
        .limit(5);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRecentCalls((callData || []).map((c: any) => ({
        ...c,
        person_name: c.people ? `${c.people.first_name || ''} ${c.people.last_name || ''}`.trim() : 'Unknown',
      })) as any);

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

      // 7. Upcoming Calls (Next 24h)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: upcomingData } = await supabase
        .from("call_attempts")
        .select("id, trigger_type, scheduled_at, people(first_name, last_name)")
        .eq("organization_id", currentOrganization?.id)
        .eq("status", "scheduled")
        .lte("scheduled_at", tomorrow.toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUpcomingCalls((upcomingData || []).map((c: any) => ({
        ...c,
        person_name: c.people ? `${c.people.first_name || ''} ${c.people.last_name || ''}`.trim() : 'Unknown',
      })) as any);

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
  const scheduledCampaigns = campaigns.filter(c => c.status === "scheduled");
  const completedCampaigns = campaigns.filter(c => c.status === "completed");
  const successRate = callStats.total > 0 ? Math.round((callStats.completed / callStats.total) * 100) : 0;
  const minutePercentage = minuteUsage.included > 0
    ? Math.min((minuteUsage.used / minuteUsage.included) * 100, 100)
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {hasDemoData && <DemoDataNotice />}

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
        <div className="flex gap-2">
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
            size="sm"
            onClick={() => navigate("/communications")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
          >
            <Zap className="h-4 w-4 mr-1.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Hero KPI Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Minute Usage */}
        {(isAdmin || isPastor) && (
          <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Phone className="w-5 h-5 text-purple-400" />
              </div>
              <Badge className="bg-purple-500/20 text-purple-300 border-0">AI Minutes</Badge>
            </div>
            <p className="text-3xl font-bold text-white mb-2">
              {minuteUsage.used} <span className="text-lg text-slate-500">/ {minuteUsage.included}</span>
            </p>
            <Progress
              value={minutePercentage}
              className="h-2 bg-purple-500/20 mb-2"
            />
            <p className="text-xs text-slate-500">
              {Math.max(0, minuteUsage.included - minuteUsage.used)} minutes remaining this month
            </p>
          </div>
        )}

        {/* Active Campaigns */}
        <div
          className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 hover:border-blue-500/30 transition-colors cursor-pointer"
          onClick={() => navigate("/communications")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <Badge className="bg-blue-500/20 text-blue-300 border-0">Campaigns</Badge>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{campaigns.length}</p>
          <p className="text-sm text-slate-400">
            {activeCampaigns.length} active, {scheduledCampaigns.length} scheduled, {completedCampaigns.length} completed
          </p>
        </div>

        {/* Call Success Rate */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 hover:border-green-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <Badge className="bg-green-500/20 text-green-300 border-0">Success Rate</Badge>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{successRate}%</p>
          <p className="text-sm text-slate-400">
            {callStats.completed} of {callStats.total} calls completed
          </p>
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
              onClick={() => navigate("/communications")}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentCalls.length > 0 ? (
              recentCalls.slice(0, 3).map((call) => (
                <div key={call.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-xs font-medium">
                      {call.person_name.split(" ").map(n => n[0]).join("").substring(0, 2)}
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
                    className={`text-xs ${
                      call.status === "completed"
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

        {/* Escalation Alerts */}
        {(isAdmin || isPastor) && (
          <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                Escalation Alerts
              </h3>
              {escalations.total > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-0">
                  {escalations.total} new
                </Badge>
              )}
            </div>
            <div className="space-y-3">
              {escalations.total > 0 ? (
                <>
                  {escalations.urgent > 0 && (
                    <div className="p-3 rounded-lg bg-white/5 border-l-2 border-red-500">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <p className="text-sm font-medium text-white">
                          {escalations.urgent} Urgent Alert{escalations.urgent > 1 ? 's' : ''}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400">Requires immediate attention</p>
                    </div>
                  )}
                  {escalations.high > 0 && (
                    <div className="p-3 rounded-lg bg-white/5 border-l-2 border-amber-500">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <p className="text-sm font-medium text-white">
                          {escalations.high} High Priority Alert{escalations.high > 1 ? 's' : ''}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400">Review when possible</p>
                    </div>
                  )}
                  {escalations.medium > 0 && (
                    <div className="p-3 rounded-lg bg-white/5 border-l-2 border-yellow-500">
                      <div className="flex items-center gap-2 mb-1">
                        <Bell className="w-4 h-4 text-yellow-400" />
                        <p className="text-sm font-medium text-white">
                          {escalations.medium} Medium Priority Alert{escalations.medium > 1 ? 's' : ''}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400">For follow-up</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-sm text-slate-500">
                  No active escalations
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming/Scheduled Calls */}
        {(isAdmin || isPastor) && (
          <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Scheduled
              </h3>
            </div>
            <div className="space-y-3">
              {upcomingCalls.length > 0 ? (
                upcomingCalls.slice(0, 3).map((call) => (
                  <div key={call.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{call.person_name}</p>
                        <p className="text-xs text-slate-500 capitalize">
                          {call.trigger_type?.replace("_", " ") || "Scheduled call"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {call.scheduled_at ? new Date(call.scheduled_at).toLocaleDateString() : "Soon"}
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
        )}
      </div>
    </div>
  );
}
