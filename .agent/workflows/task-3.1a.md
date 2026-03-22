---
description: Add template fields to call_scripts and create template gallery UI
epic: Epic 3 - Enhanced Script Management & AI Builder
task_id: 3.1a
---

## Context
Create the infrastructure for script templates and a gallery UI to browse/clone them.

## Prerequisites
- Epic 1 complete (script templates already seeded)

## Implementation Steps

### 1. Create migration for template fields

If not already added in Epic 1:
```sql
ALTER TABLE call_scripts 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS template_type VARCHAR,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
```

### 2. Update seed scripts to be templates

```sql
UPDATE call_scripts 
SET is_template = true, is_system = true, template_type = 'first_timer_followup'
WHERE name = 'First Timer Follow-up';

UPDATE call_scripts 
SET is_template = true, is_system = true, template_type = 'birthday_greeting'
WHERE name = 'Birthday Greeting';

-- Repeat for all 6 templates
```

### 3. Create ScriptTemplateGallery component

Create `src/components/communications/ScriptTemplateGallery.tsx`:

```tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";

interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  prompt: string;
}

export function ScriptTemplateGallery({ onClone }: { onClone?: () => void }) {
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("call_scripts")
      .select("*")
      .eq("is_template", true)
      .eq("is_system", true);

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleClone = async (template: ScriptTemplate) => {
    const { error } = await supabase
      .from("call_scripts")
      .insert({
        organization_id: currentOrganization?.id,
        name: `${template.name} (Copy)`,
        description: template.description,
        prompt: template.prompt,
        is_template: false,
        is_system: false,
        template_type: template.template_type,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to clone template",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Template Cloned",
        description: `"${template.name}" has been added to your scripts`,
      });
      onClone?.();
    }
  };

  const getTemplateTypeBadgeColor = (type: string) => {
    switch (type) {
      case "first_timer_followup": return "bg-green-500";
      case "birthday_greeting": return "bg-pink-500";
      case "member_checkin": return "bg-blue-500";
      case "anniversary_celebration": return "bg-purple-500";
      case "event_invitation": return "bg-orange-500";
      case "prayer_followup": return "bg-indigo-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) return <div>Loading templates...</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <Badge className={getTemplateTypeBadgeColor(template.template_type)}>
                {template.template_type?.replace(/_/g, " ")}
              </Badge>
            </div>
            <CardDescription>{template.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end">
            <Button onClick={() => handleClone(template)} className="w-full">
              <Copy className="mr-2 h-4 w-4" />
              Use Template
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## Verification
1. Navigate to Settings → Calling Scripts
2. See template gallery (to be integrated in 3.1b)
3. Verify templates are read-only and can be cloned

## On Completion
Update `activity.md` and mark task 3.1a as `[x]` in `implementation-order.md`
