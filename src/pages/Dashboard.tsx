import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { MinuteUsageWidget } from "@/components/dashboard/MinuteUsageWidget";
import { ActiveCampaignsWidget } from "@/components/dashboard/ActiveCampaignsWidget";
import { RecentCallsWidget } from "@/components/dashboard/RecentCallsWidget";
import { EscalationWidget } from "@/components/dashboard/EscalationWidget";
import { CallSuccessWidget } from "@/components/dashboard/CallSuccessWidget";
import { UpcomingCallsWidget } from "@/components/dashboard/UpcomingCallsWidget";
import { DemoDataNotice } from "@/components/demo/DemoDataNotice";

export default function Dashboard() {
  const { currentOrganization } = useAuthStore();
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {hasDemoData && <DemoDataNotice />}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-tour="dashboard">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview for {currentOrganization?.name}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Row 1: Key Metrics */}
        {(isAdmin || isPastor) && (
          <MinuteUsageWidget
            minutesUsed={minuteUsage.used}
            minutesIncluded={minuteUsage.included}
          />
        )}

        <ActiveCampaignsWidget campaigns={campaigns} />

        <CallSuccessWidget {...callStats} />

        {/* Row 2: Operational Data */}
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
