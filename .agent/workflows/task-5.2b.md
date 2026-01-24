---
description: Create Campaign Builder - audience and scheduling steps
epic: Epic 5 - Enhanced UI/UX
task_id: 5.2b
---

## Context
Build the audience selection and scheduling steps of the campaign builder.

## Prerequisites
- Task 5.2a complete
- audience_segments table exists

## Implementation Steps

### 1. Add audience selection step (Step 3)

Add to CampaignBuilder.tsx:

```tsx
// Add state
const [audienceMode, setAudienceMode] = useState<"segment" | "filter">("filter");
const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
const [filters, setFilters] = useState({
  statuses: [] as string[],
  groups: [] as string[],
  tags: [] as string[],
});
const [segments, setSegments] = useState<any[]>([]);
const [audienceCount, setAudienceCount] = useState<number>(0);
const [excludedCount, setExcludedCount] = useState<number>(0);
const [groups, setGroups] = useState<any[]>([]);

// Fetch segments and groups
useEffect(() => {
  const fetchAudienceData = async () => {
    const { data: segmentData } = await supabase
      .from("audience_segments")
      .select("*")
      .eq("organization_id", currentOrganization?.id);
    setSegments(segmentData || []);

    const { data: groupData } = await supabase
      .from("groups")
      .select("id, name")
      .eq("organization_id", currentOrganization?.id);
    setGroups(groupData || []);
  };
  fetchAudienceData();
}, [currentOrganization]);

// Calculate audience count
useEffect(() => {
  const calculateAudience = async () => {
    let query = supabase
      .from("people")
      .select("id, do_not_call", { count: "exact" })
      .eq("organization_id", currentOrganization?.id);

    if (filters.statuses.length > 0) {
      query = query.in("status", filters.statuses);
    }

    const { data, count } = await query;
    const doNotCallCount = data?.filter(p => p.do_not_call).length || 0;
    setAudienceCount((count || 0) - doNotCallCount);
    setExcludedCount(doNotCallCount);
  };
  
  if (audienceMode === "filter") {
    calculateAudience();
  }
}, [filters, audienceMode, currentOrganization]);

// Step 3 UI
{step === 3 && (
  <Card>
    <CardHeader>
      <CardTitle>Define Audience</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <RadioGroup value={audienceMode} onValueChange={(v) => setAudienceMode(v as "segment" | "filter")}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="segment" id="segment" />
          <Label htmlFor="segment">Use saved segment</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="filter" id="filter" />
          <Label htmlFor="filter">Build filter</Label>
        </div>
      </RadioGroup>

      {audienceMode === "segment" && (
        <Select value={selectedSegment || ""} onValueChange={setSelectedSegment}>
          <SelectTrigger>
            <SelectValue placeholder="Select a saved segment" />
          </SelectTrigger>
          <SelectContent>
            {segments.map((seg) => (
              <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {audienceMode === "filter" && (
        <div className="space-y-4">
          <div>
            <Label>Member Status</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["member", "first_time_visitor", "regular_attender", "leader"].map((status) => (
                <Button
                  key={status}
                  variant={filters.statuses.includes(status) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      statuses: prev.statuses.includes(status)
                        ? prev.statuses.filter(s => s !== status)
                        : [...prev.statuses, status]
                    }));
                  }}
                >
                  {status.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Groups</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {groups.map((group) => (
                <Button
                  key={group.id}
                  variant={filters.groups.includes(group.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      groups: prev.groups.includes(group.id)
                        ? prev.groups.filter(g => g !== group.id)
                        : [...prev.groups, group.id]
                    }));
                  }}
                >
                  {group.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-muted p-4 rounded-lg">
        <p className="text-lg font-semibold">{audienceCount} people will be contacted</p>
        {excludedCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {excludedCount} excluded (do not call)
          </p>
        )}
      </div>
    </CardContent>
  </Card>
)}
```

### 2. Add scheduling step (Step 4)

```tsx
// Add state
const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
const [scheduledTime, setScheduledTime] = useState("10:00");

// Step 4 UI
{step === 4 && (
  <Card>
    <CardHeader>
      <CardTitle>Schedule Campaign</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <RadioGroup value={scheduleMode} onValueChange={(v) => setScheduleMode(v as "now" | "later")}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="now" id="now" />
          <Label htmlFor="now">Send Now</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="later" id="later" />
          <Label htmlFor="later">Schedule for Later</Label>
        </div>
      </RadioGroup>

      {scheduleMode === "later" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={scheduledDate?.toISOString().split("T")[0] || ""}
              onChange={(e) => setScheduledDate(new Date(e.target.value))}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div>
            <Label>Time</Label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Warning if outside calling window */}
      {scheduleMode === "later" && scheduledTime && (
        <CallingWindowWarning time={scheduledTime} />
      )}
    </CardContent>
  </Card>
)}
```

### 3. Add "Save Audience" option

```tsx
const [saveAudience, setSaveAudience] = useState(false);
const [audienceName, setAudienceName] = useState("");

// In step 3:
{audienceMode === "filter" && audienceCount > 0 && (
  <div className="flex items-center gap-2">
    <Checkbox 
      checked={saveAudience} 
      onCheckedChange={(c) => setSaveAudience(!!c)} 
    />
    <Label>Save this audience as a segment</Label>
  </div>
)}

{saveAudience && (
  <Input
    placeholder="Segment name"
    value={audienceName}
    onChange={(e) => setAudienceName(e.target.value)}
  />
)}
```

## Verification
1. Verify audience mode toggle works
2. Verify filter buttons toggle correctly
3. Verify audience count updates live
4. Verify do_not_call exclusions shown
5. Verify scheduling date/time picker works

## On Completion
Update `activity.md` and mark task 5.2b as `[x]`
