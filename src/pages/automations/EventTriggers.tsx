import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Zap,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Users,
  MessageSquare,
  Bell,
  CheckCircle2,
  AlertCircle,
  Play,
  PauseCircle,
  Clock,
  Settings2,
  Phone,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  status: string;
  action_type: string;
  action_config: any;
  trigger_config: any;
  created_at: string;
}

export default function EventTriggers() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    triggerType: 'group_join',
    actionType: 'send_sms',
    message: '',
    delayHours: 0,
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchData();
    }
  }, [currentOrganization?.id]);

  const fetchData = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      // Fetch automations (excluding birthday - those have their own page)
      const { data: autoData, error: autoError } = await supabase
        .from('automations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .neq('trigger_type', 'birthday')
        .order('created_at', { ascending: false });

      if (autoError && autoError.code !== 'PGRST116' && autoError.code !== 'PGRST205') {
        console.error('Error fetching automations:', autoError);
      }

      setAutomations(autoData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentOrganization?.id) return;
    if (!formData.name || !formData.message) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const automationData = {
        organization_id: currentOrganization.id,
        name: formData.name,
        trigger_type: formData.triggerType,
        action_type: formData.actionType,
        status: 'active',
        action_config: { message_content: formData.message },
        trigger_config: { delay_hours: formData.delayHours },
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('automations')
          .update(automationData)
          .eq('id', editingId);

        if (error) throw error;

        setAutomations(prev => prev.map(a => a.id === editingId ? { ...a, ...automationData } : a));
        toast({ title: 'Automation updated' });
      } else {
        // Create
        const { data, error } = await supabase
          .from('automations')
          .insert(automationData)
          .select()
          .single();

        if (error) throw error;

        if (data) setAutomations(prev => [data, ...prev]);
        toast({ title: 'Automation created' });
      }

      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving automation:', error);
      toast({ title: 'Error', description: 'Failed to save automation', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAutomations(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Automation deleted' });
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast({ title: 'Error', description: 'Failed to delete automation', variant: 'destructive' });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase
        .from('automations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setAutomations(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      toast({ title: `Automation ${newStatus}` });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      triggerType: 'group_join',
      actionType: 'send_sms',
      message: '',
      delayHours: 0,
    });
    setEditingId(null);
  };

  const openEdit = (automation: Automation) => {
    setFormData({
      name: automation.name,
      triggerType: automation.trigger_type,
      actionType: automation.action_type,
      message: automation.action_config?.message_content || '',
      delayHours: automation.trigger_config?.delay_hours || 0,
    });
    setEditingId(automation.id);
    setShowDialog(true);
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'group_join': return <Users className="h-5 w-5 text-blue-500" />;
      case 'first_visit': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      default: return <Zap className="h-5 w-5 text-amber-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-white/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 px-0 hover:px-2 transition-all -ml-2">
              <Link to="/automations">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Automations
              </Link>
            </Button>
            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <Zap className="h-10 w-10 text-amber-100" />
              Event Triggers
            </h1>
            <p className="text-lg text-amber-50 max-w-xl">
              Set it and forget it. Automatically respond when members join groups, visit for the first time, and more.
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-white text-orange-600 hover:bg-orange-50 shadow-lg border-0 font-semibold"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Trigger
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : automations.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="h-20 w-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No active triggers</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
            Create your first automation to start engaging with your members automatically.
          </p>
          <Button
            size="lg"
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Trigger
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {automations.map((automation) => (
            <Card key={automation.id} className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-amber-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      {getTriggerIcon(automation.trigger_type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{automation.name}</CardTitle>
                      <CardDescription>
                        {automation.trigger_type.replace(/_/g, ' ')}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(automation)}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(automation.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md border text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-3 italic">
                  "{automation.action_config?.message_content}"
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {automation.trigger_config?.delay_hours > 0
                      ? `Wait ${automation.trigger_config.delay_hours}h`
                      : 'Instant'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {automation.action_type === 'send_sms' ? <MessageSquare className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                    {automation.action_type === 'send_sms' ? 'SMS' : 'Call'}
                  </div>
                </div>
              </CardContent>
              <div className="p-4 pt-0 mt-auto border-t bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <Badge variant={automation.status === 'active' ? 'default' : 'secondary'} className={automation.status === 'active' ? 'bg-emerald-500' : ''}>
                  {automation.status === 'active' ? 'Active' : 'Paused'}
                </Badge>
                <Switch
                  checked={automation.status === 'active'}
                  onCheckedChange={() => toggleStatus(automation.id, automation.status)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Automation' : 'Create Automation'}</DialogTitle>
            <DialogDescription>
              Configure the trigger event and the action to take.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Automation Name</Label>
              <Input
                placeholder="e.g., Welcome New Members"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trigger Event</Label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, triggerType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group_join">Member Joins Group</SelectItem>
                    <SelectItem value="first_visit">First Visit</SelectItem>
                    <SelectItem value="group_leave">Member Leaves Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <Select
                  value={formData.actionType}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, actionType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_sms">Send SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delay (Hours)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  min="0"
                  value={formData.delayHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, delayHours: parseInt(e.target.value) || 0 }))}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">0 = Send immediately</p>
            </div>

            <div className="space-y-2">
              <Label>Message Content</Label>
              <Textarea
                placeholder="Welcome to the group! We're glad to have you."
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="h-32"
              />
              <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, message: prev.message + ' {Name}' }))}>+ Name</Badge>
                <Badge variant="outline" className="cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, message: prev.message + ' {Group}' }))}>+ Group</Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
