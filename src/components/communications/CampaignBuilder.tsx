import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MessageSquare, ArrowLeft, ArrowRight, Loader2, Users, Calendar, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";

interface CampaignBuilderProps {
    onComplete: (campaign: { id: string }) => void;
    onCancel: () => void;
}

interface Script {
    id: string;
    name: string;
    description: string | null;
}

interface Group {
    id: string;
    name: string;
}

interface Segment {
    id: string;
    name: string;
}

export function CampaignBuilder({ onComplete, onCancel }: CampaignBuilderProps) {
    const { currentOrganization, user } = useAuthStore();
    const { toast } = useToast();

    // Wizard State
    const [step, setStep] = useState(1);
    const totalSteps = 5;
    const progress = (step / totalSteps) * 100;

    // Step 1: Campaign Type
    const [campaignType, setCampaignType] = useState<"voice" | "sms">("voice");

    // Step 2: Script Selection
    const [scripts, setScripts] = useState<Script[]>([]);
    const [selectedScript, setSelectedScript] = useState<string | null>(null);
    const [loadingScripts, setLoadingScripts] = useState(false);

    // Step 3: Audience
    const [audienceMode, setAudienceMode] = useState<"segment" | "filter">("filter");
    const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [filters, setFilters] = useState({
        statuses: [] as string[],
        groups: [] as string[],
    });
    const [audienceCount, setAudienceCount] = useState(0);
    const [excludedCount, setExcludedCount] = useState(0);
    const [saveAudience, setSaveAudience] = useState(false);
    const [audienceName, setAudienceName] = useState("");

    // Step 4: Scheduling
    const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("10:00");

    // Step 5: Review & Launch
    const [launching, setLaunching] = useState(false);
    const [remainingMinutes, setRemainingMinutes] = useState(0);
    const estimatedMinutes = campaignType === "voice" ? audienceCount * 3 : 0;

    // --- Data Fetching ---
    useEffect(() => {
        if (currentOrganization?.id) {
            fetchScripts();
            fetchAudienceData();
            fetchMinuteUsage();
        }
    }, [currentOrganization]);

    useEffect(() => {
        if (audienceMode === "filter" && currentOrganization?.id) {
            calculateAudience();
        }
    }, [filters, audienceMode, currentOrganization]);

    const fetchScripts = async () => {
        setLoadingScripts(true);
        const { data } = await supabase
            .from("call_scripts")
            .select("id, name, description")
            .eq("organization_id", currentOrganization?.id)
            .eq("is_template", false);
        setScripts((data as Script[]) || []);
        setLoadingScripts(false);
    };

    const fetchAudienceData = async () => {
        const { data: segmentData } = await supabase
            .from("audience_segments")
            .select("id, name")
            .eq("organization_id", currentOrganization?.id);
        setSegments((segmentData as Segment[]) || []);

        const { data: groupData } = await supabase
            .from("groups")
            .select("id, name")
            .eq("organization_id", currentOrganization?.id);
        setGroups((groupData as Group[]) || []);
    };

    const fetchMinuteUsage = async () => {
        const { data } = await supabase
            .from("minute_usage")
            .select("minutes_used, minutes_included")
            .eq("organization_id", currentOrganization?.id)
            .order("billing_period_start", { ascending: false })
            .limit(1)
            .single();
        if (data) {
            setRemainingMinutes(data.minutes_included - data.minutes_used);
        }
    };

    const calculateAudience = async () => {
        let query = supabase
            .from("people")
            .select("id, do_not_call", { count: "exact" })
            .eq("organization_id", currentOrganization?.id);

        if (filters.statuses.length > 0) {
            query = query.in("status", filters.statuses);
        }

        // Filter by groups if selected (requires a join through group_members)
        // For simplicity, we'll just calculate based on status for now.
        // A more complex query or RPC would be needed for group filtering.

        const { data, count } = await query;
        const doNotCallCount = data?.filter(p => p.do_not_call).length || 0;
        setAudienceCount((count || 0) - doNotCallCount);
        setExcludedCount(doNotCallCount);
    };

    // --- Navigation ---
    const handleNext = () => {
        if (step === 2 && !selectedScript) {
            toast({ title: "Please select a script", variant: "destructive" });
            return;
        }
        if (step === 3 && audienceCount === 0) {
            toast({ title: "Audience is empty", description: "Please select filters to build an audience.", variant: "destructive" });
            return;
        }
        setStep(step + 1);
    };

    const handleBack = () => {
        if (step === 1) {
            onCancel();
        } else {
            setStep(step - 1);
        }
    };

    // --- Launch ---
    const handleLaunch = async () => {
        setLaunching(true);
        try {
            // 1. Save audience segment if requested
            if (saveAudience && audienceName.trim()) {
                await supabase.from("audience_segments").insert({
                    organization_id: currentOrganization?.id,
                    name: audienceName,
                    filters: filters,
                    created_by: user?.id,
                });
            }

            // 2. Create campaign record
            const campaignTable = campaignType === "voice" ? "calling_campaigns" : "messaging_campaigns";
            const scheduledAt = scheduleMode === "later" && scheduledDate
                ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
                : null;

            const { data: campaign, error: campaignError } = await supabase
                .from(campaignTable)
                .insert({
                    organization_id: currentOrganization?.id,
                    name: `Campaign - ${new Date().toLocaleDateString()}`,
                    script_id: selectedScript,
                    status: scheduleMode === "now" ? "in_progress" : "scheduled",
                    scheduled_at: scheduledAt,
                })
                .select()
                .single();

            if (campaignError) throw campaignError;

            // 3. Fetch audience with phone numbers
            let audienceQuery = supabase
                .from("people")
                .select("id, first_name, phone_number")
                .eq("organization_id", currentOrganization?.id)
                .eq("do_not_call", false)
                .not("phone_number", "is", null);

            if (filters.statuses.length > 0) {
                audienceQuery = audienceQuery.in("status", filters.statuses);
            }
            const { data: audience } = await audienceQuery;

            // 4a. Create call_attempts for voice campaigns
            if (campaignType === "voice" && audience && audience.length > 0) {
                const callAttempts = audience.map(person => ({
                    organization_id: currentOrganization?.id,
                    campaign_id: campaign.id,
                    person_id: person.id,
                    phone_number: person.phone_number,
                    script_id: selectedScript,
                    status: scheduleMode === "now" ? "pending" : "scheduled",
                    scheduled_at: scheduledAt,
                }));
                await supabase.from("call_attempts").insert(callAttempts);
            }

            // 4b. Create campaign_recipients for SMS campaigns
            if (campaignType === "sms" && audience && audience.length > 0) {
                const recipients = audience.map(person => ({
                    campaign_id: campaign.id,
                    person_id: person.id,
                    phone_number: person.phone_number,
                    status: scheduleMode === "now" ? "pending" : "scheduled",
                }));
                await supabase.from("campaign_recipients").insert(recipients);
            }

            // 5a. Trigger calls if "now" for voice
            if (scheduleMode === "now" && campaignType === "voice") {
                await supabase.functions.invoke("send-group-call", {
                    body: { campaign_id: campaign.id },
                });
            }

            // 5b. Trigger SMS sending if "now" for sms
            if (scheduleMode === "now" && campaignType === "sms") {
                // Fetch the script content to use as the message
                const { data: scriptData } = await supabase
                    .from("call_scripts")
                    .select("content")
                    .eq("id", selectedScript)
                    .single();

                if (scriptData && audience) {
                    await supabase.functions.invoke("send-sms", {
                        body: {
                            recipientType: "campaign",
                            campaignId: campaign.id,
                            message: scriptData.content,
                            organizationId: currentOrganization?.id,
                            createdBy: user?.id,
                        },
                    });
                }
            }

            toast({ title: "Campaign Launched!", description: `${audience?.length || 0} recipients queued.` });
            onComplete(campaign);
        } catch (error: unknown) {
            console.error("Launch error:", error);
            toast({ title: "Launch failed", description: (error as Error).message, variant: "destructive" });
        } finally {
            setLaunching(false);
        }
    };


    const toggleStatus = (status: string) => {
        setFilters(prev => ({
            ...prev,
            statuses: prev.statuses.includes(status)
                ? prev.statuses.filter(s => s !== status)
                : [...prev.statuses, status],
        }));
    };

    const selectedScriptName = scripts.find(s => s.id === selectedScript)?.name || "None";

    return (
        <div className="max-w-2xl mx-auto py-6">
            {/* Progress Bar */}
            <div className="mb-8">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between mt-2">
                    {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className={`text-xs font-medium ${step >= s ? "text-primary" : "text-muted-foreground"}`}>
                            {s === 1 && "Type"}
                            {s === 2 && "Script"}
                            {s === 3 && "Audience"}
                            {s === 4 && "Schedule"}
                            {s === 5 && "Review"}
                        </span>
                    ))}
                </div>
            </div>

            {/* Step 1: Campaign Type */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Campaign Type</CardTitle>
                        <CardDescription>Choose how you want to reach your audience.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup value={campaignType} onValueChange={(v) => setCampaignType(v as "voice" | "sms")} className="space-y-4">
                            <Label htmlFor="voice" className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-colors ${campaignType === "voice" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                                <RadioGroupItem value="voice" id="voice" />
                                <Phone className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="font-medium">AI Voice Call</p>
                                    <p className="text-sm text-muted-foreground">Automated, personalized calls via VAPI.</p>
                                </div>
                            </Label>
                            <Label htmlFor="sms" className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-colors ${campaignType === "sms" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                                <RadioGroupItem value="sms" id="sms" />
                                <MessageSquare className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="font-medium">SMS Campaign</p>
                                    <p className="text-sm text-muted-foreground">Text messages via Twilio.</p>
                                </div>
                            </Label>
                        </RadioGroup>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Script Selection */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select a Script</CardTitle>
                        <CardDescription>Choose the message your audience will receive.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingScripts ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                        ) : scripts.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No scripts found. Create one in Settings → Scripts.</p>
                        ) : (
                            <RadioGroup value={selectedScript || ""} onValueChange={setSelectedScript} className="space-y-3">
                                {scripts.map((script) => (
                                    <Label key={script.id} htmlFor={script.id} className={`block p-4 border rounded-lg cursor-pointer transition-colors ${selectedScript === script.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                                        <div className="flex items-start gap-3">
                                            <RadioGroupItem value={script.id} id={script.id} className="mt-1" />
                                            <div>
                                                <p className="font-medium">{script.name}</p>
                                                {script.description && <p className="text-sm text-muted-foreground mt-1">{script.description}</p>}
                                            </div>
                                        </div>
                                    </Label>
                                ))}
                            </RadioGroup>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Audience */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Define Audience</CardTitle>
                        <CardDescription>Select who will receive this campaign.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <RadioGroup value={audienceMode} onValueChange={(v) => setAudienceMode(v as "segment" | "filter")} className="flex gap-4">
                            <Label htmlFor="filter" className="flex items-center space-x-2 cursor-pointer"><RadioGroupItem value="filter" id="filter" /><span>Build filter</span></Label>
                            <Label htmlFor="segment" className="flex items-center space-x-2 cursor-pointer"><RadioGroupItem value="segment" id="segment" /><span>Use saved segment</span></Label>
                        </RadioGroup>

                        {audienceMode === "segment" && (
                            <Select value={selectedSegment || ""} onValueChange={setSelectedSegment}>
                                <SelectTrigger><SelectValue placeholder="Select a saved segment" /></SelectTrigger>
                                <SelectContent>
                                    {segments.map((seg) => (<SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        )}

                        {audienceMode === "filter" && (
                            <div className="space-y-4">
                                <div>
                                    <Label className="mb-2 block">Member Status</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {["member", "first_time_visitor", "regular_attender", "leader"].map((status) => (
                                            <Button key={status} variant={filters.statuses.includes(status) ? "default" : "outline"} size="sm" onClick={() => toggleStatus(status)}>
                                                {status.replace(/_/g, " ")}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="mb-2 block">Groups</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {groups.map((group) => (
                                            <Button key={group.id} variant={filters.groups.includes(group.id) ? "default" : "outline"} size="sm"
                                                onClick={() => setFilters(prev => ({ ...prev, groups: prev.groups.includes(group.id) ? prev.groups.filter(g => g !== group.id) : [...prev.groups, group.id] }))}>
                                                {group.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="text-lg font-semibold">{audienceCount} people will be contacted</p>
                                {excludedCount > 0 && <p className="text-sm text-muted-foreground">{excludedCount} excluded (do not call)</p>}
                            </div>
                            <Users className="h-8 w-8 text-muted-foreground" />
                        </div>

                        {audienceMode === "filter" && audienceCount > 0 && (
                            <div className="flex items-start gap-3 pt-2 border-t">
                                <Checkbox id="save-audience" checked={saveAudience} onCheckedChange={(c) => setSaveAudience(!!c)} />
                                <div className="space-y-1">
                                    <Label htmlFor="save-audience">Save this audience as a segment</Label>
                                    {saveAudience && <Input placeholder="Segment name" value={audienceName} onChange={(e) => setAudienceName(e.target.value)} className="mt-2" />}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Scheduling */}
            {step === 4 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Schedule Campaign</CardTitle>
                        <CardDescription>Choose when to send your campaign.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <RadioGroup value={scheduleMode} onValueChange={(v) => setScheduleMode(v as "now" | "later")} className="space-y-3">
                            <Label htmlFor="now" className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer ${scheduleMode === "now" ? "border-primary bg-primary/5" : ""}`}>
                                <RadioGroupItem value="now" id="now" />
                                <div><p className="font-medium">Send Now</p><p className="text-sm text-muted-foreground">Launch immediately</p></div>
                            </Label>
                            <Label htmlFor="later" className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer ${scheduleMode === "later" ? "border-primary bg-primary/5" : ""}`}>
                                <RadioGroupItem value="later" id="later" />
                                <div><p className="font-medium">Schedule for Later</p><p className="text-sm text-muted-foreground">Pick a date and time</p></div>
                            </Label>
                        </RadioGroup>

                        {scheduleMode === "later" && (
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div><Label>Date</Label><Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split("T")[0]} /></div>
                                <div><Label>Time</Label><Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} /></div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 5: Review & Launch */}
            {step === 5 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> Review & Launch</CardTitle>
                        <CardDescription>Confirm your campaign details before launching.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{campaignType} Campaign</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Script</span><span className="font-medium">{selectedScriptName}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Audience</span><span className="font-medium">{audienceCount} people</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-medium">{scheduleMode === "now" ? "Immediately" : `${scheduledDate} at ${scheduledTime}`}</span></div>
                            {campaignType === "voice" && (
                                <div className="flex justify-between border-t pt-3"><span className="text-muted-foreground">Est. Minutes</span><span className="font-medium">~{estimatedMinutes} min</span></div>
                            )}
                        </div>

                        {campaignType === "voice" && estimatedMinutes > remainingMinutes && (
                            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-4 rounded-lg text-sm">
                                ⚠️ This campaign may exceed your remaining minutes ({remainingMinutes} available).
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack}><ArrowLeft className="h-4 w-4 mr-2" />{step === 1 ? "Cancel" : "Back"}</Button>
                {step < 5 ? (
                    <Button onClick={handleNext}>Next<ArrowRight className="h-4 w-4 ml-2" /></Button>
                ) : (
                    <Button onClick={handleLaunch} disabled={launching} className="bg-green-600 hover:bg-green-700">{launching ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Launching...</> : "🚀 Launch Campaign"}</Button>
                )}
            </div>
        </div>
    );
}
