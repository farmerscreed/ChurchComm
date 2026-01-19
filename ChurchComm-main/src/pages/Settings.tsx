import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Building2,
  Phone,
  Users,
  Bot,
  Bell,
  Shield,
  Save,
  Loader2,
  Trash2,
  Mail,
  Globe,
  MapPin,
  Link,
  Crown,
  CreditCard,
  Download,
  AlertTriangle,
  UserPlus,
  Send,
  MessageSquare,
  Clock,
  RefreshCw,
  X,
  Copy,
  CheckCircle,
  FileText,
  ChevronsUpDown,
  Check
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import ScriptManager from './Settings/ScriptManager';

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    id: string;
    email: string | null;
    full_name: string | null;
  };
}

interface Invitation {
  id: string;
  email: string | null;
  phone_number: string | null;
  role: string;
  invite_method: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface OrganizationSettings {
  ai_calling: {
    default_model: string;
    default_temperature: number;
    cost_threshold: number;
    batch_size: number;
    delay_between_calls: number;
  };
  notifications: {
    email_campaign_complete: boolean;
    email_escalation_alerts: boolean;
    email_weekly_summary: boolean;
    follow_up_recipients: string[];
  };
  sms: {
    sender_name: string;
    opt_out_keywords: string[];
  };
}

const defaultSettings: OrganizationSettings = {
  ai_calling: {
    default_model: 'gpt-3.5-turbo',
    default_temperature: 0.7,
    cost_threshold: 100,
    batch_size: 10,
    delay_between_calls: 2000,
  },
  notifications: {
    email_campaign_complete: true,
    email_escalation_alerts: true,
    email_weekly_summary: false,
    follow_up_recipients: [],
  },
  sms: {
    sender_name: '',
    opt_out_keywords: ['STOP', 'UNSUBSCRIBE'],
  },
};

const MultiSelect = ({ items, selected, onChange, placeholder }: { items: {value: string, label: string}[], selected: string[], onChange: (selected: string[]) => void, placeholder: string }) => {
    const [open, setOpen] = useState(false);
    
    const handleSelect = (value: string) => {
        onChange(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);
    };
    
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    <span className="truncate">
                        {selected.length > 0 ? selected.map(val => items.find(it => it.value === val)?.label).join(', ') : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search members..." />
                    <CommandEmpty>No members found.</CommandEmpty>
                    <CommandGroup>
                        <ScrollArea className="h-48">
                            {items.map((item) => (
                                <CommandItem
                                    key={item.value}
                                    onSelect={() => handleSelect(item.value)}
                                >
                                    <Check
                                        className={cn("mr-2 h-4 w-4", selected.includes(item.value) ? "opacity-100" : "opacity-0")}
                                    />
                                    {item.label}
                                </CommandItem>
                            ))}
                        </ScrollArea>
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default function Settings() {
  const { currentOrganization, user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('organization');

  // Organization Profile State
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgAddress, setOrgAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA'
  });
  const [orgSocialMedia, setOrgSocialMedia] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: ''
  });

  // Team Members State
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('member');

  // Invitation State
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms'>('email');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [sendingInvite, setSendingInvite] = useState(false);
  
  // Organization Settings State
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>(defaultSettings);

  // Load data on mount
  useEffect(() => {
    if (currentOrganization?.id) {
      loadOrganizationData();
      loadMembers();
      loadInvitations();
    }
  }, [currentOrganization]);

  // Handle deep-linking to specific tabs
  useEffect(() => {
    const tab = localStorage.getItem('settingsTab');
    if (tab) {
      setActiveTab(tab);
      localStorage.removeItem('settingsTab');
    }
  }, []);

  const loadOrganizationData = async () => {
    if (!currentOrganization) return;

    setOrgName(currentOrganization.name || '');
    setOrgDescription(currentOrganization.description || '');
    setOrgEmail(currentOrganization.email || '');
    setOrgPhone(currentOrganization.phone || '');
    setOrgWebsite(currentOrganization.website || '');

    if (currentOrganization.address) {
      setOrgAddress({
        street: currentOrganization.address.street || '',
        city: currentOrganization.address.city || '',
        state: currentOrganization.address.state || '',
        zip: currentOrganization.address.zip || '',
        country: currentOrganization.address.country || 'USA'
      });
    }

    if (currentOrganization.social_media) {
      setOrgSocialMedia({
        facebook: currentOrganization.social_media.facebook || '',
        instagram: currentOrganization.social_media.instagram || '',
        twitter: currentOrganization.social_media.twitter || '',
        youtube: currentOrganization.social_media.youtube || ''
      });
    }

    if (currentOrganization.settings) {
       const settings = currentOrganization.settings as any;
       setOrgSettings({
         ai_calling: { ...defaultSettings.ai_calling, ...settings.ai_calling },
         notifications: { ...defaultSettings.notifications, ...settings.notifications },
         sms: { ...defaultSettings.sms, ...settings.sms },
       });
    }
  };

