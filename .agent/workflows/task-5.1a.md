---
description: Redesign Dashboard with widget grid layout
epic: Epic 5 - Enhanced UI/UX
task_id: 5.1a
---

## Context
Create a calling-focused dashboard with key metrics widgets.

## Prerequisites
- Database tables exist (minute_usage, call_attempts, etc.)

## Implementation Steps

### 1. Create dashboard widget components folder

Create `src/components/dashboard/` directory.

### 2. Create MinuteUsageWidget

Create `src/components/dashboard/MinuteUsageWidget.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Phone } from "lucide-react";

interface MinuteUsageWidgetProps {
  minutesUsed: number;
  minutesIncluded: number;
}

export function MinuteUsageWidget({ minutesUsed, minutesIncluded }: MinuteUsageWidgetProps) {
  const percentage = (minutesUsed / minutesIncluded) * 100;
  const remaining = minutesIncluded - minutesUsed;
  
  const getColor = () => {
    if (percentage >= 80) return "text-red-500";
    if (percentage >= 60) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Minutes Usage</CardTitle>
        <Phone className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getColor()}`}>
          {remaining.toFixed(0)} remaining
        </div>
        <Progress value={percentage} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {minutesUsed.toFixed(0)} of {minutesIncluded} minutes used
        </p>
      </CardContent>
    </Card>
  );
}
```

### 3. Create ActiveCampaignsWidget

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Campaign {
  id: string;
  name: string;
  status: string;
  progress: number;
}

export function ActiveCampaignsWidget({ campaigns }: { campaigns: Campaign[] }) {
  const navigate = useNavigate();
  const activeCampaigns = campaigns.filter(c => c.status === "in_progress");

  return (
    <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/communications")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
        <Megaphone className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{activeCampaigns.length}</div>
        {activeCampaigns.slice(0, 2).map(campaign => (
          <div key={campaign.id} className="flex justify-between text-xs mt-2">
            <span className="truncate">{campaign.name}</span>
            <span className="text-muted-foreground">{campaign.progress}%</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

### 4. Create RecentCallsWidget

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneCall, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentCall {
  id: string;
  person_name: string;
  status: string;
  created_at: string;
}

export function RecentCallsWidget({ calls }: { calls: RecentCall[] }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Recent Calls</CardTitle>
        <PhoneCall className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {calls.slice(0, 5).map(call => (
            <div key={call.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(call.status)}
                <span className="text-sm">{call.person_name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5. Redesign Dashboard.tsx

```tsx
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { MinuteUsageWidget } from "@/components/dashboard/MinuteUsageWidget";
import { ActiveCampaignsWidget } from "@/components/dashboard/ActiveCampaignsWidget";
import { RecentCallsWidget } from "@/components/dashboard/RecentCallsWidget";

export default function Dashboard() {
  const { currentOrganization } = useAuthStore();
  const { isAdmin, isPastor } = usePermissions();
  const [minuteUsage, setMinuteUsage] = useState({ used: 0, included: 0 });
  const [campaigns, setCampaigns] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchDashboardData();
    }
  }, [currentOrganization]);

  const fetchDashboardData = async () => {
    // Fetch minute usage
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

    // Fetch campaigns
    const { data: campaignData } = await supabase
      .from("calling_campaigns")
      .select("*")
      .eq("organization_id", currentOrganization?.id)
      .order("created_at", { ascending: false })
      .limit(5);

    setCampaigns(campaignData || []);

    // Fetch recent calls
    const { data: callData } = await supabase
      .from("call_attempts")
      .select("id, status, created_at, people(first_name, last_name)")
      .eq("organization_id", currentOrganization?.id)
      .order("created_at", { ascending: false })
      .limit(5);

    setRecentCalls(
      (callData || []).map(c => ({
        ...c,
        person_name: `${c.people?.first_name} ${c.people?.last_name}`,
      }))
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(isAdmin || isPastor) && (
          <MinuteUsageWidget 
            minutesUsed={minuteUsage.used} 
            minutesIncluded={minuteUsage.included} 
          />
        )}
        
        <ActiveCampaignsWidget campaigns={campaigns} />
        <RecentCallsWidget calls={recentCalls} />
        
        {/* More widgets added in 5.1b */}
      </div>
    </div>
  );
}
```

## Verification
1. Navigate to dashboard
2. Verify widgets display with real data
3. Verify responsive layout (2-col on md, 3-col on lg)
4. Verify role-based visibility

## On Completion
Update `activity.md` and mark task 5.1a as `[x]`
