import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  CalendarClock,
  ArrowLeft,
  Plus,
  Clock,
  Users,
  MessageSquare,
  Calendar,
  Send,
  MoreVertical,
  Edit,
  Trash2,
  Pause,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Group {
  id: string;
  name: string;
  member_count?: number;
}

interface ScheduledMessage {
  id: string;
  message_type: string;
  subject: string | null;
  content: string;
  recipient_type: string;
  recipient_ids: string[];
  scheduled_for: string;
  status: string;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export default function ScheduledMessages() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    messageType: 'sms',
    recipientType: 'all',
    groupId: '',
    content: '',
    subject: '',
    scheduledDate: '',
    scheduledTime: '09:00',
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
      // Fetch scheduled messages
      const { data: msgData, error: msgError } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('scheduled_for', { ascending: true });

      if (msgError && msgError.code !== 'PGRST116') {
        console.error('Error fetching messages:', msgError);
      }

      setMessages(msgData || []);

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

  const createScheduledMessage = async () => {
    if (!currentOrganization?.id || !formData.content || !formData.scheduledDate) return;

    const scheduledFor = new Date(
      `${formData.scheduledDate}T${formData.scheduledTime}`
    ).toISOString();

    try {
      const { error } = await supabase.from('scheduled_messages').insert({
        organization_id: currentOrganization.id,
        message_type: formData.messageType,
        subject: formData.messageType === 'email' ? formData.subject : null,
        content: formData.content,
        recipient_type: formData.recipientType,
        recipient_ids: formData.recipientType === 'group' && formData.groupId ? [formData.groupId] : [],
        scheduled_for: scheduledFor,
        status: 'scheduled',
      });

      if (error) throw error;

      toast({
        title: 'Message scheduled',
        description: 'Your message has been scheduled successfully.',
      });

      setShowCreateDialog(false);
      setFormData({
        messageType: 'sms',
        recipientType: 'all',
        groupId: '',
        content: '',
        subject: '',
        scheduledDate: '',
        scheduledTime: '09:00',
      });
      fetchData();
    } catch (error) {
      console.error('Error creating scheduled message:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule message.',
        variant: 'destructive',
      });
    }
  };

  const cancelMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'cancelled' } : m))
      );

      toast({
        title: 'Message cancelled',
        description: 'The scheduled message has been cancelled.',
      });
    } catch (error) {
      console.error('Error cancelling message:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel message.',
        variant: 'destructive',
      });
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== id));

      toast({
        title: 'Message deleted',
        description: 'The scheduled message has been deleted.',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Processing
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRecipientLabel = (message: ScheduledMessage) => {
    switch (message.recipient_type) {
      case 'all':
        return 'All Members';
      case 'group':
        const group = groups.find((g) => message.recipient_ids.includes(g.id));
        return group ? group.name : 'Selected Group';
      case 'individual':
        return `${message.recipient_ids.length} person(s)`;
      case 'tags':
        return 'By Tags';
      default:
        return message.recipient_type;
    }
  };

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diff < 0) {
      return 'Past due';
    } else if (days === 0) {
      if (hours === 0) {
        return 'Less than an hour';
      }
      return `In ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (days === 1) {
      return 'Tomorrow';
    } else {
      return `In ${days} days`;
    }
  };

  // Get min date for scheduling (today)
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const scheduledMessages = messages.filter((m) => m.status === 'scheduled');
  const completedMessages = messages.filter((m) => ['sent', 'failed', 'cancelled'].includes(m.status));

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
            <CalendarClock className="h-6 w-6 text-blue-500" />
            Scheduled Messages
          </h1>
          <p className="text-muted-foreground mt-1">
            Schedule messages to be sent at a specific time
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule Message
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{scheduledMessages.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {messages.filter((m) => m.status === 'sent').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {messages.filter((m) => m.status === 'failed').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Messages</CardTitle>
          <CardDescription>Messages scheduled to be sent</CardDescription>
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
          ) : scheduledMessages.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-1">No scheduled messages</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Schedule your first message to get started
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Message
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {message.message_type.toUpperCase()}
                          </Badge>
                          {getStatusBadge(message.status)}
                        </div>
                        <p className="text-sm line-clamp-2">{message.content}</p>
                      </div>
                    </div>
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
                        <DropdownMenuItem onClick={() => cancelMessage(message.id)}>
                          <Pause className="h-4 w-4 mr-2" />
                          Cancel
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMessage(message.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {getRecipientLabel(message)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(message.scheduled_for).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(message.scheduled_for).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      {formatScheduledTime(message.scheduled_for)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Messages */}
      {completedMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Message History</CardTitle>
            <CardDescription>Previously sent and completed messages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedMessages.slice(0, 10).map((message) => (
                <div
                  key={message.id}
                  className="p-4 border rounded-lg opacity-75"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {message.message_type.toUpperCase()}
                      </Badge>
                      {getStatusBadge(message.status)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.scheduled_for).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-1 text-muted-foreground">
                    {message.content}
                  </p>
                  {message.status === 'sent' && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Sent to {message.sent_count} recipient(s)
                      {message.failed_count > 0 && `, ${message.failed_count} failed`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule a Message</DialogTitle>
            <DialogDescription>
              Create a message to be sent at a specific time
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Message Type</Label>
                <Select
                  value={formData.messageType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, messageType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select
                  value={formData.recipientType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, recipientType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="group">Specific Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.recipientType === 'group' && (
              <div className="space-y-2">
                <Label>Select Group</Label>
                <Select
                  value={formData.groupId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, groupId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.messageType === 'email' && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="Email subject"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={4}
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Enter your message..."
              />
              <p className="text-xs text-muted-foreground">
                Use {'{Name}'} to personalize the message
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  min={getMinDate()}
                  value={formData.scheduledDate}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledTime: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={createScheduledMessage}
              disabled={!formData.content || !formData.scheduledDate}
            >
              <Send className="h-4 w-4 mr-2" />
              Schedule Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
