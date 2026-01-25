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
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Phone, Send, Loader2, Plus, PhoneCall, Rocket, Sparkles, FileText, Volume2, Zap } from 'lucide-react';
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

interface Campaign {
  id: string;
  name: string;
  type: 'voice' | 'sms';
  status: string;
  total_recipients: number;
  completed_count: number;
  created_at: string;
}

export default function Communications() {
  const navigate = useNavigate();
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [showBuilder, setShowBuilder] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [scripts, setScripts] = useState<CallingScript[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
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
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadGroups();
      loadScripts();
      loadCampaigns();
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

  const loadCampaigns = async () => {
    if (!currentOrganization?.id) return;

    setLoadingCampaigns(true);
    try {
      const { data, error } = await supabase
        .from('calling_campaigns')
        .select(`
          id,
          name,
          campaign_type,
          status,
          total_recipients,
          created_at,
          call_attempts(count)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (data) {
        const formattedCampaigns = data.map((campaign: any) => ({
          id: campaign.id,
          name: campaign.name,
          type: (campaign.campaign_type === 'voice' ? 'voice' : 'sms') as 'voice' | 'sms',
          status: campaign.status,
          total_recipients: campaign.total_recipients || 0,
          completed_count: campaign.call_attempts?.[0]?.count || 0,
          created_at: campaign.created_at
        }));
        setCampaigns(formattedCampaigns);
      }
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      // Don't show toast for campaigns - it's not critical
    } finally {
      setLoadingCampaigns(false);
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
    <div className="space-y-8">
      {hasDemoData && <DemoDataNotice />}

      {/* Header with gradient text */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Communications
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Send SMS messages and AI calls to your congregation
          </p>
        </div>
        <Button
          onClick={() => setShowBuilder(true)}
          size="lg"
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg"
        >
          <Rocket className="h-5 w-5 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Modern Tab Navigation */}
      <Tabs defaultValue="sms" className="space-y-8">
        <div className="flex justify-center">
          <TabsList className="inline-flex bg-white/5 border border-white/10 rounded-full p-1">
            <TabsTrigger
              value="sms"
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-white"
            >
              <MessageSquare className="h-4 w-4" />
              SMS Messages
            </TabsTrigger>
            <TabsTrigger
              value="calling"
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-white"
            >
              <Phone className="h-4 w-4" />
              AI Calling
            </TabsTrigger>
          </TabsList>
        </div>

        {/* SMS Tab - Premium Redesign */}
        <TabsContent value="sms" className="space-y-0">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Compose Message */}
            <div className="space-y-6">
              {/* Modern Card with gradient background */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900/80 bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Compose Message</h3>
                    <p className="text-sm text-slate-400">Send to groups or all members</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Group Selection as Pills */}
                  <div className="space-y-3">
                    <Label className="text-sm text-slate-300">Send to</Label>
                    <div className="flex flex-wrap gap-2">
                      {/* All Members Button */}
                      <button
                        onClick={() => {
                          setSmsRecipientType('all');
                          setSmsSelectedGroupId('');
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${smsRecipientType === 'all'
                          ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                          } border`}
                      >
                        All Members
                      </button>

                      {/* Group Buttons */}
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => {
                            setSmsRecipientType('group');
                            setSmsSelectedGroupId(group.id);
                          }}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${smsRecipientType === 'group' && smsSelectedGroupId === group.id
                            ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                            } border`}
                        >
                          {group.name} ({group.member_count})
                        </button>
                      ))}

                      {groups.length === 0 && !loadingGroups && (
                        <p className="text-xs text-slate-500">No groups available. Create groups in the People section.</p>
                      )}
                    </div>
                  </div>

                  {/* Message Textarea with dark styling */}
                  <div className="space-y-2">
                    <Label htmlFor="smsMessage" className="text-sm text-slate-300">Message</Label>
                    <div className="relative">
                      <Textarea
                        id="smsMessage"
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        placeholder="Type your message here..."
                        rows={8}
                        className="resize-none bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                      />
                      {/* Character count styled elegantly */}
                      <div className="absolute bottom-3 right-3 px-3 py-1 rounded-lg bg-slate-900/80 border border-white/10">
                        <span className="text-xs text-slate-400">
                          {smsMessage.length}/160 · {Math.ceil(smsMessage.length / 160) || 1} SMS
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <code className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-xs">
                        {'{Name}'}
                      </code>
                      <span>Personalize with member's first name</span>
                    </p>
                  </div>

                  {/* Quick Templates */}
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400 uppercase tracking-wider">Quick Templates</Label>
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
                          className="text-xs bg-white/5 hover:bg-purple-500/10 hover:text-purple-300 transition-all px-3 py-1.5 rounded-lg border border-white/10 hover:border-purple-500/30 text-slate-400"
                          type="button"
                        >
                          {template.length > 35 ? template.substring(0, 35) + '...' : template}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Send Button with gradient */}
                  <Button
                    onClick={handleSendSMS}
                    disabled={loading || !smsMessage.trim() || (smsRecipientType === 'group' && !smsSelectedGroupId)}
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg text-base font-medium"
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
              </div>
            </div>

            {/* Right: Phone Preview with glow effect */}
            <div className="hidden lg:flex justify-center items-center">
              <div className="relative">
                {/* Phone Frame */}
                <div className="w-64 h-[500px] bg-slate-800 rounded-[3rem] p-3 shadow-2xl border-4 border-slate-700 relative">
                  {/* Glow Effect */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-[4rem] blur-xl -z-10" />

                  {/* Screen */}
                  <div className="w-full h-full bg-slate-900 rounded-[2.25rem] overflow-hidden relative">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-800 rounded-b-2xl z-10" />

                    {/* Messages App */}
                    <div className="pt-10 px-4 h-full flex flex-col">
                      <div className="text-center mb-4">
                        <p className="text-xs text-slate-500">Messages</p>
                        <p className="text-sm font-medium text-white">{currentOrganization?.name || 'Church'}</p>
                      </div>

                      <div className="flex-1 flex flex-col justify-end pb-4 space-y-3">
                        <div className="self-start max-w-[85%]">
                          <div className="bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                            <p className="text-sm text-white leading-relaxed">
                              {smsMessage.replace('{Name}', 'John') || 'Your message will appear here...'}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-600 mt-1 ml-2">Now</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* AI Calling Tab - Premium Redesign */}
        <TabsContent value="calling" className="space-y-0">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Script Editor & Controls */}
            <div className="space-y-6">
              {/* Script Editor Card */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900/80 bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">AI Call Script</h3>
                      <p className="text-xs text-slate-400">Natural conversational script</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI-Powered
                  </Badge>
                </div>

                {/* Script Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-slate-300">Select Script</Label>
                      <Dialog open={isCreateScriptOpen} onOpenChange={setIsCreateScriptOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-2"
                          >
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
                            <Button onClick={handleCreateScript} disabled={loading}>
                              {loading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                'Create Script'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
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
                      <p className="text-xs text-slate-500">No scripts found. Create your first script above.</p>
                    )}
                  </div>

                  {/* Listen to AI Button */}
                  {selectedScript && (
                    <Button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={isPlaying
                        ? "w-full bg-red-500 hover:bg-red-600"
                        : "w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                      }
                    >
                      {isPlaying ? (
                        <>Stop Preview</>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 mr-2" />
                          Listen to AI
                        </>
                      )}
                    </Button>
                  )}

                  {/* Voice Preview Animation */}
                  {isPlaying && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center animate-pulse">
                          <Volume2 className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">AI Voice Preview</p>
                          <p className="text-xs text-slate-400">Playing script with natural voice synthesis...</p>
                        </div>
                        {/* Pulsing Indicator */}
                        <div className="flex gap-1">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-purple-400 rounded-full animate-pulse"
                              style={{
                                height: `${12 + Math.random() * 16}px`,
                                animationDelay: `${i * 0.1}s`
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Group Selection & Launch */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900/80 bg-white/5 border border-white/10 backdrop-blur-sm space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-slate-300">Select Group to Call</Label>
                  <Select value={callSelectedGroupId} onValueChange={setCallSelectedGroupId}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
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
                    <p className="text-xs text-slate-500">No groups found.</p>
                  )}
                </div>

                <Button
                  onClick={handleStartCalling}
                  disabled={loading || !callSelectedGroupId || !selectedScriptId}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg text-base font-medium"
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

              {/* Best Practices */}
              <div className="p-5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <h4 className="font-semibold text-white flex items-center gap-2 mb-3 text-sm">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  AI Best Practices
                </h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Keep scripts conversational and warm</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Use <code className="bg-purple-500/20 text-purple-300 px-1 rounded">{'{Name}'}</code> to personalize calls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Include a question to encourage engagement</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: Script Preview & Campaign Cards */}
            <div className="space-y-6">
              {/* Script Preview Panel */}
              <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden min-h-[400px] flex flex-col">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-purple-400" />
                    </div>
                    <span className="font-semibold text-sm text-white">Script Preview</span>
                  </div>
                  <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                    AI Reader
                  </Badge>
                </div>

                <ScrollArea className="flex-1 p-6">
                  {selectedScript ? (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {selectedScript.name}
                      </h4>
                      <div className="font-serif text-base leading-relaxed text-slate-300">
                        {selectedScript.content.split('\n').map((line, idx) => (
                          <p key={idx} className="mb-3">
                            {line.split(/(\{Name\})/).map((part, i) =>
                              part === '{Name}' ? (
                                <span key={i} className="bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/50 font-sans text-sm">
                                  John
                                </span>
                              ) : (
                                part
                              )
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 py-20">
                      <FileText className="h-16 w-16 stroke-1 opacity-50" />
                      <p className="text-sm">Select a script to view content</p>
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Campaign Cards - Real Data */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  Recent Campaigns
                </h4>
                {loadingCampaigns ? (
                  <div className="p-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : campaigns.length > 0 ? (
                  campaigns.map((campaign) => (
                    <div key={campaign.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Phone className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{campaign.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{campaign.type} campaign</p>
                          </div>
                        </div>
                        <Badge className={`${campaign.status === "completed"
                          ? "bg-green-500/20 text-green-400"
                          : campaign.status === "active"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-amber-500/20 text-amber-400"
                          } border-0 text-xs`}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Progress</span>
                          <span className="text-white">{campaign.completed_count} / {campaign.total_recipients}</span>
                        </div>
                        <Progress
                          value={campaign.total_recipients > 0 ? (campaign.completed_count / campaign.total_recipients) * 100 : 0}
                          className="h-2 bg-white/10"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 rounded-xl bg-white/5 border border-white/10 border-dashed text-center">
                    <Zap className="h-10 w-10 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500">No campaigns yet</p>
                    <p className="text-xs text-slate-600 mt-1">Launch your first campaign to see it here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Communication Tips - Premium Card */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-3">Communication Best Practices</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                <p className="text-sm text-slate-300">Always identify your church in messages and calls</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <p className="text-sm text-slate-300">Be mindful of timing - avoid early mornings and late nights</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <p className="text-sm text-slate-300">Provide a way for recipients to opt-out or respond</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-2 flex-shrink-0" />
                <p className="text-sm text-slate-300">Review call transcripts for pastoral care opportunities</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
