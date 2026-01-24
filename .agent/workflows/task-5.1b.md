---
description: Add escalation and upcoming calls widgets to Dashboard
epic: Epic 5 - Enhanced UI/UX
task_id: 5.1b
---

## Context
Complete the dashboard with escalation alerts, success rate, and upcoming calls widgets.

## Prerequisites
- Task 5.1a complete

## Implementation Steps

### 1. Create EscalationWidget

Create `src/components/dashboard/EscalationWidget.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EscalationWidgetProps {
  urgent: number;
  high: number;
  medium: number;
  total: number;
}

export function EscalationWidget({ urgent, high, medium, total }: EscalationWidgetProps) {
  const navigate = useNavigate();

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50" 
      onClick={() => navigate("/follow-ups")}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Escalation Alerts</CardTitle>
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{total} Open</div>
        <div className="flex gap-2 mt-2">
          {urgent > 0 && (
            <Badge variant="destructive">{urgent} Urgent</Badge>
          )}
          {high > 0 && (
            <Badge className="bg-orange-500">{high} High</Badge>
          )}
          {medium > 0 && (
            <Badge variant="secondary">{medium} Medium</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 2. Create CallSuccessWidget

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface CallSuccessWidgetProps {
  completed: number;
  total: number;
}

export function CallSuccessWidget({ completed, total }: CallSuccessWidgetProps) {
  const percentage = total > 0 ? ((completed / total) * 100).toFixed(0) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Call Success Rate</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-green-600">{percentage}%</div>
        <p className="text-xs text-muted-foreground mt-1">
          {completed} of {total} calls completed this period
        </p>
      </CardContent>
    </Card>
  );
}
```

### 3. Create UpcomingCallsWidget

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Gift, UserPlus, Heart } from "lucide-react";
import { format } from "date-fns";

interface UpcomingCall {
  id: string;
  person_name: string;
  trigger_type: string;
  scheduled_at: string;
}

export function UpcomingCallsWidget({ calls }: { calls: UpcomingCall[] }) {
  const getTriggerIcon = (type: string) => {
    switch (type) {
      case "birthday": return <Gift className="h-4 w-4 text-pink-500" />;
      case "first_timer": return <UserPlus className="h-4 w-4 text-green-500" />;
      case "anniversary": return <Heart className="h-4 w-4 text-purple-500" />;
      default: return <Calendar className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Upcoming Auto-Calls (24h)</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scheduled calls</p>
        ) : (
          <div className="space-y-3">
            {calls.slice(0, 5).map(call => (
              <div key={call.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTriggerIcon(call.trigger_type)}
                  <span className="text-sm">{call.person_name}</span>
                </div>
                <span className="text-xs text-muted-foreground capitalize">
                  {call.trigger_type?.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4. Add widgets to Dashboard.tsx

```tsx
import { EscalationWidget } from "@/components/dashboard/EscalationWidget";
import { CallSuccessWidget } from "@/components/dashboard/CallSuccessWidget";
import { UpcomingCallsWidget } from "@/components/dashboard/UpcomingCallsWidget";

// Add state
const [escalations, setEscalations] = useState({ urgent: 0, high: 0, medium: 0, total: 0 });
const [callStats, setCallStats] = useState({ completed: 0, total: 0 });
const [upcomingCalls, setUpcomingCalls] = useState([]);

// Add to fetchDashboardData:
// Fetch escalations
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

// Fetch call stats
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

// Fetch upcoming scheduled calls
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const { data: upcomingData } = await supabase
  .from("call_attempts")
  .select("id, trigger_type, scheduled_at, people(first_name, last_name)")
  .eq("organization_id", currentOrganization?.id)
  .eq("status", "scheduled")
  .lte("scheduled_at", tomorrow.toISOString())
  .order("scheduled_at", { ascending: true });

setUpcomingCalls(
  (upcomingData || []).map(c => ({
    ...c,
    person_name: `${c.people?.first_name} ${c.people?.last_name}`,
  }))
);

// In the render:
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Existing widgets */}
  
  {(isAdmin || isPastor) && (
    <EscalationWidget {...escalations} />
  )}
  
  <CallSuccessWidget {...callStats} />
  
  {(isAdmin || isPastor) && (
    <UpcomingCallsWidget calls={upcomingCalls} />
  )}
</div>
```

### 5. Handle empty/loading states

Add loading skeleton and empty states to all widgets.

## Verification
1. Verify all 6 widgets appear on dashboard
2. Verify escalation widget shows correct counts
3. Verify click navigation works
4. Verify role-based visibility (members see fewer)
5. Verify responsive layout

## On Completion
Update `activity.md` and mark task 5.1b as `[x]`
