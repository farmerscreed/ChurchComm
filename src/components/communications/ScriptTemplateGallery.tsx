import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";

interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  content: string;
}

const TEMPLATE_TYPE_COLORS: Record<string, string> = {
  first_timer_followup: "bg-green-100 text-green-800",
  birthday_greeting: "bg-pink-100 text-pink-800",
  member_checkin: "bg-blue-100 text-blue-800",
  anniversary_celebration: "bg-purple-100 text-purple-800",
  event_invitation: "bg-orange-100 text-orange-800",
  prayer_followup: "bg-indigo-100 text-indigo-800",
};

export function ScriptTemplateGallery({ onClone }: { onClone?: () => void }) {
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState<string | null>(null);
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("call_scripts")
      .select("id, name, description, template_type, content")
      .eq("is_template", true)
      .eq("is_system", true)
      .order("name");

    if (!error && data) {
      setTemplates(data as ScriptTemplate[]);
    }
    setLoading(false);
  };

  const handleClone = async (template: ScriptTemplate) => {
    if (!currentOrganization?.id) return;

    setCloning(template.id);
    const { error } = await supabase
      .from("call_scripts")
      .insert({
        organization_id: currentOrganization.id,
        name: `${template.name} (Copy)`,
        description: template.description,
        content: template.content,
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
    setCloning(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No templates available.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{template.name}</CardTitle>
              <Badge variant="secondary" className={TEMPLATE_TYPE_COLORS[template.template_type] || "bg-gray-100 text-gray-800"}>
                {template.template_type?.replace(/_/g, " ")}
              </Badge>
            </div>
            <CardDescription className="text-sm">{template.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end pt-0">
            <Button
              onClick={() => handleClone(template)}
              disabled={cloning === template.id}
              className="w-full"
              size="sm"
            >
              {cloning === template.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Use Template
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
