import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Loader2, Volume2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { VOICE_PRESETS, DEFAULT_VOICE } from "@/lib/voice-presets";

interface CallScript {
  id: string;
  name: string;
  description: string | null;
  content: string;
  voice_id: string | null;
  voice_name: string | null;
  template_type: string | null;
  is_template: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export function ScriptList({ onRefresh }: { onRefresh?: () => void }) {
  const [scripts, setScripts] = useState<CallScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingScript, setEditingScript] = useState<CallScript | null>(null);
  const [saving, setSaving] = useState(false);
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchScripts();
  }, [currentOrganization?.id]);

  const fetchScripts = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("call_scripts")
      .select("*")
      .eq("organization_id", currentOrganization.id)
      .eq("is_system", false)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setScripts(data as CallScript[]);
    }
    setLoading(false);
  };

  const handleDelete = async (scriptId: string) => {
    if (!confirm("Are you sure you want to delete this script?")) return;

    setDeleting(scriptId);
    const { error } = await supabase
      .from("call_scripts")
      .delete()
      .eq("id", scriptId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete script",
        variant: "destructive",
      });
    } else {
      toast({ title: "Script deleted" });
      fetchScripts();
      onRefresh?.();
    }
    setDeleting(null);
  };

  const handleSaveEdit = async () => {
    if (!editingScript) return;

    setSaving(true);
    const voice = VOICE_PRESETS.find(v => v.id === editingScript.voice_id);

    const { error } = await supabase
      .from("call_scripts")
      .update({
        name: editingScript.name,
        description: editingScript.description,
        content: editingScript.content,
        voice_id: editingScript.voice_id,
        voice_name: voice?.name || editingScript.voice_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingScript.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update script",
        variant: "destructive",
      });
    } else {
      toast({ title: "Script updated" });
      setEditingScript(null);
      fetchScripts();
      onRefresh?.();
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

  if (scripts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No custom scripts yet.</p>
        <p className="text-sm mt-1">Use the AI Script Builder or clone a template to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {scripts.map((script) => (
          <Card key={script.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{script.name}</CardTitle>
                  <CardDescription className="text-sm mt-1 line-clamp-2">
                    {script.description || "No description"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {script.voice_name && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Volume2 className="h-3 w-3" />
                      {script.voice_name}
                    </Badge>
                  )}
                  {script.template_type && (
                    <Badge variant="secondary">
                      {script.template_type.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                Updated {new Date(script.updated_at).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingScript(script)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(script.id)}
                  disabled={deleting === script.id}
                >
                  {deleting === script.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingScript} onOpenChange={(open) => !open && setEditingScript(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Script</DialogTitle>
            <DialogDescription>
              Modify your script content and settings.
            </DialogDescription>
          </DialogHeader>
          {editingScript && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingScript.name}
                  onChange={(e) => setEditingScript({ ...editingScript, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editingScript.description || ""}
                  onChange={(e) => setEditingScript({ ...editingScript, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-voice">Voice</Label>
                <Select
                  value={editingScript.voice_id || DEFAULT_VOICE.id}
                  onValueChange={(value) => setEditingScript({ ...editingScript, voice_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_PRESETS.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name} - {voice.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Script Content</Label>
                <Textarea
                  id="edit-content"
                  value={editingScript.content}
                  onChange={(e) => setEditingScript({ ...editingScript, content: e.target.value })}
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use variables like {"{first_name}"}, {"{church_name}"}, {"{pastor_name}"} for personalization.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingScript(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
