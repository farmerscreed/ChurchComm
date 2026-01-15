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
  UserPlus
} from 'lucide-react';

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

  // Organization Settings State
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>(defaultSettings);

  // Load data on mount
  useEffect(() => {
    if (currentOrganization?.id) {
      loadOrganizationData();
      loadMembers();
    }
  }, [currentOrganization]);

  const loadOrganizationData = async () => {
    if (!currentOrganization) return;

    // Set organization profile data
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

    // Load settings from organization
    if (currentOrganization.settings) {
      setOrgSettings({
        ...defaultSettings,
        ...currentOrganization.settings
      });
    }
  };

  const loadMembers = async () => {
    if (!currentOrganization?.id) return;

    // Try to load with profiles join first
    let { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .eq('organization_id', currentOrganization.id);

    // Fallback to simple query if profiles join fails (e.g., no FK relationship yet)
    if (error) {
      console.warn('Profiles join failed, using fallback query:', error.message);
      const fallbackResult = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      if (!fallbackResult.error && fallbackResult.data) {
        // Try to fetch profiles separately
        const userIds = fallbackResult.data.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        // Merge profiles data
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

      toast({
        title: 'Success',
        description: 'Organization profile updated successfully',
      });
    } catch (error: any) {
      console.error('Error saving organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save organization profile',
        variant: 'destructive'
      });
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
        .update({
          settings: orgSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOrganization.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.filter(m => m.id !== memberId));
      toast({
        title: 'Success',
        description: 'Member removed successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!addMemberEmail.trim() || !currentOrganization?.id) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Find user by email in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', addMemberEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        toast({
          title: 'User Not Found',
          description: 'No user found with that email address. They need to sign up first.',
          variant: 'destructive'
        });
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Already a Member',
          description: 'This user is already a member of your organization.',
          variant: 'destructive'
        });
        return;
      }

      // Add member
      const { error: insertError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: currentOrganization.id,
          user_id: profile.id,
          role: addMemberRole
        });

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: `${profile.full_name || profile.email} has been added to your organization.`,
      });

      setAddMemberEmail('');
      setAddMemberRole('member');
      setIsAddMemberOpen(false);
      loadMembers(); // Refresh the list
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add member',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update member role',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      // Fetch all organization data
      const [peopleRes, groupsRes, campaignsRes] = await Promise.all([
        supabase.from('people').select('*').eq('organization_id', currentOrganization.id),
        supabase.from('groups').select('*').eq('organization_id', currentOrganization.id),
        supabase.from('communication_campaigns').select('*').eq('organization_id', currentOrganization.id)
      ]);

      const exportData = {
        organization: currentOrganization,
        people: peopleRes.data || [],
        groups: groupsRes.data || [],
        campaigns: campaignsRes.data || [],
        exported_at: new Date().toISOString()
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentOrganization.slug || 'organization'}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Data exported successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'leader': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your organization settings, integrations, and preferences.
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 gap-2">
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Organization</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="ai-calling" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">AI Calling</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="data-privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        {/* Organization Profile Tab */}
        <TabsContent value="organization" className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Profile
              </CardTitle>
              <CardDescription>
                Basic information about your church or organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name *</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="First Community Church"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgSlug">Organization Slug</Label>
                  <Input
                    id="orgSlug"
                    value={currentOrganization?.slug || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is your unique identifier and cannot be changed
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgDescription">Description</Label>
                <Textarea
                  id="orgDescription"
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  placeholder="A welcoming community of faith..."
                  rows={3}
                />
              </div>

              <Separator />

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="orgEmail" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="orgEmail"
                      type="email"
                      value={orgEmail}
                      onChange={(e) => setOrgEmail(e.target.value)}
                      placeholder="contact@church.org"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgPhone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="orgPhone"
                      type="tel"
                      value={orgPhone}
                      onChange={(e) => setOrgPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="orgWebsite" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </Label>
                    <Input
                      id="orgWebsite"
                      type="url"
                      value={orgWebsite}
                      onChange={(e) => setOrgWebsite(e.target.value)}
                      placeholder="https://www.yourchurch.org"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={orgAddress.street}
                      onChange={(e) => setOrgAddress({ ...orgAddress, street: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={orgAddress.city}
                      onChange={(e) => setOrgAddress({ ...orgAddress, city: e.target.value })}
                      placeholder="Springfield"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={orgAddress.state}
                      onChange={(e) => setOrgAddress({ ...orgAddress, state: e.target.value })}
                      placeholder="IL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={orgAddress.zip}
                      onChange={(e) => setOrgAddress({ ...orgAddress, zip: e.target.value })}
                      placeholder="62701"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={orgAddress.country}
                      onChange={(e) => setOrgAddress({ ...orgAddress, country: e.target.value })}
                      placeholder="USA"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Social Media */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Social Media
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      value={orgSocialMedia.facebook}
                      onChange={(e) => setOrgSocialMedia({ ...orgSocialMedia, facebook: e.target.value })}
                      placeholder="https://facebook.com/yourchurch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      value={orgSocialMedia.instagram}
                      onChange={(e) => setOrgSocialMedia({ ...orgSocialMedia, instagram: e.target.value })}
                      placeholder="https://instagram.com/yourchurch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter / X</Label>
                    <Input
                      id="twitter"
                      value={orgSocialMedia.twitter}
                      onChange={(e) => setOrgSocialMedia({ ...orgSocialMedia, twitter: e.target.value })}
                      placeholder="https://twitter.com/yourchurch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube">YouTube</Label>
                    <Input
                      id="youtube"
                      value={orgSocialMedia.youtube}
                      onChange={(e) => setOrgSocialMedia({ ...orgSocialMedia, youtube: e.target.value })}
                      placeholder="https://youtube.com/@yourchurch"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveOrganizationProfile} disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Organization Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </div>
                <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full sm:w-auto">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Team Member</DialogTitle>
                      <DialogDescription>
                        Add an existing user to your organization by their email address.
                        They must have already signed up for an account.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="memberEmail">Email Address</Label>
                        <Input
                          id="memberEmail"
                          type="email"
                          value={addMemberEmail}
                          onChange={(e) => setAddMemberEmail(e.target.value)}
                          placeholder="member@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="memberRole">Role</Label>
                        <Select value={addMemberRole} onValueChange={setAddMemberRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="leader">Leader</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Admins have full access. Leaders can manage people and groups. Members have limited access.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddMember} disabled={loading}>
                        {loading ? 'Adding...' : 'Add Member'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Manage who has access to your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No team members found.
                  </p>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary">
                            {(member.profiles?.full_name || member.profiles?.email || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {member.profiles?.full_name || member.profiles?.email?.split('@')[0] || 'Unknown User'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.profiles?.email || `Added ${new Date(member.created_at).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-center">
                         <Badge variant={getRoleBadgeVariant(member.role)} className="shrink-0">
                          {member.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                          {member.role}
                        </Badge>
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleUpdateMemberRole(member.id, value)}
                          disabled={member.user_id === user?.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="leader">Leader</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        {member.user_id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                            className="shrink-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Role Permissions Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Admin</Badge>
                    <Crown className="h-4 w-4 text-yellow-500" />
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Full access to all features</li>
                    <li>Manage organization settings</li>
                    <li>Manage team members</li>
                    <li>Access billing and data</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <Badge variant="secondary" className="mb-2">Leader</Badge>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Manage people directory</li>
                    <li>Create and manage groups</li>
                    <li>Send communications</li>
                    <li>View campaign results</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <Badge variant="outline" className="mb-2">Member</Badge>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>View people directory</li>
                    <li>View group information</li>
                    <li>Limited access to campaigns</li>
                    <li>Read-only dashboard</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Calling Tab */}
        <TabsContent value="ai-calling" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Calling Configuration
              </CardTitle>
              <CardDescription>
                Configure default settings for AI calling campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="aiModel">Default AI Model</Label>
                  <Select
                    value={orgSettings.ai_calling.default_model}
                    onValueChange={(value) => setOrgSettings({
                      ...orgSettings,
                      ai_calling: { ...orgSettings.ai_calling, default_model: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, Lower Cost)</SelectItem>
                      <SelectItem value="gpt-4">GPT-4 (Higher Quality)</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Balance)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Voice Temperature</Label>
                  <Select
                    value={orgSettings.ai_calling.default_temperature.toString()}
                    onValueChange={(value) => setOrgSettings({
                      ...orgSettings,
                      ai_calling: { ...orgSettings.ai_calling, default_temperature: parseFloat(value) }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.3">0.3 - More Focused</SelectItem>
                      <SelectItem value="0.5">0.5 - Balanced</SelectItem>
                      <SelectItem value="0.7">0.7 - Natural (Default)</SelectItem>
                      <SelectItem value="0.9">0.9 - More Creative</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Higher values make responses more varied and conversational
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costThreshold">Cost Threshold ($)</Label>
                  <Input
                    id="costThreshold"
                    type="number"
                    min="0"
                    step="10"
                    value={orgSettings.ai_calling.cost_threshold}
                    onChange={(e) => setOrgSettings({
                      ...orgSettings,
                      ai_calling: { ...orgSettings.ai_calling, cost_threshold: parseFloat(e.target.value) }
                    })}
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum cost per campaign before requiring approval
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchSize">Batch Size</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    min="1"
                    max="100"
                    value={orgSettings.ai_calling.batch_size}
                    onChange={(e) => setOrgSettings({
                      ...orgSettings,
                      ai_calling: { ...orgSettings.ai_calling, batch_size: parseInt(e.target.value) }
                    })}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of calls to process in each batch
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callDelay">Delay Between Calls (ms)</Label>
                  <Input
                    id="callDelay"
                    type="number"
                    min="1000"
                    max="10000"
                    step="500"
                    value={orgSettings.ai_calling.delay_between_calls}
                    onChange={(e) => setOrgSettings({
                      ...orgSettings,
                      ai_calling: { ...orgSettings.ai_calling, delay_between_calls: parseInt(e.target.value) }
                    })}
                    placeholder="2000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wait time between initiating calls (prevents rate limiting)
                  </p>
                </div>
              </div>

              <Button onClick={handleSaveSettings} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save AI Calling Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <Label>Campaign Completion Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when SMS or calling campaigns complete
                    </p>
                  </div>
                  <Switch
                    checked={orgSettings.notifications.email_campaign_complete}
                    onCheckedChange={(checked) => setOrgSettings({
                      ...orgSettings,
                      notifications: { ...orgSettings.notifications, email_campaign_complete: checked }
                    })}
                    className="self-start sm:self-center"
                  />
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <Label>Escalation Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when AI calls detect crisis or pastoral care needs
                    </p>
                  </div>
                  <Switch
                    checked={orgSettings.notifications.email_escalation_alerts}
                    onCheckedChange={(checked) => setOrgSettings({
                      ...orgSettings,
                      notifications: { ...orgSettings.notifications, email_escalation_alerts: checked }
                    })}
                    className="self-start sm:self-center"
                  />
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <Label>Weekly Summary</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly summary of communication activities
                    </p>
                  </div>
                  <Switch
                    checked={orgSettings.notifications.email_weekly_summary}
                    onCheckedChange={(checked) => setOrgSettings({
                      ...orgSettings,
                      notifications: { ...orgSettings.notifications, email_weekly_summary: checked }
                    })}
                    className="self-start sm:self-center"
                  />
                </div>
              </div>

              <Button onClick={handleSaveSettings} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Notification Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data & Privacy Tab */}
        <TabsContent value="data-privacy" className="space-y-6">
          {/* Subscription Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {currentOrganization?.subscription_plan || 'Free'} - {currentOrganization?.subscription_status || 'Active'}
                  </p>
                </div>
                <Badge variant={currentOrganization?.subscription_status === 'active' ? 'default' : 'secondary'}>
                  {currentOrganization?.subscription_status || 'Active'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Your Data
              </CardTitle>
              <CardDescription>
                Download all your organization's data in JSON format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Export includes: Organization profile, people directory, groups, and campaign history.
              </p>
              <Button onClick={handleExportData} disabled={loading} variant="outline">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Data Export
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                These actions are irreversible. Please proceed with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Deleting your organization will permanently remove all data including people,
                  groups, campaigns, and call logs. This action cannot be undone.
                </AlertDescription>
              </Alert>
              <Button variant="destructive" disabled>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Organization
              </Button>
              <p className="text-xs text-muted-foreground">
                Contact support to delete your organization
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
