import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Phone, Send, Loader2, Plus, PhoneCall, Rocket } from 'lucide-react';
import { CampaignBuilder } from '@/components/communications/CampaignBuilder';
import { DemoDataNotice } from '@/components/demo/DemoDataNotice';

interface Group {
  id: string;
  name: string;
  member_count: number;
}

interface CallingScript {
  id: string;
  name: string;
  content: string;
}

export default function Communications() {
  const navigate = useNavigate();
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [showBuilder, setShowBuilder] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [scripts, setScripts] = useState<CallingScript[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [hasDemoData, setHasDemoData] = useState(false);


  // SMS State
  const [smsMessage, setSmsMessage] = useState('');
  const [smsRecipientType, setSmsRecipientType] = useState<'group' | 'all'>('group');
  const [smsSelectedGroupId, setSmsSelectedGroupId] = useState<string>('');

  // AI Calling State
  const [callSelectedGroupId, setCallSelectedGroupId] = useState<string>('');
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [isCreateScriptOpen, setIsCreateScriptOpen] = useState(false);
  const [newScriptName, setNewScriptName] = useState('');
  const [newScriptContent, setNewScriptContent] = useState('');

  useEffect(() => {
    if (currentOrganization?.id) {
      loadGroups();
      loadScripts();
      checkDemoData();
    }
  }, [currentOrganization]);

  const checkDemoData = async () => {
    if (!currentOrganization?.id) return;
    const { count } = await supabase
      .from("people")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", currentOrganization.id)
      .eq("is_demo", true);
    setHasDemoData((count || 0) > 0);
  };

  const loadGroups = async () => {
    if (!currentOrganization?.id) return;

    setLoadingGroups(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, group_members(count)')
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      if (data) {
        setGroups(data.map(group => ({
          ...group,
          member_count: (group as any).group_members[0]?.count || 0,
        })));
      }
    } catch (error: any) {
      console.error('Error loading groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load groups. Please refresh the page.',
        variant: 'destructive'
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadScripts = async () => {
    if (!currentOrganization?.id) return;

    setLoadingScripts(true);
    try {
      const { data, error } = await supabase
        .from('calling_scripts')
        .select('id, name, content')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setScripts(data);
      }
    } catch (error: any) {
      console.error('Error loading scripts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calling scripts. Please refresh the page.',
        variant: 'destructive'
      });
    } finally {
      setLoadingScripts(false);
    }
  };

  const handleCreateScript = async () => {
    if (!newScriptName.trim() || !newScriptContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter script name and content',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calling_scripts')
        .insert({
          name: newScriptName,
          content: newScriptContent,
          organization_id: currentOrganization?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Calling script created successfully',
      });

      setScripts([data, ...scripts]);
      setSelectedScriptId(data.id);
      setNewScriptName('');
      setNewScriptContent('');
      setIsCreateScriptOpen(false);
    } catch (error: any) {
      console.error('Error creating script:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create script',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive'
      });
      return;
    }

    if (smsRecipientType === 'group' && !smsSelectedGroupId) {
      toast({
        title: 'Error',
        description: 'Please select a group',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('You must be logged in to send SMS');
      }

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          recipientType: smsRecipientType === 'all' ? 'all' : 'group',
          recipientId: smsRecipientType === 'group' ? smsSelectedGroupId : currentOrganization?.id,
          message: smsMessage,
          organizationId: currentOrganization?.id,
          createdBy: user?.id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: `SMS sent to ${data.sent || 0} people`,
      });

      setSmsMessage('');
      setSmsSelectedGroupId('');
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

  const handleStartCalling = async () => {
    if (!callSelectedGroupId) {
      toast({
        title: 'Error',
        description: 'Please select a group to call',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedScriptId) {
      toast({
        title: 'Error',
        description: 'Please select or create a calling script',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('You must be logged in to start calls');
      }

      const { data, error } = await supabase.functions.invoke('send-group-call', {
        body: {
          groupId: callSelectedGroupId,
          scriptId: selectedScriptId,
          organizationId: currentOrganization?.id,
          createdBy: user?.id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: `AI calling campaign started! ${data.scheduled || 0} calls scheduled.`,
      });

      setCallSelectedGroupId('');
    } catch (error: any) {
      console.error('Error starting calls:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start calling campaign. Please check your Vapi configuration.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedScript = scripts.find(s => s.id === selectedScriptId);

  // Show Campaign Builder if active
  if (showBuilder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">New Campaign</h1>
            <p className="text-muted-foreground mt-1">Create a new Voice or SMS campaign</p>
          </div>
        </div>
        <CampaignBuilder
          onComplete={(campaign) => {
            setShowBuilder(false);
            toast({ title: "Campaign created!", description: `ID: ${campaign.id}` });
          }}
          onCancel={() => setShowBuilder(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasDemoData && <DemoDataNotice />}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Communications</h1>
          <p className="text-muted-foreground mt-1">
            Send SMS messages and AI calls to your congregation
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)} size="lg" className="bg-primary">
          <Rocket className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="sms" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS Messages
          </TabsTrigger>
          <TabsTrigger value="calling" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            AI Calling
          </TabsTrigger>
        </TabsList>

        {/* SMS Tab */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
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
                    value={smsRecipientType}
                    onValueChange={(value) => {
                      setSmsRecipientType(value as 'group' | 'all');
                      setSmsSelectedGroupId('');
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

                {smsRecipientType === 'group' && (
                  <div className="space-y-2">
                    <Label>Select Group</Label>
                    <Select value={smsSelectedGroupId} onValueChange={setSmsSelectedGroupId}>
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
                    {groups.length === 0 && !loadingGroups && (
                      <p className="text-sm text-muted-foreground">
                        No groups available. Create a group first.
                      </p>
                    )}
                    {loadingGroups && <p className="text-sm text-muted-foreground">Loading groups...</p>}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <Label htmlFor="smsMessage">Message</Label>
                <Textarea
                  id="smsMessage"
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Type your message here... You can use {Name} to personalize messages."
                  rows={6}
                  className="resize-none"
                />
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm">
                  <p className="text-muted-foreground">
                    Characters: {smsMessage.length}/160 ({Math.ceil(smsMessage.length / 160) || 1} SMS)
                  </p>
                  <p className="text-muted-foreground">
                    Tip: Use {'{Name}'} for personalization
                  </p>
                </div>
              </div>

              {/* Preview */}
              {smsMessage && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="p-4 bg-muted rounded-lg border">
                    <p className="text-sm">
                      {smsMessage.replace('{Name}', 'John Smith')}
                    </p>
                  </div>
                </div>
              )}

              {/* Send Button */}
              <Button
                onClick={handleSendSMS}
                disabled={loading || !smsMessage.trim() || (smsRecipientType === 'group' && !smsSelectedGroupId)}
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
        </TabsContent>

        {/* AI Calling Tab */}
        <TabsContent value="calling">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                  <Phone className="h-5 w-5" />
                  AI Calling Campaign
                </CardTitle>
                <CardDescription>
                  Make automated AI-powered calls to groups with personalized scripts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Group Selection */}
                <div className="space-y-2">
                  <Label>Select Group to Call</Label>
                  <Select value={callSelectedGroupId} onValueChange={setCallSelectedGroupId}>
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
                  {groups.length === 0 && !loadingGroups && (
                    <p className="text-sm text-muted-foreground">
                      No groups available. Create a group first.
                    </p>
                  )}
                  {loadingGroups && <p className="text-sm text-muted-foreground">Loading groups...</p>}
                </div>

                {/* Script Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Calling Script</Label>
                    <Dialog open={isCreateScriptOpen} onOpenChange={setIsCreateScriptOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          New Script
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Create Calling Script</DialogTitle>
                          <DialogDescription>
                            Create a new script for your AI calling assistant. Use {'{Name}'} to personalize with the recipient's name.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="scriptName">Script Name</Label>
                            <Input
                              id="scriptName"
                              value={newScriptName}
                              onChange={(e) => setNewScriptName(e.target.value)}
                              placeholder="e.g., Sunday Service Reminder"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="scriptContent">Script Content</Label>
                            <Textarea
                              id="scriptContent"
                              value={newScriptContent}
                              onChange={(e) => setNewScriptContent(e.target.value)}
                              placeholder="Hello {Name}, this is a friendly reminder from First Community Church about our upcoming Sunday service at 10 AM. We would love to see you there! Is there anything we can pray for you about this week?"
                              rows={8}
                              className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                              Tip: Use {'{Name}'} to personalize with the recipient's first name
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreateScriptOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateScript} disabled={loading}>
                            {loading ? 'Creating...' : 'Create Script'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a calling script..." />
                    </SelectTrigger>
                    <SelectContent>
                      {scripts.map((script) => (
                        <SelectItem key={script.id} value={script.id}>
                          {script.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {scripts.length === 0 && !loadingScripts && (
                    <p className="text-sm text-muted-foreground">
                      No scripts available. Create a new script to get started.
                    </p>
                  )}
                  {loadingScripts && <p className="text-sm text-muted-foreground">Loading scripts...</p>}
                </div>

                {/* Script Preview */}
                {selectedScript && (
                  <div className="space-y-2">
                    <Label>Script Preview</Label>
                    <div className="p-4 bg-muted rounded-lg border">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedScript.content.replace(/\{Name\}/g, 'John')}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is what the AI will say (shown with sample name)
                    </p>
                  </div>
                )}

                {/* Start Calling Button */}
                <Button
                  onClick={handleStartCalling}
                  disabled={loading || !callSelectedGroupId || !selectedScriptId}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting Calls...
                    </>
                  ) : (
                    <>
                      <PhoneCall className="h-4 w-4 mr-2" />
                      Start AI Calling Campaign
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">📞 AI Calling Best Practices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Keep scripts conversational and warm - the AI will engage naturally</li>
                  <li>Use {'{Name}'} to personalize calls with each recipient's first name</li>
                  <li>Include a question to encourage engagement (e.g., "How can we pray for you?")</li>
                  <li>Calls are made sequentially with a small delay to avoid rate limiting</li>
                  <li>Check your Vapi balance before calling large groups</li>
                  <li>Call results and transcripts are saved for follow-up</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* General Tips Card */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">💡 Communication Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Always identify your church in messages and calls</li>
            <li>Be mindful of timing - avoid early mornings and late nights</li>
            <li>Provide a way for recipients to opt-out or respond</li>
            <li>Review call transcripts for pastoral care opportunities</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
