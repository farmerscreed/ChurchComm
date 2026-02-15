import { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';
// Card components removed - using gradient divs
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
  CheckCircle2,
  Play,
  Clock,
  Phone,
  Loader2,
  XCircle,
  AlertCircle
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
      case 'group_leave': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Zap className="h-5 w-5 text-amber-500" />;
    }
  };

  const activeCount = automations.filter(a => a.status === 'active').length;
  const pausedCount = automations.filter(a => a.status === 'paused').length;
  const smsCount = automations.filter(a => a.action_type === 'send_sms').length;
  const callCount = automations.filter(a => a.action_type === 'make_call').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/automations" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Automations
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Zap className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Event Triggers
            </span>
          </h1>
          <p className="text-slate-400 mt-1">
            Automatically respond when members join groups, visit for the first time, and more.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white border-0">
            <Plus className="h-4 w-4 mr-2" />
            Create Trigger
          </Button>
        </div>
      </div>

      {/* Stats Cards - Gradient Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            title: "Total Triggers",
            value: automations.length,
            icon: Zap,
            color: "text-amber-400",
            bgColor: "bg-amber-500/20",
            cardBg: "from-amber-500/10 to-amber-500/5",
            borderColor: "border-amber-500/20"
          },
          {
            title: "Active",
            value: activeCount,
            icon: Play,
            color: "text-emerald-400",
            bgColor: "bg-emerald-500/20",
            cardBg: "from-emerald-500/10 to-emerald-500/5",
            borderColor: "border-emerald-500/20"
          },
          {
            title: "SMS Actions",
            value: smsCount,
            icon: MessageSquare,
            color: "text-blue-400",
            bgColor: "bg-blue-500/20",
            cardBg: "from-blue-500/10 to-blue-500/5",
            borderColor: "border-blue-500/20"
          },
          {
            title: "AI Call Actions",
            value: callCount,
            icon: Phone,
            color: "text-purple-400",
            bgColor: "bg-purple-500/20",
            cardBg: "from-purple-500/10 to-purple-500/5",
            borderColor: "border-purple-500/20"
          }
        ].map((stat, idx) => (
          <div key={idx} className={cn("p-5 rounded-xl bg-gradient-to-br border", stat.cardBg, stat.borderColor)}>
            <div className="flex items-center justify-between mb-4">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <p className="text-sm font-medium text-slate-400">{stat.title}</p>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : automations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
          <div className="h-16 w-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
            <Zap className="h-8 w-8 text-amber-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No active triggers</h3>
          <p className="text-slate-400 max-w-sm mb-6">
            Create your first automation to start engaging with your members automatically.
          </p>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white border-0">
            <Plus className="h-4 w-4 mr-2" />
            Create Trigger
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {automations.map((automation) => {
            const triggerColors = automation.trigger_type === 'group_join'
              ? { bg: 'bg-blue-500/20', text: 'text-blue-400', gradient: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20 hover:border-blue-500/30' }
              : automation.trigger_type === 'first_visit'
              ? { bg: 'bg-emerald-500/20', text: 'text-emerald-400', gradient: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20 hover:border-emerald-500/30' }
              : { bg: 'bg-amber-500/20', text: 'text-amber-400', gradient: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20 hover:border-amber-500/30' };

            return (
              <div key={automation.id} className={cn("group rounded-xl bg-gradient-to-br border transition-all hover:scale-[1.02] flex flex-col", triggerColors.gradient, triggerColors.border)}>
                <div className="p-6 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", triggerColors.bg)}>
                        {getTriggerIcon(automation.trigger_type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{automation.name}</h3>
                        <p className="text-sm text-slate-400 capitalize">
                          {automation.trigger_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white hover:bg-white/10">
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
                </div>
                <div className="px-6 pb-3 flex-1">
                  <div className="bg-white/5 min-h-[4.5rem] p-3 rounded-lg text-sm text-slate-400 italic mb-4 line-clamp-3 border border-white/5">
                    "{automation.action_config?.message_content}"
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5" title="Execution Delay">
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
                </div>
                <div className="px-6 py-4 mt-auto border-t border-white/10 flex items-center justify-between">
                  <Badge variant="outline" className={cn(
                    "border-white/10",
                    automation.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400'
                  )}>
                    {automation.status === 'active' ? 'Active' : 'Paused'}
                  </Badge>
                  <Switch
                    checked={automation.status === 'active'}
                    onCheckedChange={() => toggleStatus(automation.id, automation.status)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0">
          <div className="p-6 bg-muted/30 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                {editingId ? 'Edit Automation' : 'Create Automation'}
              </DialogTitle>
              <DialogDescription>
                Configure the trigger event and the automated response.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 p-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Automation Name</Label>
              <Input
                placeholder="e.g., Welcome New Members"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-4">
              <Label className="text-base font-medium">When should this happen?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    id: 'group_join', label: 'Joins Group', icon: Users,
                    activeBorder: 'border-blue-500', activeBg: 'bg-blue-50 dark:bg-blue-900/10',
                    activeIcon: 'bg-blue-500 text-white', activeText: 'text-blue-600 dark:text-blue-400',
                  },
                  {
                    id: 'first_visit', label: 'First Visit', icon: CheckCircle2,
                    activeBorder: 'border-emerald-500', activeBg: 'bg-emerald-50 dark:bg-emerald-900/10',
                    activeIcon: 'bg-emerald-500 text-white', activeText: 'text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    id: 'group_leave', label: 'Leaves Group', icon: XCircle,
                    activeBorder: 'border-red-500', activeBg: 'bg-red-50 dark:bg-red-900/10',
                    activeIcon: 'bg-red-500 text-white', activeText: 'text-red-600 dark:text-red-400',
                  }
                ].map((trigger) => (
                  <div
                    key={trigger.id}
                    onClick={() => setFormData(prev => ({ ...prev, triggerType: trigger.id }))}
                    className={cn(
                      'cursor-pointer relative overflow-hidden rounded-xl border-2 p-3 transition-all duration-200 hover:shadow-md flex flex-col items-center justify-center gap-3 h-28',
                      formData.triggerType === trigger.id
                        ? `${trigger.activeBorder} ${trigger.activeBg}`
                        : 'border-muted hover:border-muted-foreground/50'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-full',
                      formData.triggerType === trigger.id
                        ? trigger.activeIcon
                        : 'bg-muted text-muted-foreground'
                    )}>
                      <trigger.icon className="h-5 w-5" />
                    </div>
                    <span className={cn(
                      'text-sm font-semibold',
                      formData.triggerType === trigger.id
                        ? trigger.activeText
                        : 'text-muted-foreground'
                    )}>
                      {trigger.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="send_sms">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-green-500" />
                        <span>Send SMS</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="make_call">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-500" />
                        <span>Make AI Call</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Delay (Hours)</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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
                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setFormData(prev => ({ ...prev, message: prev.message + ' {Name}' }))}>+ Name</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setFormData(prev => ({ ...prev, message: prev.message + ' {Group}' }))}>+ Group</Badge>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/30 border-t">
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
