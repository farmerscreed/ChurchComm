import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DemoDataNotice } from "@/components/demo/DemoDataNotice";
import { usePlanModules } from "@/hooks/usePlanModules";
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
  Sparkles,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  CheckCircle2,
  Circle,
  ArrowRight,
  ExternalLink,
  BarChart3,
  Target,
  Eye,
  MousePointerClick,
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// REACH application stages
const REACH_STAGES = [
  { key: "eligibility", label: "Eligibility Check" },
  { key: "preflight", label: "Website Preflight" },
  { key: "google_nonprofit", label: "Google for Nonprofits" },
  { key: "goodstack", label: "Goodstack Verification" },
  { key: "ad_grant_applied", label: "Ad Grant Applied" },
  { key: "ad_grant_active", label: "Ad Grant Active" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentOrganization, user } = useAuthStore();
  const { hasModule, attractTrialActive, attractTrialExpired } = usePlanModules();
  const [loading, setLoading] = useState(true);

  // ENGAGE data
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [escalations, setEscalations] = useState({ urgent: 0, high: 0, medium: 0, total: 0 });
  const [callStats, setCallStats] = useState({ completed: 0, total: 0 });
  const [upcomingCalls, setUpcomingCalls] = useState<any[]>([]);
  const [hasDemoData, setHasDemoData] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  // REACH data
  const [reachStage, setReachStage] = useState(0);
  const [eligibilityDone, setEligibilityDone] = useState(false);
  const [preflightPassed, setPreflightPassed] = useState(false);

  // ATTRACT data
  const [complianceEvents, setComplianceEvents] = useState<any[]>([]);
  const [guardianStatus, setGuardianStatus] = useState<string | null>(null);
  const [attractTrialDays, setAttractTrialDays] = useState<number | null>(null);

  const org = currentOrganization as any;

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchDashboardData();
    }
  }, [currentOrganization, location.key]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && currentOrganization?.id) {
        fetchDashboardData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const handleFocus = () => {
      if (currentOrganization?.id) fetchDashboardData();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [currentOrganization?.id]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // === ENGAGE DATA ===
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_dashboard_stats", {
        p_organization_id: currentOrganization?.id,
      });
      if (rpcError) console.error("Error fetching dashboard stats:", rpcError);
      const rpcStats = rpcData?.[0] || { total_calls: 0, total_minutes: 0, active_campaigns: 0, open_escalations: 0 };

      setCampaigns(new Array(Number(rpcStats.active_campaigns || 0)).fill({ status: "in_progress" }));
      setTotalMinutes(Math.ceil(Number(rpcStats.total_minutes || 0)));

      const { data: callData } = await supabase
        .from("vapi_call_logs")
        .select("id, call_status, created_at, people(first_name, last_name)")
        .eq("organization_id", currentOrganization?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentCalls(
        (callData || []).map((c: any) => ({
          id: c.id,
          status: c.call_status,
          attempted_at: c.created_at,
          person_name: c.people ? `${c.people.first_name || ""} ${c.people.last_name || ""}`.trim() : "Unknown",
          trigger_type: "AI Call",
        }))
      );

      let escCounts = { urgent: 0, high: 0, medium: 0, total: Number(rpcStats.open_escalations || 0) };
      if (escCounts.total > 0) {
        const { data: escData } = await supabase
          .from("vapi_call_logs")
          .select("escalation_priority")
          .eq("organization_id", currentOrganization?.id)
          .not("escalation_priority", "is", null)
          .eq("needs_pastoral_care", true)
          .eq("escalation_status", "open");
        escCounts.urgent = escData?.filter((e) => e.escalation_priority === "urgent").length || 0;
        escCounts.high = escData?.filter((e) => e.escalation_priority === "high").length || 0;
        escCounts.medium = escData?.filter((e) => e.escalation_priority === "medium").length || 0;
      }
      setEscalations(escCounts);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: successData } = await supabase
        .from("vapi_call_logs")
        .select("call_status")
        .eq("organization_id", currentOrganization?.id)
        .gte("created_at", thirtyDaysAgo.toISOString());
      setCallStats({
        completed: successData?.filter((c) => c.call_status === "completed" || c.call_status === "ended").length || 0,
        total: successData?.length || 0,
      });

      const { count: demoCount } = await supabase
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", currentOrganization?.id)
        .eq("is_demo", true);
      setHasDemoData((demoCount || 0) > 0);

      const { count: peopleCount } = await supabase
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", currentOrganization?.id);
      setMemberCount(peopleCount || 0);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { data: upcomingSMS } = await supabase
        .from("scheduled_messages")
        .select("id, message_type, scheduled_for, content")
        .eq("organization_id", currentOrganization?.id)
        .eq("status", "scheduled")
        .lte("scheduled_for", tomorrow.toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(5);
      const { data: upcomingCallsData } = await supabase
        .from("call_attempts")
        .select("id, trigger_type, scheduled_at, people(first_name, last_name)")
        .eq("organization_id", currentOrganization?.id)
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString())
        .lte("scheduled_at", tomorrow.toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);
      const combinedUpcoming = [
        ...(upcomingSMS || []).map((c: any) => ({
          id: c.id,
          person_name: c.content ? c.content.substring(0, 40) + (c.content.length > 40 ? "..." : "") : c.message_type || "SMS Campaign",
          trigger_type: "sms",
          scheduled_at: c.scheduled_for,
        })),
        ...(upcomingCallsData || []).map((c: any) => ({
          id: c.id,
          person_name: c.people ? `${c.people.first_name || ""} ${c.people.last_name || ""}`.trim() : "Unknown",
          trigger_type: c.trigger_type || "call",
          scheduled_at: c.scheduled_at,
        })),
      ]
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        .slice(0, 5);
      setUpcomingCalls(combinedUpcoming);

      // === REACH DATA ===
      const savedResult = localStorage.getItem("keepflock_eligibility_result");
      setEligibilityDone(!!savedResult);

      const preflightOk = !!org?.website_preflight_passed;
      setPreflightPassed(preflightOk);

      let stage = 0;
      if (savedResult) stage = 1;
      if (preflightOk) stage = 2;
      if (org?.google_nonprofit_verified) stage = 3;
      if (org?.grant_application_status === "goodstack_approved") stage = 4;
      if (org?.google_ad_grant_applied) stage = 5;
      if (org?.google_ad_grant_approved) stage = 6;
      setReachStage(stage);

      // === ATTRACT DATA ===
      if (org?.attract_trial_ends_at) {
        const daysLeft = Math.ceil((new Date(org.attract_trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        setAttractTrialDays(daysLeft > 0 ? daysLeft : 0);
      }

      // Guardian compliance events (recent)
      const { data: compEvents } = await supabase
        .from("grant_compliance_events")
        .select("id, event_type, severity, message, created_at, is_read")
        .eq("org_id", currentOrganization?.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setComplianceEvents(compEvents || []);

      // Determine guardian status from latest event
      if (compEvents && compEvents.length > 0) {
        const critical = compEvents.find((e) => e.severity === "critical");
        const warning = compEvents.find((e) => e.severity === "warning");
        if (critical) setGuardianStatus("critical");
        else if (warning) setGuardianStatus("warning");
        else setGuardianStatus("healthy");
      } else {
        setGuardianStatus(org?.google_ad_grant_account_id ? "healthy" : null);
      }
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

  const displayName = user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const activeCampaigns = campaigns.filter((c) => c.status === "in_progress" || c.status === "scheduled");
  const successRate = callStats.total > 0 ? Math.round((callStats.completed / callStats.total) * 100) : 0;
  const orgMinutesUsed = totalMinutes;
  const orgMinutesIncluded = currentOrganization?.minutes_included || 0;
  const minutePercentage = orgMinutesIncluded > 0 ? Math.min((orgMinutesUsed / orgMinutesIncluded) * 100, 100) : 0;
  const isMinuteCritical = minutePercentage > 80;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {hasDemoData && <DemoDataNotice />}

      {/* URGENT ALERTS BANNER */}
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
                  {escalations.urgent > 0 && <Badge className="bg-red-500 text-white border-0">{escalations.urgent} Urgent</Badge>}
                  {escalations.high > 0 && <Badge className="bg-orange-500 text-white border-0">{escalations.high} High</Badge>}
                  {escalations.medium > 0 && <Badge className="bg-amber-500 text-white border-0">{escalations.medium} Medium</Badge>}
                  Escalation{escalations.total > 1 ? "s" : ""} Need Attention
                </h3>
                <p className="text-sm text-slate-400 mt-1">Review and respond to member concerns from recent calls</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      )}

      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-tour="dashboard">
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening at {currentOrganization?.name}</p>
        </div>
      </div>

      {/* ═══ MODULE STATUS OVERVIEW ═══ */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* REACH Module Card */}
        <div
          className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/30 transition-colors cursor-pointer"
          onClick={() => navigate("/reach/eligibility")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Search className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">REACH</h3>
                <p className="text-xs text-slate-500">Get Found</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-xs">Free</Badge>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5 mb-2">
              {REACH_STAGES.map((s, i) => (
                <div
                  key={s.key}
                  className={`h-1.5 flex-1 rounded-full ${i < reachStage ? "bg-emerald-400" : "bg-white/10"}`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400">
              {reachStage === 0 && "Start your eligibility check"}
              {reachStage === 1 && "Run website preflight scan"}
              {reachStage === 2 && "Register with Google for Nonprofits"}
              {reachStage === 3 && "Complete Goodstack verification"}
              {reachStage === 4 && "Apply for Google Ad Grant"}
              {reachStage === 5 && "Awaiting Ad Grant approval"}
              {reachStage === 6 && "Ad Grant active!"}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-emerald-400 font-medium">
              {reachStage}/{REACH_STAGES.length} steps
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        {/* ATTRACT Module Card */}
        <div
          className={`p-5 rounded-xl bg-gradient-to-br border transition-colors cursor-pointer ${
            guardianStatus === "critical"
              ? "from-red-500/10 to-red-500/5 border-red-500/20 hover:border-red-500/30"
              : guardianStatus === "warning"
              ? "from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/30"
              : "from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/30"
          }`}
          onClick={() => navigate(hasModule("attract") ? "/attract/dashboard" : "/pricing")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  guardianStatus === "critical"
                    ? "bg-red-500/20"
                    : guardianStatus === "warning"
                    ? "bg-amber-500/20"
                    : "bg-blue-500/20"
                }`}
              >
                {guardianStatus === "critical" ? (
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                ) : guardianStatus === "warning" ? (
                  <Shield className="w-5 h-5 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">ATTRACT</h3>
                <p className="text-xs text-slate-500">Stay Protected</p>
              </div>
            </div>
            {hasModule("attract") ? (
              attractTrialActive && attractTrialDays !== null ? (
                <Badge className="bg-blue-500/20 text-blue-300 border-0 text-xs">{attractTrialDays}d trial left</Badge>
              ) : (
                <Badge className="bg-blue-500/20 text-blue-300 border-0 text-xs">Active</Badge>
              )
            ) : attractTrialExpired ? (
              <Badge className="bg-red-500/20 text-red-300 border-0 text-xs">Trial Expired</Badge>
            ) : (
              <Badge className="bg-slate-500/20 text-slate-400 border-0 text-xs">$199/mo</Badge>
            )}
          </div>
          <div className="mt-2">
            {hasModule("attract") ? (
              <>
                <p className="text-sm text-white font-medium">
                  {guardianStatus === "critical"
                    ? "Action Required"
                    : guardianStatus === "warning"
                    ? "Needs Attention"
                    : "Guardian Monitoring"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {complianceEvents.length > 0
                    ? `${complianceEvents.filter((e) => !e.is_read).length} unread alerts`
                    : "No compliance alerts"}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400">24/7 Google Ads monitoring, CTR protection, suspension defense</p>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-500">
              {hasModule("attract") ? "View Dashboard" : "Learn More"}
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        {/* ENGAGE Module Card */}
        <div
          className={`p-5 rounded-xl bg-gradient-to-br border transition-colors cursor-pointer ${
            isMinuteCritical
              ? "from-red-500/10 to-red-500/5 border-red-500/20 hover:border-red-500/30"
              : "from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:border-purple-500/30"
          }`}
          onClick={() => navigate("/communications")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMinuteCritical ? "bg-red-500/20" : "bg-purple-500/20"}`}>
                <Phone className={`w-5 h-5 ${isMinuteCritical ? "text-red-400" : "text-purple-400"}`} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">ENGAGE</h3>
                <p className="text-xs text-slate-500">Keep Connected</p>
              </div>
            </div>
            {hasModule("engage") ? (
              <Badge className={`${isMinuteCritical ? "bg-red-500/20 text-red-300" : "bg-purple-500/20 text-purple-300"} border-0 text-xs`}>
                {isMinuteCritical ? "Low Minutes" : "Active"}
              </Badge>
            ) : (
              <Badge className="bg-slate-500/20 text-slate-400 border-0 text-xs">$59/mo</Badge>
            )}
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white font-medium">
                {orgMinutesUsed}<span className="text-slate-500 font-normal">/{orgMinutesIncluded} min</span>
              </span>
              <span className="text-xs text-slate-500">{successRate}% success</span>
            </div>
            <Progress
              value={minutePercentage}
              className={`h-1.5 mt-2 ${isMinuteCritical ? "bg-red-500/20" : "bg-purple-500/20"}`}
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-500">{campaigns.length} campaigns</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>
      </div>

      {/* ═══ KEY METRICS ROW ═══ */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors" onClick={() => navigate("/people")}>
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-2">
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">{memberCount}</p>
          <p className="text-xs text-slate-500 mt-1">Total Members</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors" onClick={() => navigate("/communications")}>
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center mb-2">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{campaigns.length}</p>
          <p className="text-xs text-slate-500 mt-1">Campaigns</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors" onClick={() => navigate("/call-history")}>
          <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{successRate}%</p>
          <p className="text-xs text-slate-500 mt-1">Success Rate (30d)</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors" onClick={() => navigate("/reach/status")}>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{reachStage}/{REACH_STAGES.length}</p>
          <p className="text-xs text-slate-500 mt-1">Grant Progress</p>
        </div>
      </div>

      {/* ═══ DETAIL WIDGETS ═══ */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Calls */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-purple-400" />
              Recent Calls
            </h3>
            <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300 h-7 px-2" onClick={() => navigate("/call-history")}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentCalls.length > 0 ? (
              recentCalls.slice(0, 4).map((call) => (
                <div key={call.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-xs font-medium">
                      {call.person_name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{call.person_name}</p>
                      <p className="text-xs text-slate-500">{call.attempted_at ? new Date(call.attempted_at).toLocaleDateString() : "Recently"}</p>
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
              <div className="text-center py-6 text-sm text-slate-500">No recent calls</div>
            )}
          </div>
        </div>

        {/* ATTRACT — Compliance Alerts */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              Guardian Alerts
            </h3>
            {hasModule("attract") && (
              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 h-7 px-2" onClick={() => navigate("/attract/dashboard")}>
                View All
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {hasModule("attract") ? (
              complianceEvents.length > 0 ? (
                complianceEvents.slice(0, 4).map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          evt.severity === "critical" ? "bg-red-400" : evt.severity === "warning" ? "bg-amber-400" : "bg-green-400"
                        }`}
                      />
                      <p className="text-sm text-white truncate max-w-[200px]">{evt.message || evt.event_type}</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                      {new Date(evt.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-slate-500">All clear — no compliance issues</p>
                </div>
              )
            ) : (
              <div className="text-center py-6">
                <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-30" />
                <p className="text-sm text-slate-500 mb-3">24/7 Google Ads monitoring</p>
                <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => navigate("/pricing")}>
                  Unlock ATTRACT
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Quick Actions
            </h3>
          </div>
          <div className="space-y-2.5">
            <Button
              variant="outline"
              className="w-full justify-start border-white/10 text-slate-300 hover:bg-white/5 h-11"
              onClick={() => navigate("/reach/eligibility")}
            >
              <Search className="w-4 h-4 mr-3 text-emerald-400 shrink-0" />
              <div className="text-left">
                <p className="text-sm">Check Eligibility</p>
                <p className="text-xs text-slate-500">Google Ad Grant checker</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-white/10 text-slate-300 hover:bg-white/5 h-11"
              onClick={() => navigate("/people")}
            >
              <UserPlus className="w-4 h-4 mr-3 text-cyan-400 shrink-0" />
              <div className="text-left">
                <p className="text-sm">Add New Member</p>
                <p className="text-xs text-slate-500">Register a visitor or member</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-white/10 text-slate-300 hover:bg-white/5 h-11"
              onClick={() => navigate("/communications")}
            >
              <MessageSquare className="w-4 h-4 mr-3 text-blue-400 shrink-0" />
              <div className="text-left">
                <p className="text-sm">New Campaign</p>
                <p className="text-xs text-slate-500">AI calls or SMS messages</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-white/10 text-slate-300 hover:bg-white/5 h-11"
              onClick={() => navigate("/pricing")}
            >
              <Rocket className="w-4 h-4 mr-3 text-amber-400 shrink-0" />
              <div className="text-left">
                <p className="text-sm">View Plans & Pricing</p>
                <p className="text-xs text-slate-500">Upgrade or manage subscription</p>
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ SCHEDULED & UPCOMING ═══ */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming/Scheduled */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Scheduled Activities
            </h3>
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 h-7 px-2" onClick={() => navigate("/automations/scheduled")}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {upcomingCalls.length > 0 ? (
              upcomingCalls.slice(0, 4).map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      {call.trigger_type === "sms" ? (
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Phone className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{call.person_name}</p>
                      <p className="text-xs text-slate-500 capitalize">{call.trigger_type === "call" ? "AI Call" : "SMS Message"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {call.scheduled_at ? new Date(call.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Soon"}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-slate-500">No scheduled activities</div>
            )}
          </div>
        </div>

        {/* REACH Progress Detail */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              Grant Application Progress
            </h3>
            <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 h-7 px-2" onClick={() => navigate("/reach/status")}>
              Details
            </Button>
          </div>
          <div className="space-y-2.5">
            {REACH_STAGES.map((stage, i) => (
              <div key={stage.key} className="flex items-center gap-3">
                {i < reachStage ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : i === reachStage ? (
                  <Circle className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <span className={`text-sm ${i < reachStage ? "text-slate-300" : i === reachStage ? "text-white font-medium" : "text-slate-600"}`}>
                  {stage.label}
                </span>
                {i === reachStage && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-xs ml-auto">Current</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
