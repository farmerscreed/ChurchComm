---
description: Create Campaign Builder - type and script selection steps
epic: Epic 5 - Enhanced UI/UX
task_id: 5.2a
---

## Context
Build the first two steps of the campaign builder wizard.

## Prerequisites
- call_scripts table populated
- Campaign tables exist

## Implementation Steps

### 1. Create CampaignBuilder component

Create `src/components/communications/CampaignBuilder.tsx`:

```tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Phone, MessageSquare, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

interface CampaignBuilderProps {
  onComplete: (campaign: any) => void;
  onCancel: () => void;
}

export function CampaignBuilder({ onComplete, onCancel }: CampaignBuilderProps) {
  const [step, setStep] = useState(1);
  const [campaignType, setCampaignType] = useState<"voice" | "sms">("voice");
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [scripts, setScripts] = useState<any[]>([]);
  const { currentOrganization } = useAuthStore();

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  useEffect(() => {
    fetchScripts();
  }, [currentOrganization, campaignType]);

  const fetchScripts = async () => {
    const { data } = await supabase
      .from("call_scripts")
      .select("*")
      .eq("organization_id", currentOrganization?.id)
      .eq("is_system", false);
    setScripts(data || []);
  };

  const handleNext = () => {
    if (step === 2 && !selectedScript) {
      // Show error
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Progress value={progress} />
        <p className="text-sm text-muted-foreground mt-2">Step {step} of {totalSteps}</p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Campaign Type</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={campaignType} 
              onValueChange={(v) => setCampaignType(v as "voice" | "sms")}
              className="space-y-4"
            >
              <div className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer ${campaignType === "voice" ? "border-primary bg-primary/5" : ""}`}>
                <RadioGroupItem value="voice" id="voice" />
                <Label htmlFor="voice" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Phone className="h-6 w-6" />
                  <div>
                    <p className="font-medium">AI Voice Call</p>
                    <p className="text-sm text-muted-foreground">Automated calling campaign</p>
                  </div>
                </Label>
              </div>
              
              <div className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer ${campaignType === "sms" ? "border-primary bg-primary/5" : ""}`}>
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms" className="flex items-center gap-3 cursor-pointer flex-1">
                  <MessageSquare className="h-6 w-6" />
                  <div>
                    <p className="font-medium">SMS Campaign</p>
                    <p className="text-sm text-muted-foreground">Text message campaign</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Script</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={selectedScript || ""} 
              onValueChange={setSelectedScript}
              className="space-y-3"
            >
              {scripts.map((script) => (
                <div 
                  key={script.id}
                  className={`p-4 border rounded-lg cursor-pointer ${selectedScript === script.id ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={script.id} id={script.id} className="mt-1" />
                    <Label htmlFor={script.id} className="cursor-pointer flex-1">
                      <p className="font-medium">{script.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{script.description}</p>
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {scripts.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No scripts found. Create a script first.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Steps 3-5 will be added in tasks 5.2b and 5.2c */}

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        <Button onClick={handleNext} disabled={step === 2 && !selectedScript}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
```

### 2. Add component exports

Update component index if needed.

## Verification
1. Open Campaign Builder
2. Verify campaign type selection works
3. Verify script selection step shows org's scripts
4. Verify navigation (back/next) works

## On Completion
Update `activity.md` and mark task 5.2a as `[x]`
