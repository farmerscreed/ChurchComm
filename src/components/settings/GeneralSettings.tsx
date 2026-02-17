import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Bell, Shield, Save, Loader2, ExternalLink, RotateCcw } from 'lucide-react';

interface GeneralSettingsProps {
    orgSettings: any;
    setOrgSettings: (settings: any) => void;
}

export function GeneralSettings({ orgSettings, setOrgSettings }: GeneralSettingsProps) {
    const { currentOrganization, user } = useAuthStore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Local state
    const [orgName, setOrgName] = useState(currentOrganization?.name || '');
    const [orgDescription, setOrgDescription] = useState(currentOrganization?.description || '');
    const [orgEmail, setOrgEmail] = useState(currentOrganization?.email || '');
    const [orgPhone, setOrgPhone] = useState(currentOrganization?.phone || '');
    const [orgWebsite, setOrgWebsite] = useState(currentOrganization?.website || '');
    const [orgTimezone, setOrgTimezone] = useState(currentOrganization?.timezone || 'America/New_York');
    const [orgAddress, setOrgAddress] = useState({
        street: currentOrganization?.address?.street || '',
        city: currentOrganization?.address?.city || '',
        state: currentOrganization?.address?.state || '',
        zip: currentOrganization?.address?.zip || '',
        country: currentOrganization?.address?.country || 'USA'
    });
    const [orgSocialMedia, setOrgSocialMedia] = useState({
        facebook: currentOrganization?.social_media?.facebook || '',
        instagram: currentOrganization?.social_media?.instagram || '',
        twitter: currentOrganization?.social_media?.twitter || '',
        youtube: currentOrganization?.social_media?.youtube || ''
    });

    const defaultSettings = {
        ai_calling: {
            default_model: 'gpt-4',
            default_temperature: 0.7,
            cost_threshold: 100,
            batch_size: 10,
            delay_between_calls: 30
        },
        notifications: {
            email_campaign_complete: true,
            email_escalation_alerts: true,
            email_weekly_summary: true
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
                    timezone: orgTimezone,
                    address: orgAddress,
                    social_media: orgSocialMedia,
                    settings: orgSettings
                })
                .eq('id', currentOrganization.id);

            if (error) throw error;

            toast({ title: 'Success', description: 'Organization settings saved successfully' });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to save settings', variant: 'destructive' });
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

    return (
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
                            <Building2 className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-slate-50">Contact Information</CardTitle>
                            <CardDescription className="text-slate-400">How people can reach your church</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="orgEmail">Email</Label>
                            <Input id="orgEmail" type="email" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} placeholder="contact@church.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="orgPhone">Phone</Label>
                            <Input id="orgPhone" type="tel" value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="orgWebsite">Website</Label>
                        <Input id="orgWebsite" value={orgWebsite} onChange={(e) => setOrgWebsite(e.target.value)} placeholder="https://church.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="orgTimezone">Timezone</Label>
                        <Input id="orgTimezone" value={orgTimezone} onChange={(e) => setOrgTimezone(e.target.value)} placeholder="America/New_York" />
                    </div>
                </CardContent>
            </Card>

            {/* Social Media */}
            <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-pink-500/20">
                            <Building2 className="h-5 w-5 text-pink-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-slate-50">Social Media</CardTitle>
                            <CardDescription className="text-slate-400">Your church's online presence</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="facebook">Facebook</Label>
                            <Input id="facebook" value={orgSocialMedia.facebook} onChange={(e) => setOrgSocialMedia({ ...orgSocialMedia, facebook: e.target.value })} placeholder="https://facebook.com/yourchurch" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="instagram">Instagram</Label>
                            <Input id="instagram" value={orgSocialMedia.instagram} onChange={(e) => setOrgSocialMedia({ ...orgSocialMedia, instagram: e.target.value })} placeholder="@yourchurch" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="twitter">Twitter</Label>
                            <Input id="twitter" value={orgSocialMedia.twitter} onChange={(e) => setOrgSocialMedia({ ...orgSocialMedia, twitter: e.target.value })} placeholder="@yourchurch" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="youtube">YouTube</Label>
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
                            checked={orgSettings?.notifications?.email_campaign_complete ?? true}
                            onCheckedChange={(checked) => setOrgSettings({
                                ...orgSettings,
                                notifications: { ...orgSettings?.notifications, email_campaign_complete: checked }
                            })}
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div>
                            <p className="font-medium text-sm text-slate-50">Escalation Alerts</p>
                            <p className="text-xs text-slate-400">Urgent follow-up notifications</p>
                        </div>
                        <Switch
                            checked={orgSettings?.notifications?.email_escalation_alerts ?? true}
                            onCheckedChange={(checked) => setOrgSettings({
                                ...orgSettings,
                                notifications: { ...orgSettings?.notifications, email_escalation_alerts: checked }
                            })}
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div>
                            <p className="font-medium text-sm text-slate-50">Weekly Summary</p>
                            <p className="text-xs text-slate-400">Weekly activity digest</p>
                        </div>
                        <Switch
                            checked={orgSettings?.notifications?.email_weekly_summary ?? true}
                            onCheckedChange={(checked) => setOrgSettings({
                                ...orgSettings,
                                notifications: { ...orgSettings?.notifications, email_weekly_summary: checked }
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
}