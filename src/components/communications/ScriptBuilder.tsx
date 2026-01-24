import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wand2, Loader2, Save, RefreshCw, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { VOICE_PRESETS, DEFAULT_VOICE } from "@/lib/voice-presets";
import { VariableReference } from "./VariableReference";

interface GeneratedScript {
  name: string;
  description: string;
  prompt: string;
}

export function ScriptBuilder({ onSave }: { onSave?: () => void }) {
  const [purpose, setPurpose] = useState("");
  const [tone, setTone] = useState("warm");
  const [keyPoints, setKeyPoints] = useState("");
  const [duration, setDuration] = useState("medium");
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE.id);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [editMode, setEditMode] = useState(false);
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!purpose.trim()) {
      toast({ title: "Please enter a purpose for the script", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-script", {
        body: {
          organization_id: currentOrganization?.id,
          purpose,
          tone,
          key_points: keyPoints.split("\n").filter(Boolean),
          desired_duration: duration,
        },
      });

      if (error) {
        toast({ title: "Generation failed", description: error.message, variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Generation failed", description: data.error, variant: "destructive" });
      } else {
        setGeneratedScript(data);
        setEditMode(false);
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!generatedScript || !currentOrganization?.id) return;

    setSaving(true);
    const voice = VOICE_PRESETS.find(v => v.id === voiceId);

    const { error } = await supabase.from("call_scripts").insert({
      organization_id: currentOrganization.id,
      name: generatedScript.name,
      description: generatedScript.description,
      content: generatedScript.prompt,
      voice_id: voiceId,
      voice_name: voice?.name || "Paula",
    });

    if (error) {
      toast({ title: "Failed to save script", variant: "destructive" });
    } else {
      toast({ title: "Script saved successfully" });
      onSave?.();
      setGeneratedScript(null);
      setPurpose("");
      setKeyPoints("");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wand2 className="h-5 w-5" />
                AI Script Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Purpose/Scenario</label>
                <Textarea
                  placeholder="Describe what this call is for (e.g., 'Follow up with visitors who attended our Easter service')"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="pastoral">Pastoral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Duration</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (2-3 min)</SelectItem>
                      <SelectItem value="medium">Medium (5 min)</SelectItem>
                      <SelectItem value="long">Long (8-10 min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Voice</label>
                  <Select value={voiceId} onValueChange={setVoiceId}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VOICE_PRESETS.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name} - {voice.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Key Points (one per line)</label>
                <Textarea
                  placeholder={"Ask about their experience\nInvite to small groups\nOffer prayer"}
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>

              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {generating ? "Generating..." : "Generate Script"}
              </Button>
            </CardContent>
          </Card>

          {generatedScript && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{generatedScript.name}</CardTitle>
                  <Badge variant="secondary">AI Generated</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{generatedScript.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <Textarea
                    value={generatedScript.prompt}
                    onChange={(e) => setGeneratedScript({ ...generatedScript, prompt: e.target.value })}
                    className="min-h-[200px] font-mono text-sm"
                  />
                ) : (
                  <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {generatedScript.prompt}
                  </pre>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Script
                  </Button>
                  <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(!editMode)}>
                    <Edit className="mr-2 h-4 w-4" />
                    {editMode ? "Preview" : "Edit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <VariableReference />
        </div>
      </div>
    </div>
  );
}
