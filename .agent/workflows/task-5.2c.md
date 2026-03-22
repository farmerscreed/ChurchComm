---
description: Create Campaign Builder - review step and launch
epic: Epic 5 - Enhanced UI/UX
task_id: 5.2c
---

## Context
Complete the campaign builder with review step and launch functionality.

## Prerequisites
- Tasks 5.2a and 5.2b complete

## Implementation Steps

### 1. Add review step (Step 5)

```tsx
// Add estimated minutes state
const [estimatedMinutes, setEstimatedMinutes] = useState(0);

// Calculate estimated minutes (average 3 min per call)
useEffect(() => {
  if (campaignType === "voice") {
    setEstimatedMinutes(audienceCount * 3);
  }
}, [audienceCount, campaignType]);

// Step 5 UI
{step === 5 && (
  <Card>
    <CardHeader>
      <CardTitle>Review & Launch</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="bg-muted p-4 rounded-lg space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Campaign Type</span>
          <span className="font-medium capitalize">{campaignType} Call</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Script</span>
          <span className="font-medium">{scripts.find(s => s.id === selectedScript)?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Audience</span>
          <span className="font-medium">{audienceCount} people</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Schedule</span>
          <span className="font-medium">
            {scheduleMode === "now" 
              ? "Immediately" 
              : `${scheduledDate?.toLocaleDateString()} at ${scheduledTime}`}
          </span>
        </div>
        {campaignType === "voice" && (
          <div className="flex justify-between border-t pt-3">
            <span className="text-muted-foreground">Estimated Minutes</span>
            <span className="font-medium">~{estimatedMinutes} min</span>
          </div>
        )}
      </div>

      {/* Warning if would exceed minutes */}
      {campaignType === "voice" && estimatedMinutes > remainingMinutes && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="text-yellow-800">
            ⚠️ This campaign may exceed your remaining minutes ({remainingMinutes} available).
          </p>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

### 2. Implement launch functionality

```tsx
const [launching, setLaunching] = useState(false);

const handleLaunch = async () => {
  setLaunching(true);

  try {
    // 1. Save audience segment if requested
    if (saveAudience && audienceName) {
      await supabase.from("audience_segments").insert({
        organization_id: currentOrganization?.id,
        name: audienceName,
        filters: filters,
        created_by: user?.id,
      });
    }

    // 2. Create campaign record
    const campaignTable = campaignType === "voice" ? "calling_campaigns" : "messaging_campaigns";
    
    const { data: campaign, error: campaignError } = await supabase
      .from(campaignTable)
      .insert({
        organization_id: currentOrganization?.id,
        name: `Campaign - ${new Date().toLocaleDateString()}`,
        script_id: selectedScript,
        status: scheduleMode === "now" ? "in_progress" : "scheduled",
        scheduled_at: scheduleMode === "later" 
          ? new Date(`${scheduledDate?.toISOString().split("T")[0]}T${scheduledTime}`).toISOString()
          : null,
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // 3. Fetch audience and create call attempts
    let audienceQuery = supabase
      .from("people")
      .select("id, phone")
      .eq("organization_id", currentOrganization?.id)
      .eq("do_not_call", false);

    if (filters.statuses.length > 0) {
      audienceQuery = audienceQuery.in("status", filters.statuses);
    }

    const { data: audience } = await audienceQuery;

    // 4. Create call_attempts for each person
    if (campaignType === "voice" && audience) {
      const callAttempts = audience.map(person => ({
        organization_id: currentOrganization?.id,
        campaign_id: campaign.id,
        person_id: person.id,
        script_id: selectedScript,
        status: scheduleMode === "now" ? "pending" : "scheduled",
        scheduled_at: scheduleMode === "later"
          ? new Date(`${scheduledDate?.toISOString().split("T")[0]}T${scheduledTime}`).toISOString()
          : null,
      }));

      await supabase.from("call_attempts").insert(callAttempts);
    }

    // 5. If "now", trigger the calls
    if (scheduleMode === "now" && campaignType === "voice") {
      await supabase.functions.invoke("send-group-call", {
        body: { campaign_id: campaign.id },
      });
    }

    onComplete(campaign);
  } catch (error) {
    console.error("Launch error:", error);
    toast({ title: "Launch failed", variant: "destructive" });
  }

  setLaunching(false);
};

// Update navigation for step 5
<div className="flex justify-between mt-6">
  <Button variant="outline" onClick={handleBack}>
    <ArrowLeft className="h-4 w-4 mr-2" />
    Back
  </Button>
  {step < 5 ? (
    <Button onClick={handleNext}>
      Next
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
  ) : (
    <Button onClick={handleLaunch} disabled={launching}>
      {launching ? "Launching..." : "🚀 Launch Campaign"}
    </Button>
  )}
</div>
```

### 3. Integrate into Communications page

```tsx
// In Communications.tsx:
import { CampaignBuilder } from "@/components/communications/CampaignBuilder";

const [showBuilder, setShowBuilder] = useState(false);

// Add button
<Button onClick={() => setShowBuilder(true)}>
  <Plus className="mr-2 h-4 w-4" />
  New Campaign
</Button>

// Show builder or campaign list
{showBuilder ? (
  <CampaignBuilder 
    onComplete={(campaign) => {
      setShowBuilder(false);
      navigate(`/communications/${campaign.id}`);
    }}
    onCancel={() => setShowBuilder(false)}
  />
) : (
  // Existing campaign list
)}
```

## Verification
1. Complete all 5 steps
2. Verify review shows correct summary
3. Verify minute estimate displays
4. Click Launch and verify:
   - Campaign created
   - Call attempts created
   - send-group-call triggered (for "now")
5. Verify scheduled campaigns work

## On Completion
Update `activity.md` and mark task 5.2c as `[x]`
