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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Phone, Send, Loader2, Plus, PhoneCall, Rocket, Sparkles, FileText } from 'lucide-react';
import { CampaignBuilder } from '@/components/communications/CampaignBuilder';
import { DemoDataNotice } from '@/components/demo/DemoDataNotice';
import { PhonePreview } from '@/components/communications/PhonePreview';

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
        .from('call_scripts')
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
        .from('call_scripts')
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
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              <Card className="h-full border-none shadow-sm bg-gradient-to-br from-card to-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Compose Message
                  </CardTitle>
                  <CardDescription>
                    Send text messages to groups or your entire congregation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Recipient Selection */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>To</Label>
                        <Select
                          value={smsRecipientType}
                          onValueChange={(value) => {
                            setSmsRecipientType(value as 'group' | 'all');
                            setSmsSelectedGroupId('');
                          }}
                        >
                          <SelectTrigger className="bg-background">
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
                            <SelectTrigger className="bg-background">
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
                            <p className="text-[10px] text-destructive">No groups found.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Template Chips */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Quick Templates</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Hi {Name}, just a reminder about service tomorrow!",
                        "Don't miss our event this Friday at 7pm.",
                        "Thank you for visiting us this Sunday!",
                        "How can we pray for you this week?"
                      ].map((template, i) => (
                        <button
                          key={i}
                          onClick={() => setSmsMessage(template)}
                          className="text-xs bg-muted hover:bg-primary/10 hover:text-primary transition-colors px-3 py-1.5 rounded-full border border-transparent hover:border-primary/20 text-left"
                          type="button"
                        >
                          "{template.length > 30 ? template.substring(0, 30) + '...' : template}"
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="space-y-2">
                    <Label htmlFor="smsMessage">Message Content</Label>
                    <div className="relative">
                      <Textarea
                        id="smsMessage"
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        placeholder="Type your message here..."
                        rows={8}
                        className="resize-none pr-4 pb-8 shadow-inner bg-background"
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-md">
                        {smsMessage.length}/160 ({Math.ceil(smsMessage.length / 160) || 1} SMS)
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="inline-block w-4 text-center bg-primary/10 text-primary rounded text-[10px] font-bold">{"{}"}</span>
                      Use <strong>{'{Name}'}</strong> to personalize with the member's first name.
                    </p>
                  </div>

                  {/* Send Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleSendSMS}
                      disabled={loading || !smsMessage.trim() || (smsRecipientType === 'group' && !smsSelectedGroupId)}
                      className="w-full h-12 text-base shadow-md hover:shadow-lg transition-all"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Sending Message...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5 mr-2" />
                          Send Campaign
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Preview */}
            <div className="lg:col-span-5 hidden lg:flex flex-col items-center justify-center bg-muted/30 rounded-xl p-8 border border-dashed">
              <div className="mb-6 text-center">
                <h3 className="font-semibold text-lg text-foreground">Live Preview</h3>
                <p className="text-sm text-muted-foreground">See how it looks on a device</p>
              </div>
              <PhonePreview
                message={smsMessage.replace('{Name}', 'John')}
                senderName={currentOrganization?.name || 'Church'}
              />
            </div>
          </div>
        </TabsContent>

        {/* AI Calling Tab */}
        <TabsContent value="calling">
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              <Card className="h-full border-none shadow-sm bg-gradient-to-br from-card to-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                    <Phone className="h-5 w-5 text-primary" />
                    AI Calling Campaign
                  </CardTitle>
                  <CardDescription>
                    Make automated AI-powered calls to groups with personalized scripts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Group Selection */}
                  <div className="space-y-2">
                    <Label className="font-medium">Select Group to Call</Label>
                    <Select value={callSelectedGroupId} onValueChange={setCallSelectedGroupId}>
                      <SelectTrigger className="bg-background h-11">
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
                      <p className="text-[10px] text-destructive">No groups found.</p>
                    )}
                  </div>

                  {/* Script Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="font-medium">Calling Script</Label>
                      <Dialog open={isCreateScriptOpen} onOpenChange={setIsCreateScriptOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary/80 px-2 -mr-2">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            New Script
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Create Calling Script</DialogTitle>
                            <DialogDescription>
                              Create a new script. Use {'{Name}'} as a placeholder.
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
                                placeholder="Hello {Name}..."
                                rows={8}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateScriptOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateScript} disabled={loading}>Create Script</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                      <SelectTrigger className="bg-background h-11">
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
                  </div>

                  {/* Start Calling Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleStartCalling}
                      disabled={loading || !callSelectedGroupId || !selectedScriptId}
                      className="w-full h-12 text-base shadow-md hover:shadow-lg transition-all"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Starting Calls...
                        </>
                      ) : (
                        <>
                          <PhoneCall className="h-5 w-5 mr-2" />
                          Start AI Calling Campaign
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="border-primary/20 bg-primary/5 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Best Practices
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-foreground/80 space-y-1">
                  <p>• Keep scripts conversational and warm.</p>
                  <p>• Use <strong>{'{Name}'}</strong> to personalize calls.</p>
                  <p>• Include a question to encourage engagement.</p>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Script Preview */}
            <div className="lg:col-span-5 flex flex-col h-full space-y-4">
              <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
                <div className="bg-muted/50 p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold text-sm">Script Preview</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-normal">AI Reader</Badge>
                </div>

                <ScrollArea className="flex-1 p-6 relative bg-white dark:bg-zinc-950">
                  <div className="absolute top-0 bottom-0 left-8 w-px bg-red-400/20 pointer-events-none"></div>
                  {selectedScript ? (
                    <div className="font-serif text-lg leading-relaxed text-foreground/90 pl-6">
                      <h3 className="font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                        {selectedScript.name}
                      </h3>
                      <p className="whitespace-pre-wrap">
                        {selectedScript.content.replace(/\{Name\}/g, () => (
                          `<span class="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-1 rounded">John</span>`
                        )).split(/(\{Name\})/g).map((part, i) => {
                          if (part === '{Name}') return <span key={i} className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-1 rounded border border-yellow-200 dark:border-yellow-800">John</span>;
                          return part;
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 space-y-2">
                      <FileText className="h-12 w-12 stroke-1" />
                      <p className="text-sm">Select a script to view content</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
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
