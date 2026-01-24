import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MinuteUsageWidget } from "@/components/dashboard/MinuteUsageWidget";
import { ActiveCampaignsWidget } from "@/components/dashboard/ActiveCampaignsWidget";
import { RecentCallsWidget } from "@/components/dashboard/RecentCallsWidget";
import { EscalationWidget } from "@/components/dashboard/EscalationWidget";
import { CallSuccessWidget } from "@/components/dashboard/CallSuccessWidget";
import { UpcomingCallsWidget } from "@/components/dashboard/UpcomingCallsWidget";
import { DemoDataNotice } from "@/components/demo/DemoDataNotice";
import { Rocket, UserPlus, Loader2 } from "lucide-react";

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
        .single();

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
        .select("id, status, created_at, people(first_name, last_name)")
        .eq("organization_id", currentOrganization?.id)
        .order("created_at", { ascending: false })
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
        .gte("created_at", thirtyDaysAgo.toISOString());

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
          <Button variant="outline" size="sm" onClick={() => navigate("/people")}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Person
          </Button>
          <Button size="sm" onClick={() => navigate("/communications")}>
            <Rocket className="h-4 w-4 mr-1.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Hero KPI Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {(isAdmin || isPastor) && (
          <MinuteUsageWidget
            minutesUsed={minuteUsage.used}
            minutesIncluded={minuteUsage.included}
          />
        )}
        <ActiveCampaignsWidget campaigns={campaigns} />
        <CallSuccessWidget {...callStats} />
      </div>

      {/* Detail Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(isAdmin || isPastor) && (
          <EscalationWidget {...escalations} />
        )}
        {(isAdmin || isPastor) && (
          <UpcomingCallsWidget calls={upcomingCalls} />
        )}
        <RecentCallsWidget calls={recentCalls} />
      </div>
    </div>
  );
}
