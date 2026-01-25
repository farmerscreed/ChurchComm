import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  CreditCard,
  AlertTriangle,
  UserPlus,
  Send,
  Clock,
  RefreshCw,
  X,
  Copy,
  CheckCircle,
  FileText,
  Edit,
  Volume2,
  Wand2,
  Brain,
  RotateCcw,
  ChevronRight,
  Settings2,
  Sparkles,
  ExternalLink,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Zap
} from 'lucide-react';
import { ScriptTemplateGallery } from '@/components/communications/ScriptTemplateGallery';
import { ScriptBuilder } from '@/components/communications/ScriptBuilder';
import { VariableReference } from '@/components/communications/VariableReference';
import { ScriptList } from '@/components/communications/ScriptList';
import { VOICE_PRESETS, DEFAULT_VOICE } from '@/lib/voice-presets';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChurchContextManager } from '@/components/settings/ChurchContextManager';
import { BillingSettings } from '@/components/settings/BillingSettings';
import { AutoTriggerManager } from '@/components/settings/AutoTriggerManager';
import { cn } from '@/lib/utils';

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
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
  },
  sms: {
    sender_name: '',
    opt_out_keywords: ['STOP', 'UNSUBSCRIBE'],
  },
};

// Navigation items for the settings sidebar
const settingsNav = [
  { id: 'general', label: 'General', icon: Building2, description: 'Organization profile & contact' },
  { id: 'team', label: 'Team', icon: Users, description: 'Members & invitations' },
  { id: 'billing', label: 'Billing', icon: CreditCard, description: 'Subscription & usage' },
  { id: 'ai', label: 'AI & Calling', icon: Bot, description: 'Scripts, voice & AI context' },
];