  const loadMembers = async () => {
    if (!currentOrganization?.id) return;
    const { data, error } = await supabase
      .from('organization_members')
      .select('*, profiles:user_id(id, email, full_name)')
      .eq('organization_id', currentOrganization.id);
    if (!error && data) setMembers(data as any);
  };

  const loadInvitations = async () => {
    if (!currentOrganization?.id) return;
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (!error && data) setInvitations(data);
  };

  const handleSendInvitation = async () => {
    // ... (logic is unchanged)
  };
  const handleResendInvitation = async (invitation: Invitation) => {
    // ... (logic is unchanged)
  };
  const handleCancelInvitation = async (invitationId: string) => {
    // ... (logic is unchanged)
  };
  const getTimeRemaining = (expiresAt: string) => {
    // ... (logic is unchanged)
  };
  const handleSaveOrganizationProfile = async () => {
    // ... (logic is unchanged)
  };

  const handleSaveSettings = async () => {
    if (!currentOrganization?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: orgSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOrganization.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Settings saved successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    // ... (logic is unchanged)
  };
  const handleAddMember = async () => {
    // ... (logic is unchanged)
  };
  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    // ... (logic is unchanged)
  };
  const handleExportData = async () => {
    // ... (logic is unchanged)
  };
  const getRoleBadgeVariant = (role: string) => {
    // ... (logic is unchanged)
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
          Configure your organization settings and preferences.
        </p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-6 sm:w-full h-auto p-1 gap-1">
                <TabsTrigger value="organization" className="flex items-center gap-2 px-3 py-2 whitespace-nowrap"><Building2 className="h-4 w-4 shrink-0" /> <span className="text-xs sm:text-sm">Organization</span></TabsTrigger>
                <TabsTrigger value="team" className="flex items-center gap-2 px-3 py-2 whitespace-nowrap"><Users className="h-4 w-4 shrink-0" /> <span className="text-xs sm:text-sm">Team</span></TabsTrigger>
                <TabsTrigger value="ai-calling" className="flex items-center gap-2 px-3 py-2 whitespace-nowrap"><Bot className="h-4 w-4 shrink-0" /> <span className="text-xs sm:text-sm">AI</span></TabsTrigger>
                <TabsTrigger value="scripts" className="flex items-center gap-2 px-3 py-2 whitespace-nowrap"><FileText className="h-4 w-4 shrink-0" /> <span className="text-xs sm:text-sm">Scripts</span></TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2 px-3 py-2 whitespace-nowrap"><Bell className="h-4 w-4 shrink-0" /> <span className="text-xs sm:text-sm">Alerts</span></TabsTrigger>
                <TabsTrigger value="data-privacy" className="flex items-center gap-2 px-3 py-2 whitespace-nowrap"><Shield className="h-4 w-4 shrink-0" /> <span className="text-xs sm:text-sm">Data</span></TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="organization" className="space-y-6">{/* ... unchanged ... */}</TabsContent>
        <TabsContent value="team" className="space-y-6">{/* ... unchanged ... */}</TabsContent>
        <TabsContent value="ai-calling" className="space-y-6">{/* ... unchanged ... */}</TabsContent>
        <TabsContent value="scripts"><ScriptManager /></TabsContent>
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Control how and when you and your team receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                    <Label>Follow-up & Escalation Recipients</Label>
                    <p className="text-sm text-muted-foreground">
                      Select team members who should receive email alerts for new follow-ups.
                    </p>
                    <MultiSelect
                        items={members.map(m => ({
                            value: m.user_id,
                            label: m.profiles?.full_name || m.profiles?.email || 'Unknown User'
                        }))}
                        selected={orgSettings.notifications.follow_up_recipients || []}
                        onChange={(selected) => setOrgSettings({
                            ...orgSettings,
                            notifications: { ...orgSettings.notifications, follow_up_recipients: selected }
                        })}
                        placeholder="Select team members..."
                    />
                </div>
                <Separator />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <Label>Campaign Completion Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when SMS or calling campaigns complete.</p>
                  </div>
                  <Switch
                    checked={orgSettings.notifications.email_campaign_complete}
                    onCheckedChange={(checked) => setOrgSettings({ ...orgSettings, notifications: { ...orgSettings.notifications, email_campaign_complete: checked }})}
                  />
                </div>
                <Separator />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <Label>Weekly Summary</Label>
                    <p className="text-sm text-muted-foreground">Receive a weekly summary of communication activities.</p>
                  </div>
                  <Switch
                    checked={orgSettings.notifications.email_weekly_summary}
                    onCheckedChange={(checked) => setOrgSettings({ ...orgSettings, notifications: { ...orgSettings.notifications, email_weekly_summary: checked }})}
                  />
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Notification Preferences</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="data-privacy" className="space-y-6">{/* ... unchanged ... */}</TabsContent>
      </Tabs>
    </div>
  );
}