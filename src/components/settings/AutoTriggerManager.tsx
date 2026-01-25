import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Cake, UserPlus, Calendar, Clock, Sparkles, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";

interface AutoTrigger {
    id: string;
    trigger_type: "first_timer" | "birthday" | "anniversary";
    enabled: boolean;
    script_id: string | null;
    delay_hours: number;
    anniversary_milestones: number[];
}

interface Script {
    id: string;
    name: string;
    template_type: string | null;
}

const TRIGGER_CONFIG = {
    first_timer: {
        title: "First-Timer Follow-up",
        description: "Automatically call new visitors after their first visit",
        icon: UserPlus,
        color: "bg-green-500",
        delayLabel: "Call after (hours)",
        suggestedTemplate: "first_timer_followup",
    },
    birthday: {
        title: "Birthday Calls",
        description: "Send birthday wishes to members on their special day",
        icon: Cake,
        color: "bg-pink-500",
        delayLabel: "Call at what time",
        suggestedTemplate: "birthday_greeting",
    },
    anniversary: {
        title: "Membership Anniversary",
        description: "Celebrate milestones when members hit anniversaries",
        icon: Calendar,
        color: "bg-purple-500",
        delayLabel: "Anniversary milestones (months)",
        suggestedTemplate: "anniversary_celebration",
    },
};