export default function Settings() {
  const { currentOrganization, user } = useAuthStore();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    const tabParam = searchParams.get('tab');
    // Map old tab names to new sections
    const tabMapping: Record<string, string> = {
      'organization': 'general',
      'billing': 'billing',
      'team': 'team',
      'ai-calling': 'ai',
      'scripts': 'ai',
      'notifications': 'general',
      'data-privacy': 'general',
      'ai-context': 'ai',
    };
    return tabMapping[tabParam || ''] || 'general';
  });

  // Mobile nav open state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  // AI Settings sub-navigation
  const [aiSubSection, setAiSubSection] = useState<'scripts' | 'voice' | 'context' | 'automations'>('scripts');

  // Load data on mount
  useEffect(() => {
    if (currentOrganization?.id) {
      loadOrganizationData();
      loadMembers();
      loadInvitations();
    }
  }, [currentOrganization]);

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
      setOrgSettings({
        ...defaultSettings,
        ...currentOrganization.settings
      });
    }
  };

  const loadMembers = async () => {
    if (!currentOrganization?.id) return;

    let { data, error } = await supabase
      .from('organization_members')
      .select(`*, profiles:user_id (email, full_name)`)
      .eq('organization_id', currentOrganization.id);

    if (error) {
      const fallbackResult = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      if (!fallbackResult.error && fallbackResult.data) {
        const userIds = fallbackResult.data.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        data = fallbackResult.data.map(member => ({
          ...member,
          profiles: profiles?.find(p => p.id === member.user_id) || null
        }));
        error = null;
      }
    }

    if (!error && data) {
      setMembers(data);
    }
  };

  const loadInvitations = async () => {
    if (!currentOrganization?.id) return;

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvitations(data);
    }
  };

  const handleSendInvitation = async () => {
    if (!currentOrganization?.id) return;

    if (inviteMethod === 'email' && !inviteEmail.trim()) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    if (inviteMethod === 'sms' && !invitePhone.trim()) {
      toast({ title: 'Error', description: 'Please enter a phone number', variant: 'destructive' });
      return;
    }

    setSendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: {
          email: inviteMethod === 'email' ? inviteEmail.trim().toLowerCase() : null,
          phoneNumber: inviteMethod === 'sms' ? invitePhone.trim() : null,
          role: inviteRole,
          inviteMethod,
          organizationId: currentOrganization.id,
          organizationName: currentOrganization.name,
          invitedBy: user?.id,
          inviterName: user?.user_metadata?.full_name || user?.email
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Invitation Sent!',
        description: `Invitation sent via ${inviteMethod.toUpperCase()} to ${inviteMethod === 'email' ? inviteEmail : invitePhone}`,
      });

      setInviteEmail('');
      setInvitePhone('');
      setInviteRole('member');
      setIsInviteDialogOpen(false);
      loadInvitations();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send invitation', variant: 'destructive' });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      await supabase.from('invitations').update({ status: 'cancelled' }).eq('id', invitation.id);

      const { error } = await supabase.functions.invoke('send-invite', {
        body: {
          email: invitation.email,
          phoneNumber: invitation.phone_number,
          role: invitation.role,
          inviteMethod: invitation.invite_method,
          organizationId: currentOrganization.id,
          organizationName: currentOrganization.name,
          invitedBy: user?.id,
          inviterName: user?.user_metadata?.full_name || user?.email
        }
      });

      if (error) throw error;

      toast({ title: 'Invitation Resent', description: 'A new invitation has been sent' });
      loadInvitations();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to resend invitation', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('invitations').update({ status: 'cancelled' }).eq('id', invitationId);

      if (error) throw error;

      toast({ title: 'Invitation Cancelled', description: 'The invitation has been cancelled' });
      loadInvitations();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to cancel invitation', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diff <= 0) return 'Expired';
    if (days > 0) return `${days}d remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Expires soon';
  };

  const handleSaveOrganizationProfile = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgName,
          description: orgDescription,
          email: orgEmail,
          phone: orgPhone,
          website: orgWebsite,
          address: orgAddress,
          social_media: orgSocialMedia,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOrganization.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Organization profile updated successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save organization profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ settings: orgSettings, updated_at: new Date().toISOString() })
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
    if (!confirm('Are you sure you want to remove this member?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('organization_members').delete().eq('id', memberId);

      if (error) throw error;

      setMembers(members.filter(m => m.id !== memberId));
      toast({ title: 'Success', description: 'Member removed successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to remove member', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!addMemberEmail.trim() || !currentOrganization?.id) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', addMemberEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        toast({ title: 'User Not Found', description: 'No user found with that email address. They need to sign up first.', variant: 'destructive' });
        return;
      }

      const { data: existing } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Already a Member', description: 'This user is already a member of your organization.', variant: 'destructive' });
        return;
      }

      const { error: insertError } = await supabase
        .from('organization_members')
        .insert({ organization_id: currentOrganization.id, user_id: profile.id, role: addMemberRole });

      if (insertError) throw insertError;

      toast({ title: 'Success', description: `${profile.full_name || profile.email} has been added to your organization.` });

      setAddMemberEmail('');
      setAddMemberRole('member');
      setIsAddMemberOpen(false);
      loadMembers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add member', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('organization_members').update({ role: newRole }).eq('id', memberId);

      if (error) throw error;

      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      toast({ title: 'Success', description: 'Member role updated successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update member role', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      const [peopleRes, groupsRes, campaignsRes] = await Promise.all([
        supabase.from('people').select('*').eq('organization_id', currentOrganization.id),
        supabase.from('groups').select('*').eq('organization_id', currentOrganization.id),
        supabase.from('messaging_campaigns').select('*').eq('organization_id', currentOrganization.id)
      ]);

      const exportData = {
        organization: currentOrganization,
        people: peopleRes.data || [],
        groups: groupsRes.data || [],
        campaigns: campaignsRes.data || [],
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentOrganization.slug || 'organization'}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Success', description: 'Data exported successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to export data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestartTour = async () => {
    if (!currentOrganization?.id || !user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ tour_completed: false })
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', user.id);

      if (error) {
        if (error.message?.includes('tour_completed')) {
          toast({ title: 'Feature not available', description: 'Please run database migrations to enable the tour feature.', variant: 'destructive' });
          return;
        }
        throw error;
      }

      toast({ title: 'Tour restarted', description: 'The guided tour will start on your next page load.' });
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to restart tour', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'pastor': return 'secondary';
      case 'leader': return 'secondary';
      default: return 'outline';
    }
  };

  // Render sections
  const renderGeneralSection = () => (
    <div className="space-y-6">
      {/* Organization Profile */}
      <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Building2 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-50">Organization Profile</CardTitle>
              <CardDescription className="text-slate-400">Basic information about your church</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name *</Label>
              <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="First Community Church" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgSlug">Organization Slug</Label>
              <Input id="orgSlug" value={currentOrganization?.slug || ''} disabled className="bg-white/5 border-white/10 text-slate-400" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgDescription">Description</Label>
            <Textarea id="orgDescription" value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)} placeholder="A welcoming community of faith..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Phone className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-50">Contact Information</CardTitle>
              <CardDescription className="text-slate-400">How people can reach your organization</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgEmail" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
              </Label>
              <Input id="orgEmail" type="email" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} placeholder="info@yourchurch.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgPhone" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone
              </Label>
              <Input id="orgPhone" value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgWebsite" className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Website
            </Label>
            <Input id="orgWebsite" value={orgWebsite} onChange={(e) => setOrgWebsite(e.target.value)} placeholder="https://www.yourchurch.com" />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <MapPin className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-50">Address</CardTitle>
              <CardDescription className="text-slate-400">Your physical location</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input id="street" value={orgAddress.street} onChange={(e) => setOrgAddress({ ...orgAddress, street: e.target.value })} placeholder="123 Main Street" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={orgAddress.city} onChange={(e) => setOrgAddress({ ...orgAddress, city: e.target.value })} placeholder="Springfield" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={orgAddress.state} onChange={(e) => setOrgAddress({ ...orgAddress, state: e.target.value })} placeholder="CA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" value={orgAddress.zip} onChange={(e) => setOrgAddress({ ...orgAddress, zip: e.target.value })} placeholder="12345" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Globe className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-50">Social Media</CardTitle>
              <CardDescription className="text-slate-400">Connect your social profiles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebook" className="flex items-center gap-2">
                <Facebook className="h-3.5 w-3.5 text-blue-600" /> Facebook
              </Label>
              <Input id="facebook" value={orgSocialMedia.facebook} onChange={(e) => setOrgSocialMedia({ ...orgSocialMedia, facebook: e.target.value })} placeholder="https://facebook.com/yourchurch" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="h-3.5 w-3.5 text-pink-500" /> Instagram
              </Label>
              <Input id="instagram" value={orgSocialMedia.instagram} onChange={(e) => setOrgSocialMedia({ ...orgSocialMedia, instagram: e.target.value })} placeholder="https://instagram.com/yourchurch" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter" className="flex items-center gap-2">
                <Twitter className="h-3.5 w-3.5 text-sky-500" /> Twitter / X
              </Label>
              <Input id="twitter" value={orgSocialMedia.twitter} onChange={(e) => setOrgSocialMedia({ ...orgSocialMedia, twitter: e.target.value })} placeholder="https://twitter.com/yourchurch" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube" className="flex items-center gap-2">
                <Youtube className="h-3.5 w-3.5 text-red-500" /> YouTube
              </Label>
              <Input id="youtube" value={orgSocialMedia.youtube} onChange={(e) => setOrgSocialMedia({ ...orgSocialMedia, youtube: e.target.value })} placeholder="https://youtube.com/@yourchurch" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Bell className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-50">Notifications</CardTitle>
              <CardDescription className="text-slate-400">Configure email alerts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div>
              <p className="font-medium text-sm text-slate-50">Campaign Complete</p>
              <p className="text-xs text-slate-400">Get notified when campaigns finish</p>
            </div>
            <Switch
              checked={orgSettings.notifications.email_campaign_complete}
              onCheckedChange={(checked) => setOrgSettings({
                ...orgSettings,
                notifications: { ...orgSettings.notifications, email_campaign_complete: checked }
              })}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div>
              <p className="font-medium text-sm text-slate-50">Escalation Alerts</p>
              <p className="text-xs text-slate-400">Urgent follow-up notifications</p>
            </div>
            <Switch
              checked={orgSettings.notifications.email_escalation_alerts}
              onCheckedChange={(checked) => setOrgSettings({
                ...orgSettings,
                notifications: { ...orgSettings.notifications, email_escalation_alerts: checked }
              })}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div>
              <p className="font-medium text-sm text-slate-50">Weekly Summary</p>
              <p className="text-xs text-slate-400">Weekly activity digest</p>
            </div>
            <Switch
              checked={orgSettings.notifications.email_weekly_summary}
              onCheckedChange={(checked) => setOrgSettings({
                ...orgSettings,
                notifications: { ...orgSettings.notifications, email_weekly_summary: checked }
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-50">Data & Privacy</CardTitle>
              <CardDescription className="text-slate-400">Manage your data and preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleExportData} disabled={loading} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
            <Button variant="outline" onClick={handleRestartTour} disabled={loading} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart Tour
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end sticky bottom-4">
        <Button onClick={handleSaveOrganizationProfile} disabled={loading} size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg">
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save Changes</>
          )}
        </Button>
      </div>
    </div>
  );

  const renderTeamSection = () => (
    <div className="space-y-6">
      {/* Team Header */}
      <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-50">Team Members</CardTitle>
                <CardDescription className="text-slate-400">{members.length} member{members.length !== 1 ? 's' : ''} in your organization</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" /> Add Existing
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Existing User</DialogTitle>
                    <DialogDescription>Add someone who already has an account.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="memberEmail">Email Address</Label>
                      <Input id="memberEmail" type="email" value={addMemberEmail} onChange={(e) => setAddMemberEmail(e.target.value)} placeholder="member@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="memberRole">Role</Label>
                      <Select value={addMemberRole} onValueChange={setAddMemberRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="pastor">Pastor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddMember} disabled={loading}>{loading ? 'Adding...' : 'Add Member'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Send className="h-4 w-4 mr-2" /> Invite New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>Send an invitation to join your organization.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Invite Method</Label>
                      <div className="flex gap-2">
                        <Button variant={inviteMethod === 'email' ? 'default' : 'outline'} size="sm" onClick={() => setInviteMethod('email')} className="flex-1">
                          <Mail className="h-4 w-4 mr-2" /> Email
                        </Button>
                        <Button variant={inviteMethod === 'sms' ? 'default' : 'outline'} size="sm" onClick={() => setInviteMethod('sms')} className="flex-1">
                          <Phone className="h-4 w-4 mr-2" /> SMS
                        </Button>
                      </div>
                    </div>
                    {inviteMethod === 'email' ? (
                      <div className="space-y-2">
                        <Label htmlFor="inviteEmail">Email Address</Label>
                        <Input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="newmember@example.com" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="invitePhone">Phone Number</Label>
                        <Input id="invitePhone" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="+1 (555) 123-4567" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="inviteRole">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="pastor">Pastor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSendInvitation} disabled={sendingInvite}>
                      {sendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Send Invite</>}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                    <span className="text-sm font-medium text-purple-400">
                      {(member.profiles?.full_name || member.profiles?.email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-50">{member.profiles?.full_name || 'Unknown User'}</p>
                    <p className="text-xs text-slate-400">{member.profiles?.email || member.user_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={member.role} onValueChange={(value) => handleUpdateMemberRole(member.id, value)} disabled={member.user_id === user?.id}>
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="pastor">Pastor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {member.user_id !== user?.id && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemoveMember(member.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-50">Pending Invitations</CardTitle>
                <CardDescription className="text-slate-400">{invitations.length} invitation{invitations.length !== 1 ? 's' : ''} waiting</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      {invitation.invite_method === 'email' ? <Mail className="h-4 w-4 text-amber-400" /> : <Phone className="h-4 w-4 text-amber-400" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-50">{invitation.email || invitation.phone_number}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(invitation.role)} className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">{invitation.role}</Badge>
                        <span className="text-xs text-slate-400">{getTimeRemaining(invitation.expires_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleResendInvitation(invitation)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleCancelInvitation(invitation.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderBillingSection = () => (
    <BillingSettings />
  );

  const renderAISection = () => (
    <div className="space-y-6">
      {/* AI Sub-navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {[
          { id: 'scripts', label: 'Scripts', icon: FileText },
          { id: 'automations', label: 'Automations', icon: Zap },
          { id: 'voice', label: 'Voice', icon: Volume2 },
          { id: 'context', label: 'AI Context', icon: Brain },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setAiSubSection(item.id as any)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
              aiSubSection === item.id
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                : "bg-white/5 border border-white/10 text-slate-400 hover:text-slate-50"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {aiSubSection === 'scripts' && (
        <div className="space-y-6">
          <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Wand2 className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-50">AI Script Builder</CardTitle>
                  <CardDescription className="text-slate-400">Generate custom call scripts with AI</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScriptBuilder />
            </CardContent>
          </Card>

          <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-50">Script Templates</CardTitle>
                  <CardDescription className="text-slate-400">Pre-built templates to get started</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScriptTemplateGallery />
            </CardContent>
          </Card>

          <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <FileText className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-50">Your Scripts</CardTitle>
                  <CardDescription className="text-slate-400">Manage your saved call scripts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScriptList />
            </CardContent>
          </Card>

          <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Edit className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-50">Variable Reference</CardTitle>
                  <CardDescription className="text-slate-400">Available placeholders for personalization</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VariableReference />
            </CardContent>
          </Card>
        </div>
      )}

      {aiSubSection === 'automations' && (
        <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-50">Call Automations</CardTitle>
                <CardDescription className="text-slate-400">Automatic calls for key church moments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AutoTriggerManager />
          </CardContent>
        </Card>
      )}

      {aiSubSection === 'voice' && (
        <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Volume2 className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-50">Voice Settings</CardTitle>
                <CardDescription className="text-slate-400">Configure AI voice for phone calls</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {VOICE_PRESETS.map((voice) => (
                <div
                  key={voice.id}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                    voice.id === DEFAULT_VOICE.id
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-white/10 bg-white/5 hover:border-purple-500/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-50">{voice.name}</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{voice.provider}</Badge>
                  </div>
                  <p className="text-sm text-slate-400">{voice.description}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-400">
              Voice selection is configured per script. The voice shown above with the highlighted border is the default.
            </p>
          </CardContent>
        </Card>
      )}

      {aiSubSection === 'context' && (
        <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Brain className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-50">AI Context</CardTitle>
                <CardDescription className="text-slate-400">Information the AI uses during calls</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChurchContextManager />
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'general': return renderGeneralSection();
      case 'team': return renderTeamSection();
      case 'billing': return renderBillingSection();
      case 'ai': return renderAISection();
      default: return renderGeneralSection();
    }
  };

  const activeNav = settingsNav.find(n => n.id === activeSection);

  return (
    <div className="bg-slate-950 text-slate-50 min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-purple-400" />
          <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Settings
          </span>
        </h1>
        <p className="text-slate-400 mt-1">
          Manage your organization, team, and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop Sidebar Navigation */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl sticky top-4 p-2">
            <nav className="space-y-1">
              {settingsNav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                    activeSection === item.id
                      ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-slate-50 shadow-lg"
                      : "hover:bg-white/5 text-slate-400 hover:text-slate-50"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 shrink-0",
                    activeSection === item.id ? "text-purple-400" : "text-slate-400"
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{item.label}</p>
                    <p className={cn(
                      "text-xs truncate",
                      activeSection === item.id ? "text-slate-300" : "text-slate-500"
                    )}>
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    activeSection === item.id ? "opacity-100 text-purple-400" : "opacity-0"
                  )} />
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
            {settingsNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  activeSection === item.id
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                    : "bg-white/5 border border-white/10 text-slate-400 hover:text-slate-50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <ScrollArea className="h-full">
            {renderContent()}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
