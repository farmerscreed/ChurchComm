import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  ArrowLeft,
  Plus,
  Zap,
  Users,
  UserPlus,
  UserMinus,
  Clock,
  MessageSquare,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Play,
  Pause,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Group {
  id: string;
  name: string;
}

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  status: string;
  action_type: string;
  action_config: Record<string, unknown>;
  trigger_config: Record<string, unknown>;
  target_groups: string[];
  total_executions: number;
  last_executed_at: string | null;
  created_at: string;
}

const TRIGGER_TYPES = [
  {
    value: 'birthday',
    label: 'Birthday',
    icon: Calendar,
    description: 'When a member has a birthday',
  },
  {
    value: 'group_join',
    label: 'Group Join',
    icon: UserPlus,
    description: 'When someone joins a group',
  },
  {
    value: 'group_leave',
    label: 'Group Leave',
    icon: UserMinus,
    description: 'When someone leaves a group',
  },
  {
    value: 'first_visit_followup',
    label: 'First Visit Follow-up',
    icon: Users,
    description: 'Follow up with first-time visitors',
  },
  {
    value: 'missed_attendance',
    label: 'Missed Attendance',
    icon: AlertTriangle,
    description: 'When a member misses multiple services',
  },
  {
    value: 'milestone',
    label: 'Milestone',
    icon: Award,
    description: 'Celebrate membership milestones',
  },
];

const ACTION_TYPES = [
  { value: 'send_sms', label: 'Send SMS', icon: MessageSquare },
  { value: 'send_email', label: 'Send Email', icon: Mail },
  { value: 'create_followup', label: 'Create Follow-up Task', icon: CheckCircle2 },
  { value: 'notify_staff', label: 'Notify Staff', icon: Bell },
];