export function AutoTriggerManager() {
    const [triggers, setTriggers] = useState<AutoTrigger[]>([]);
    const [scripts, setScripts] = useState<Script[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const { currentOrganization } = useAuthStore();
    const { toast } = useToast();

    useEffect(() => {
        if (currentOrganization?.id) {
            fetchData();
        }
    }, [currentOrganization]);

    const fetchData = async () => {
        setLoading(true);

        // Fetch triggers
        const { data: triggerData, error: triggerError } = await supabase
            .from("auto_triggers")
            .select("*")
            .eq("organization_id", currentOrganization?.id);

        if (!triggerError && triggerData) {
            // Ensure all trigger types exist
            const existingTypes = triggerData.map((t: AutoTrigger) => t.trigger_type);
            const missingTypes = (["first_timer", "birthday", "anniversary"] as const).filter(
                (t) => !existingTypes.includes(t)
            );

            // Create missing triggers
            for (const type of missingTypes) {
                const { data: newTrigger } = await supabase
                    .from("auto_triggers")
                    .insert({
                        organization_id: currentOrganization?.id,
                        trigger_type: type,
                        enabled: false,
                        delay_hours: type === "first_timer" ? 24 : 10,
                        anniversary_milestones: type === "anniversary" ? [1, 6, 12] : [],
                    })
                    .select()
                    .single();

                if (newTrigger) {
                    triggerData.push(newTrigger);
                }
            }

            setTriggers(triggerData as AutoTrigger[]);
        }

        // Fetch scripts (user's + org's)
        const { data: scriptData } = await supabase
            .from("call_scripts")
            .select("id, name, template_type")
            .or(`organization_id.eq.${currentOrganization?.id},is_system.eq.true`)
            .order("is_system", { ascending: false })
            .order("name");

        if (scriptData) {
            setScripts(scriptData as Script[]);
        }

        setLoading(false);
    };

    const handleToggle = async (triggerId: string, enabled: boolean) => {
        setSaving(triggerId);

        const { error } = await supabase
            .from("auto_triggers")
            .update({ enabled })
            .eq("id", triggerId);

        if (error) {
            toast({
                title: "Error",
                description: "Failed to update trigger",
                variant: "destructive",
            });
        } else {
            setTriggers((prev) =>
                prev.map((t) => (t.id === triggerId ? { ...t, enabled } : t))
            );
            toast({
                title: enabled ? "Trigger Enabled" : "Trigger Disabled",
                description: enabled
                    ? "Automatic calls will now be made for this trigger"
                    : "Automatic calls have been paused",
            });
        }

        setSaving(null);
    };

    const handleScriptChange = async (triggerId: string, scriptId: string) => {
        setSaving(triggerId);

        const { error } = await supabase
            .from("auto_triggers")
            .update({ script_id: scriptId || null })
            .eq("id", triggerId);

        if (error) {
            toast({
                title: "Error",
                description: "Failed to update script",
                variant: "destructive",
            });
        } else {
            setTriggers((prev) =>
                prev.map((t) => (t.id === triggerId ? { ...t, script_id: scriptId || null } : t))
            );
        }

        setSaving(null);
    };

    const handleDelayChange = async (triggerId: string, delayHours: number) => {
        setSaving(triggerId);

        const { error } = await supabase
            .from("auto_triggers")
            .update({ delay_hours: delayHours })
            .eq("id", triggerId);

        if (error) {
            toast({
                title: "Error",
                description: "Failed to update delay",
                variant: "destructive",
            });
        } else {
            setTriggers((prev) =>
                prev.map((t) => (t.id === triggerId ? { ...t, delay_hours: delayHours } : t))
            );
        }

        setSaving(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Call Automations</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure automatic AI calls for key church moments
                    </p>
                </div>
            </div>

            <div className="grid gap-4">
                {triggers.map((trigger) => {
                    const config = TRIGGER_CONFIG[trigger.trigger_type];
                    const Icon = config.icon;
                    const suggestedScripts = scripts.filter(
                        (s) => s.template_type === config.suggestedTemplate || !s.template_type
                    );
                    const selectedScript = scripts.find((s) => s.id === trigger.script_id);

                    return (
                        <Card
                            key={trigger.id}
                            className={`transition-all ${trigger.enabled
                                    ? "border-primary/50 bg-gradient-to-r from-primary/5 to-transparent"
                                    : "opacity-75"
                                }`}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${config.color}`}>
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                {config.title}
                                                {trigger.enabled && (
                                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                                        Active
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                            <CardDescription>{config.description}</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {saving === trigger.id && (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        )}
                                        <Switch
                                            checked={trigger.enabled}
                                            onCheckedChange={(checked) => handleToggle(trigger.id, checked)}
                                            disabled={!trigger.script_id}
                                        />
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {/* Script Selection */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Script to Use</Label>
                                        <Select
                                            value={trigger.script_id || ""}
                                            onValueChange={(value) => handleScriptChange(trigger.id, value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a script..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {scripts.length === 0 ? (
                                                    <div className="p-2 text-sm text-muted-foreground">
                                                        No scripts available. Create one first.
                                                    </div>
                                                ) : (
                                                    scripts.map((script) => (
                                                        <SelectItem key={script.id} value={script.id}>
                                                            {script.name}
                                                            {script.template_type === config.suggestedTemplate && (
                                                                <span className="ml-2 text-xs text-muted-foreground">(Recommended)</span>
                                                            )}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {!trigger.script_id && (
                                            <p className="text-xs text-amber-600">
                                                ⚠️ Select a script to enable this automation
                                            </p>
                                        )}
                                    </div>

                                    {/* Delay/Timing */}
                                    {trigger.trigger_type === "first_timer" && (
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {config.delayLabel}
                                            </Label>
                                            <Select
                                                value={String(trigger.delay_hours)}
                                                onValueChange={(value) => handleDelayChange(trigger.id, parseInt(value))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="12">12 hours</SelectItem>
                                                    <SelectItem value="24">24 hours (1 day)</SelectItem>
                                                    <SelectItem value="48">48 hours (2 days)</SelectItem>
                                                    <SelectItem value="72">72 hours (3 days)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {trigger.trigger_type === "birthday" && (
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Calling Time
                                            </Label>
                                            <Select
                                                value={String(trigger.delay_hours)}
                                                onValueChange={(value) => handleDelayChange(trigger.id, parseInt(value))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="9">9:00 AM</SelectItem>
                                                    <SelectItem value="10">10:00 AM</SelectItem>
                                                    <SelectItem value="12">12:00 PM</SelectItem>
                                                    <SelectItem value="14">2:00 PM</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {trigger.trigger_type === "anniversary" && (
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">
                                                Celebrate at (months)
                                            </Label>
                                            <div className="flex flex-wrap gap-2">
                                                {[1, 3, 6, 12, 24, 36, 60].map((month) => {
                                                    const isSelected = trigger.anniversary_milestones?.includes(month);
                                                    return (
                                                        <Button
                                                            key={month}
                                                            size="sm"
                                                            variant={isSelected ? "default" : "outline"}
                                                            className="h-8 px-3"
                                                            onClick={async () => {
                                                                const newMilestones = isSelected
                                                                    ? trigger.anniversary_milestones.filter((m) => m !== month)
                                                                    : [...(trigger.anniversary_milestones || []), month].sort((a, b) => a - b);

                                                                setSaving(trigger.id);
                                                                await supabase
                                                                    .from("auto_triggers")
                                                                    .update({ anniversary_milestones: newMilestones })
                                                                    .eq("id", trigger.id);

                                                                setTriggers((prev) =>
                                                                    prev.map((t) =>
                                                                        t.id === trigger.id
                                                                            ? { ...t, anniversary_milestones: newMilestones }
                                                                            : t
                                                                    )
                                                                );
                                                                setSaving(null);
                                                            }}
                                                        >
                                                            {month < 12 ? `${month}m` : `${month / 12}y`}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="border-dashed border-muted-foreground/30 bg-muted/30">
                <CardContent className="py-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                        💡 Automations run during your configured calling window
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Set your calling hours in Settings → General → Organization Profile
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
