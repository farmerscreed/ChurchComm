import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  member_count: number;
}

export default function Communications() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState<'group' | 'all'>('group');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  useEffect(() => {
    loadGroups();
  }, [currentOrganization]);

  const loadGroups = async () => {
    if (!currentOrganization?.id) return;

    const { data, error } = await supabase
      .from('groups')
      .select('id, name, group_members(count)')
      .eq('organization_id', currentOrganization.id);

    if (!error && data) {
      setGroups(data.map(group => ({
        ...group,
        member_count: (group as any).group_members[0]?.count || 0,
      })));
    }
  };

  const handleSendSMS = async () => {
    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive'
      });
      return;
    }

    if (recipientType === 'group' && !selectedGroupId) {
      toast({
        title: 'Error',
        description: 'Please select a group',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          groupId: recipientType === 'group' ? selectedGroupId : null,
          message: message
        }
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: `SMS sent to ${data.results?.length || 0} people`,
      });

      // Reset form
      setMessage('');
      setSelectedGroupId('');
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send SMS. Please check your Twilio configuration.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Communications</h1>
        <p className="text-muted-foreground mt-1">
          Send SMS messages to your congregation
        </p>
      </div>

      {/* Main SMS Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send SMS Message
          </CardTitle>
          <CardDescription>
            Send text messages to groups or your entire congregation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipient Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Send To</Label>
              <Select
                value={recipientType}
                onValueChange={(value) => {
                  setRecipientType(value as 'group' | 'all');
                  setSelectedGroupId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Specific Group</SelectItem>
                  <SelectItem value="all">All Members</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === 'group' && (
              <div className="space-y-2">
                <Label>Select Group</Label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({group.member_count} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {groups.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No groups available. Create a group first.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here... You can use {Name} to personalize messages."
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-between items-center text-sm">
              <p className="text-muted-foreground">
                Characters: {message.length}/160 ({Math.ceil(message.length / 160)} SMS)
              </p>
              <p className="text-muted-foreground">
                Tip: Use {'{Name}'} for personalization
              </p>
            </div>
          </div>

          {/* Preview */}
          {message && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-4 bg-muted rounded-lg border">
                <p className="text-sm">
                  {message.replace('{Name}', 'John Smith')}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                This is how your message will look (shown with sample name)
              </p>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSendSMS}
            disabled={loading || !message.trim() || (recipientType === 'group' && !selectedGroupId)}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send SMS
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">📱 SMS Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Keep messages concise and clear (under 160 characters is best)</li>
            <li>Use {'{Name}'} to personalize messages with each recipient's first name</li>
            <li>Always identify your church in the message</li>
            <li>Include a way to opt-out or reply for questions</li>
            <li>Check your Twilio balance before sending to large groups</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