export default function EventTriggers() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'group_join',
    actionType: 'send_sms',
    message: '',
    targetGroups: [] as string[],
    delayHours: '0',
    sendTime: '09:00',
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
        .order('created_at', { ascending: false });

      if (autoError && autoError.code !== 'PGRST116') {
        console.error('Error fetching automations:', autoError);
      }

      setAutomations(autoData || []);

      // Fetch groups
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('organization_id', currentOrganization.id);

      if (groupError) {
        console.error('Error fetching groups:', groupError);
      }

      setGroups(groupData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAutomation = async () => {
    if (!currentOrganization?.id || !formData.name) return;

    try {
      const actionConfig: Record<string, unknown> = {};
      const triggerConfig: Record<string, unknown> = {};

      if (formData.actionType === 'send_sms' || formData.actionType === 'send_email') {
        actionConfig.message_content = formData.message;
      }

      if (['group_join', 'group_leave'].includes(formData.triggerType)) {
        triggerConfig.delay_hours = parseInt(formData.delayHours);
        triggerConfig.group_ids = formData.targetGroups;
      }

      if (formData.triggerType === 'first_visit_followup') {
        triggerConfig.delay_days = 1;
      }

      if (formData.triggerType === 'missed_attendance') {
        triggerConfig.consecutive_weeks = 2;
      }

      triggerConfig.send_time = formData.sendTime;

      const { error } = await supabase.from('automations').insert({
        organization_id: currentOrganization.id,
        name: formData.name,
        description: formData.description || null,
        trigger_type: formData.triggerType,
        status: 'active',
        action_type: formData.actionType,
        action_config: actionConfig,
        trigger_config: triggerConfig,
        target_groups: formData.targetGroups,
      });

      if (error) throw error;

      toast({
        title: 'Automation created',
        description: 'Your automation has been created and is now active.',
      });

      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create automation.',
        variant: 'destructive',
      });
    }
  };

  const toggleAutomation = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    try {
      const { error } = await supabase
        .from('automations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );

      toast({
        title: newStatus === 'active' ? 'Automation activated' : 'Automation paused',
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update automation.',
        variant: 'destructive',
      });
    }
  };

  const deleteAutomation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAutomations((prev) => prev.filter((a) => a.id !== id));

      toast({
        title: 'Automation deleted',
        description: 'The automation has been permanently deleted.',
      });
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete automation.',
        variant: 'destructive',
      });
    }
  };

  const duplicateAutomation = async (automation: Automation) => {
    try {
      const { error } = await supabase.from('automations').insert({
        organization_id: currentOrganization?.id,
        name: `${automation.name} (Copy)`,
        description: automation.description,
        trigger_type: automation.trigger_type,
        status: 'draft',
        action_type: automation.action_type,
        action_config: automation.action_config,
        trigger_config: automation.trigger_config,
        target_groups: automation.target_groups,
      });

      if (error) throw error;

      toast({
        title: 'Automation duplicated',
        description: 'A copy of the automation has been created.',
      });

      fetchData();
    } catch (error) {
      console.error('Error duplicating automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate automation.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      triggerType: 'group_join',
      actionType: 'send_sms',
      message: '',
      targetGroups: [],
      delayHours: '0',
      sendTime: '09:00',
    });
    setEditingAutomation(null);
  };

  const getTriggerInfo = (type: string) => {
    return TRIGGER_TYPES.find((t) => t.value === type) || TRIGGER_TYPES[0];
  };

  const getActionInfo = (type: string) => {
    return ACTION_TYPES.find((a) => a.value === type) || ACTION_TYPES[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/automations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-500" />
            Event Triggers
          </h1>
          <p className="text-muted-foreground mt-1">
            Automate actions based on member events
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Trigger
        </Button>
      </div>

      {/* Trigger Types Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {TRIGGER_TYPES.map((trigger) => {
          const count = automations.filter(
            (a) => a.trigger_type === trigger.value && a.status === 'active'
          ).length;
          return (
            <Card
              key={trigger.value}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setFormData({ ...formData, triggerType: trigger.value });
                setShowCreateDialog(true);
              }}
            >
              <CardContent className="p-4 text-center">
                <trigger.icon className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p className="text-sm font-medium">{trigger.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {count} active
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Automations List */}
      <Card>
        <CardHeader>
          <CardTitle>All Event Triggers</CardTitle>
          <CardDescription>
            Manage your automated event-based actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : automations.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-1">No event triggers</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first trigger to automate member communications
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Trigger
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {automations.map((automation) => {
                const triggerInfo = getTriggerInfo(automation.trigger_type);
                const actionInfo = getActionInfo(automation.action_type);
                const TriggerIcon = triggerInfo.icon;
                const ActionIcon = actionInfo.icon;

                return (
                  <div
                    key={automation.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <TriggerIcon className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{automation.name}</h4>
                            <Badge
                              variant={automation.status === 'active' ? 'default' : 'secondary'}
                              className={automation.status === 'active' ? 'bg-emerald-500' : ''}
                            >
                              {automation.status}
                            </Badge>
                          </div>
                          {automation.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {automation.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <TriggerIcon className="h-3 w-3" />
                              {triggerInfo.label}
                            </span>
                            <span className="flex items-center gap-1">
                              <ActionIcon className="h-3 w-3" />
                              {actionInfo.label}
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {automation.total_executions} runs
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={automation.status === 'active'}
                          onCheckedChange={() =>
                            toggleAutomation(automation.id, automation.status)
                          }
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateAutomation(automation)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toggleAutomation(automation.id, automation.status)
                              }
                            >
                              {automation.status === 'active' ? (
                                <>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteAutomation(automation.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Show action preview */}
                    {automation.action_config &&
                      (automation.action_config as { message_content?: string }).message_content && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Message:</p>
                          <p className="text-sm line-clamp-2">
                            {(automation.action_config as { message_content?: string }).message_content}
                          </p>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Event Trigger</DialogTitle>
            <DialogDescription>
              Set up an automated action based on member events
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Welcome new group members"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Sends a welcome message when someone joins a group"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trigger Event</Label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, triggerType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        <div className="flex items-center gap-2">
                          <trigger.icon className="h-4 w-4" />
                          {trigger.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Action</Label>
                <Select
                  value={formData.actionType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, actionType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        <div className="flex items-center gap-2">
                          <action.icon className="h-4 w-4" />
                          {action.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Group selection for group triggers */}
            {['group_join', 'group_leave'].includes(formData.triggerType) && (
              <div className="space-y-2">
                <Label>Apply to Groups</Label>
                <Select
                  value={formData.targetGroups[0] || 'all'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      targetGroups: value === 'all' ? [] : [value],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Message content for SMS/Email actions */}
            {['send_sms', 'send_email'].includes(formData.actionType) && (
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Welcome to our group, {Name}! We're excited to have you."
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{Name}'}, {'{GroupName}'} for personalization
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {['group_join', 'group_leave'].includes(formData.triggerType) && (
                <div className="space-y-2">
                  <Label>Delay</Label>
                  <Select
                    value={formData.delayHours}
                    onValueChange={(value) =>
                      setFormData({ ...formData, delayHours: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Immediately</SelectItem>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="24">1 day</SelectItem>
                      <SelectItem value="48">2 days</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Send Time</Label>
                <Input
                  type="time"
                  value={formData.sendTime}
                  onChange={(e) =>
                    setFormData({ ...formData, sendTime: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={createAutomation} disabled={!formData.name}>
              <Zap className="h-4 w-4 mr-2" />
              Create Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
