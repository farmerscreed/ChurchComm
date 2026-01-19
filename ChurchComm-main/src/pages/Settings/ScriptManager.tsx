import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, PlusCircle, Loader2, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';

interface Script {
  id: string;
  name: string;
  description: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function ScriptManager() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [scriptName, setScriptName] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [scriptContent, setScriptContent] = useState('');

  const loadScripts = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('call_scripts')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setScripts(data);
    } catch {
      toast({ title: "Error", description: "Could not load scripts.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScripts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id]);

  const handleOpenDialog = (script: Script | null = null) => {
    setEditingScript(script);
    setScriptName(script?.name || '');
    setScriptDescription(script?.description || '');
    setScriptContent(script?.content || '');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingScript(null);
    setScriptName('');
    setScriptDescription('');
    setScriptContent('');
  };

  const handleSaveScript = async () => {
    if (!scriptName.trim() || !scriptContent.trim() || !currentOrganization) {
      toast({ title: "Error", description: "Script name and content are required.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const scriptData = {
        organization_id: currentOrganization.id,
        name: scriptName,
        description: scriptDescription,
        content: scriptContent,
        updated_at: new Date().toISOString(),
      };

      if (editingScript) {
        // Update existing script
        const { error } = await supabase.from('call_scripts').update(scriptData).eq('id', editingScript.id);
        if (error) throw error;
        toast({ title: "Success", description: "Script updated successfully." });
      } else {
        // Create new script
        const { error } = await supabase.from('call_scripts').insert(scriptData);
        if (error) throw error;
        toast({ title: "Success", description: "Script created successfully." });
      }
      
      handleCloseDialog();
      loadScripts();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save script.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteScript = async (scriptId: string) => {
      if (!confirm('Are you sure you want to delete this script? This action cannot be undone.')) return;
      
      setLoading(true);
      try {
          const { error } = await supabase.from('call_scripts').delete().eq('id', scriptId);
          if (error) throw error;
          toast({ title: "Success", description: "Script deleted successfully." });
          loadScripts();
      } catch (error) {
          toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete script.", variant: "destructive" });
      } finally {
          setLoading(false);
      }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Calling Script Management
          </CardTitle>
          <CardDescription>
            Create and manage reusable scripts for your AI calling campaigns.
          </CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Script
        </Button>
      </CardHeader>
      <CardContent>
        {loading && scripts.length === 0 ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-semibold">No scripts yet.</p>
            <p className="text-muted-foreground mt-1">Click "New Script" to create your first one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scripts.map(script => (
              <div key={script.id} className="p-4 border rounded-lg flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{script.name}</h3>
                  <p className="text-sm text-muted-foreground">{script.description || 'No description'}</p>
                  <p className="text-xs text-muted-foreground mt-2">Last updated: {format(new Date(script.updated_at), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(script)}>
                      <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteScript(script.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingScript ? 'Edit Script' : 'Create New Script'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="script-name">Script Name</Label>
              <Input id="script-name" value={scriptName} onChange={(e) => setScriptName(e.target.value)} placeholder="e.g., First-Timer Welcome Call" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="script-description">Description (Optional)</Label>
              <Input id="script-description" value={scriptDescription} onChange={(e) => setScriptDescription(e.target.value)} placeholder="A short description of this script's purpose." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="script-content">Script Content (Conversation Guide)</Label>
              <Textarea
                id="script-content"
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                placeholder={`Goals: Welcome them as a new member and make them feel valued.

Topics to cover:
- Congratulate them on joining
- Ask how they're settling in
- Mention ways to connect (small groups, serving teams, classes)
- Offer to have someone reach out to help them

Tone: Warm, friendly, conversational

Escalation triggers:
- Wants to serve or join a group → Medium priority
- Has questions about beliefs → Medium priority
- Expresses any concerns → High priority`}
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                Write this as a <strong>conversation guide</strong>, not a script to be read word-for-word. Include goals, topics to cover, and the desired tone. The AI will use this as guidance to have a natural conversation. You can use {"{{person.first_name}}"} for the person's name.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSaveScript} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Script'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
