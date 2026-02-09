import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Church, Clock, Users, FileText, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";

interface AIKnowledgeData {
    pastor_name: string;
    service_times: string;
    ministry_list: string;
    ai_context_notes: string;
}

export function AIKnowledgeSettings() {
    const { currentOrganization, setCurrentOrganization } = useAuthStore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<AIKnowledgeData>({
        pastor_name: "",
        service_times: "",
        ministry_list: "",
        ai_context_notes: "",
    });

    useEffect(() => {
        if (currentOrganization?.id) {
            loadData();
        }
    }, [currentOrganization?.id]);

    const loadData = async () => {
        if (!currentOrganization?.id) return;
        setLoading(true);

        const { data: orgData, error } = await supabase
            .from("organizations")
            .select("pastor_name, service_times, ministry_list, ai_context_notes")
            .eq("id", currentOrganization.id)
            .single();

        if (!error && orgData) {
            setData({
                pastor_name: orgData.pastor_name || "",
                service_times: orgData.service_times || "",
                ministry_list: orgData.ministry_list || "",
                ai_context_notes: orgData.ai_context_notes || "",
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!currentOrganization?.id) return;
        setSaving(true);

        const { data: updatedOrg, error } = await supabase
            .from("organizations")
            .update({
                pastor_name: data.pastor_name || null,
                service_times: data.service_times || null,
                ministry_list: data.ministry_list || null,
                ai_context_notes: data.ai_context_notes || null,
            })
            .eq("id", currentOrganization.id)
            .select()
            .single();

        if (error) {
            toast({
                title: "Error saving",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({ title: "AI Knowledge saved successfully!" });
            // Update global state so changes reflect immediately
            if (updatedOrg) {
                setCurrentOrganization({ ...currentOrganization, ...updatedOrg });
            }
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                    <Church className="h-5 w-5" />
                    AI Knowledge Base
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Provide information about your church so the AI can speak knowledgeably during calls.
                </p>
            </div>

            <div className="grid gap-4">
                <div className="space-y-2">
                    <Label htmlFor="pastor_name" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Pastor Name
                    </Label>
                    <Input
                        id="pastor_name"
                        placeholder="e.g., Pastor John Smith"
                        value={data.pastor_name}
                        onChange={(e) => setData({ ...data, pastor_name: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                        The AI will mention the pastor by name when appropriate.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="service_times" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Service Times
                    </Label>
                    <Input
                        id="service_times"
                        placeholder="e.g., Sundays at 9am and 11am, Wednesdays at 7pm"
                        value={data.service_times}
                        onChange={(e) => setData({ ...data, service_times: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                        The AI can share service times when inviting people to church.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="ministry_list" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Ministries
                    </Label>
                    <Input
                        id="ministry_list"
                        placeholder="e.g., Youth, Women's Ministry, Men's Fellowship, Choir, Children's Church"
                        value={data.ministry_list}
                        onChange={(e) => setData({ ...data, ministry_list: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                        Comma-separated list of ministries the AI can recommend.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="ai_context_notes" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Additional Notes
                    </Label>
                    <Textarea
                        id="ai_context_notes"
                        placeholder="Any other information the AI should know (church mission, special programs, location details, etc.)"
                        value={data.ai_context_notes}
                        onChange={(e) => setData({ ...data, ai_context_notes: e.target.value })}
                        rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                        Free-form notes for the AI to reference when speaking with members.
                    </p>
                </div>
            </div>

            <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="h-4 w-4 mr-2" />
                        Save AI Knowledge
                    </>
                )}
            </Button>
        </div>
    );
}
