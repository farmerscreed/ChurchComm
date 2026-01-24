---
description: Create AI Script Builder with Claude-powered generation
epic: Epic 3 - Enhanced Script Management & AI Builder
task_id: 3.2
---

## Context
Create an AI assistant that helps orgs generate custom call scripts via Claude.

## Prerequisites
- Anthropic API key available
- Task 3.1a/3.1b complete

## Implementation Steps

### 1. Create generate-script edge function

Create `supabase/functions/generate-script/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { organization_id, purpose, tone, key_points, denomination_style, desired_duration } = await req.json();

    // Check rate limit (max 10 per org per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("script_generations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organization_id)
      .gte("created_at", today.toISOString());

    if ((count || 0) >= 10) {
      return new Response(JSON.stringify({ 
        error: "Daily generation limit reached (10 per day)" 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate script with Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        system: `You are an expert at creating AI phone call scripts for church communication. 
        
Your scripts should:
- Be warm, pastoral, and appropriate for church contexts
- Include variable placeholders like {first_name}, {church_name}, {pastor_name}
- Be conversational and natural for AI voice synthesis
- Include appropriate responses to common situations
- Match the specified tone and duration

Output a JSON object with:
- "name": A short title for the script
- "description": A one-sentence description
- "prompt": The full AI assistant prompt (this is what the AI voice agent will follow)`,
        messages: [{
          role: "user",
          content: `Create a call script with these requirements:

Purpose: ${purpose}
Tone: ${tone}
Key Points to Cover: ${key_points?.join(", ") || "General conversation"}
Church Style: ${denomination_style || "Non-denominational"}
Desired Duration: ${desired_duration || "medium (5 minutes)"}

Generate the script as a JSON object.`
        }],
      }),
    });

    const claudeData = await response.json();
    const content = claudeData.content[0].text;

    // Parse the JSON from Claude's response
    let scriptData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      scriptData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      scriptData = {
        name: "Generated Script",
        description: purpose,
        prompt: content,
      };
    }

    // Log generation for rate limiting
    await supabase.from("script_generations").insert({
      organization_id,
      purpose,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(scriptData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate script error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### 2. Create script_generations table for rate limiting

```sql
CREATE TABLE IF NOT EXISTS script_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  purpose TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS
ALTER TABLE script_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view" ON script_generations
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));
```

### 3. Create ScriptBuilder component

Create `src/components/communications/ScriptBuilder.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wand2, Loader2, Save, RefreshCw, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";

export function ScriptBuilder({ onSave }: { onSave?: () => void }) {
  const [purpose, setPurpose] = useState("");
  const [tone, setTone] = useState("warm");
  const [keyPoints, setKeyPoints] = useState("");
  const [duration, setDuration] = useState("medium");
  const [generating, setGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!purpose.trim()) {
      toast({ title: "Please enter a purpose", variant: "destructive" });
      return;
    }

    setGenerating(true);
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
    } else {
      setGeneratedScript(data);
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    const { error } = await supabase.from("call_scripts").insert({
      organization_id: currentOrganization?.id,
      name: generatedScript.name,
      description: generatedScript.description,
      prompt: generatedScript.prompt,
    });

    if (error) {
      toast({ title: "Failed to save script", variant: "destructive" });
    } else {
      toast({ title: "Script saved!" });
      onSave?.();
      setGeneratedScript(null);
      setPurpose("");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Script Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Purpose/Scenario</label>
            <Textarea
              placeholder="Describe what this call is for..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (2-3 min)</SelectItem>
                  <SelectItem value="medium">Medium (5 min)</SelectItem>
                  <SelectItem value="long">Long (8-10 min)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Key Points (one per line)</label>
            <Textarea
              placeholder="Ask about their experience&#10;Invite to small groups&#10;Offer prayer"
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
            />
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Generate Script
          </Button>
        </CardContent>
      </Card>

      {generatedScript && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{generatedScript.name}</span>
              <Badge>Generated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{generatedScript.description}</p>
            
            {editMode ? (
              <Textarea
                value={generatedScript.prompt}
                onChange={(e) => setGeneratedScript({ ...generatedScript, prompt: e.target.value })}
                className="min-h-[200px] font-mono text-sm"
              />
            ) : (
              <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
                {generatedScript.prompt}
              </pre>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Save Script</Button>
              <Button variant="outline" onClick={handleGenerate}><RefreshCw className="mr-2 h-4 w-4" />Regenerate</Button>
              <Button variant="outline" onClick={() => setEditMode(!editMode)}>
                <Edit className="mr-2 h-4 w-4" />{editMode ? "Preview" : "Edit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## Environment Variables
- `ANTHROPIC_API_KEY`

## Verification
1. Navigate to Settings → Calling Scripts → AI Builder tab
2. Fill in purpose and options
3. Click Generate
4. Verify script is generated
5. Save and verify it appears in My Scripts

## On Completion
Update `activity.md` and mark task 3.2 as `[x]`
