import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Users, UserPlus, Mail, Phone, Loader2, Trash2, RefreshCw, Send, AlertTriangle, ShieldAlert, MessageSquare } from 'lucide-react';

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

interface TeamSettingsProps {
    members: OrganizationMember[];
    invitations: Invitation[];
    onMembersChange: (members: OrganizationMember[]) => void;
    onInvitationsChange: (invitations: Invitation[]) => void;
}

export function TeamSettings({ members, invitations, onMembersChange, onInvitationsChange }: TeamSettingsProps) {
    const { currentOrganization, user } = useAuthStore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Invite dialog state
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [inviteMethod, setInviteMethod] = useState<'email' | 'sms'>('email');
    const [inviteEmail, setInviteEmail] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [sendingInvite, setSendingInvite] = useState(false);

    // Add member dialog state
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [addMemberEmail, setAddMemberEmail] = useState('');
    const [addMemberRole, setAddMemberRole] = useState('member');

    // Escalation notification preferences
    const [notifPrefs, setNotifPrefs] = useState<Record<string, { escalation_sms: boolean; escalation_email: boolean }>>({});
    const [savingNotif, setSavingNotif] = useState<string | null>(null);

    const escalationEligibleMembers = members.filter(m => ['admin', 'pastor'].includes(m.role));

    const loadNotificationPrefs = async () => {
        if (!currentOrganization?.id) return;
        const userIds = escalationEligibleMembers.map(m => m.user_id);
        if (userIds.length === 0) return;

        const { data } = await supabase
            .from('notification_preferences')
            .select('user_id, escalation_sms, escalation_email')
            .eq('organization_id', currentOrganization.id)
            .in('user_id', userIds);

        const prefsMap: Record<string, { escalation_sms: boolean; escalation_email: boolean }> = {};
        for (const uid of userIds) {
            const existing = data?.find(d => d.user_id === uid);
            prefsMap[uid] = {
                escalation_sms: existing?.escalation_sms ?? true,
                escalation_email: existing?.escalation_email ?? true,
            };
        }
        setNotifPrefs(prefsMap);
    };

    useEffect(() => {
        if (escalationEligibleMembers.length > 0 && currentOrganization?.id) {
            loadNotificationPrefs();
        }
    }, [members, currentOrganization?.id]);

    const handleToggleNotifPref = async (userId: string, field: 'escalation_sms' | 'escalation_email', value: boolean) => {
        if (!currentOrganization?.id) return;
        setSavingNotif(userId + field);

        // Optimistic update
        setNotifPrefs(prev => ({
            ...prev,
            [userId]: { ...prev[userId], [field]: value }
        }));

        const { data: existing } = await supabase
            .from('notification_preferences')
            .select('id')
            .eq('user_id', userId)
            .eq('organization_id', currentOrganization.id)
            .maybeSingle();

        if (existing) {
            await supabase
                .from('notification_preferences')
                .update({ [field]: value, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('notification_preferences')
                .insert({
                    user_id: userId,
                    organization_id: currentOrganization.id,
                    escalation_sms: field === 'escalation_sms' ? value : true,
                    escalation_email: field === 'escalation_email' ? value : true,
                });
        }
        setSavingNotif(null);
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'admin': return 'default';
            case 'pastor': return 'secondary';
            case 'leader': return 'secondary';
            default: return 'outline';
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
            const { error } = await supabase.functions.invoke('send-invite', {
                body: {
                    email: invitation.email,
                    phoneNumber: invitation.phone_number,
                    role: invitation.role,
                    inviteMethod: invitation.invite_method,
                    organizationId: currentOrganization.id,
                    organizationName: currentOrganization.name,
                    invitedBy: user?.id,
                    inviterName: user?.user_metadata?.full_name || user?.email,
                    resend: true
                }
            });

            if (error) throw error;

            toast({ title: 'Invitation Resent', description: `Invitation resent to ${invitation.email || invitation.phone_number}` });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to resend invitation', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeInvitation = async (invitationId: string) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('invitations')
                .update({ status: 'revoked' })
                .eq('id', invitationId);

            if (error) throw error;

            onInvitationsChange(invitations.filter(i => i.id !== invitationId));
            toast({ title: 'Invitation Revoked' });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to revoke invitation', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async () => {
        if (!currentOrganization?.id || !addMemberEmail.trim()) return;

        setLoading(true);
        try {
            // First, find the user by email
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('email', addMemberEmail.trim().toLowerCase())
                .limit(1);

            if (profileError) throw profileError;

            if (!profiles || profiles.length === 0) {
                toast({ title: 'User Not Found', description: 'No account found with that email. Send an invitation instead.', variant: 'destructive' });
                return;
            }

            const profile = profiles[0];

            // Check if already a member
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

    const handleRemoveMember = async (memberId: string) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('organization_members').delete().eq('id', memberId);

            if (error) throw error;

            onMembersChange(members.filter(m => m.id !== memberId));
            toast({ title: 'Member Removed' });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to remove member', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('organization_members').update({ role: newRole }).eq('id', memberId);

            if (error) throw error;

            onMembersChange(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
            toast({ title: 'Success', description: 'Member role updated successfully' });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to update member role', variant: 'destructive' });
        } finally {
            setLoading(false);
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
            onMembersChange(data);
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
            onInvitationsChange(data);
        }
    };

    // Load data on mount
    useEffect(() => {
        if (currentOrganization?.id) {
            loadMembers();
            loadInvitations();
        }
    }, [currentOrganization?.id]);

    return (
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
                                        <Mail className="h-4 w-4 mr-2" /> Invite
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Invite Team Member</DialogTitle>
                                        <DialogDescription>Send an invitation to join your organization.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Invitation Method</Label>
                                            <Select value={inviteMethod} onValueChange={(v) => setInviteMethod(v as 'email' | 'sms')}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="email">Email</SelectItem>
                                                    <SelectItem value="sms">SMS</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {inviteMethod === 'email' ? (
                                            <div className="space-y-2">
                                                <Label htmlFor="inviteEmail">Email Address</Label>
                                                <Input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@example.com" />
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label htmlFor="invitePhone">Phone Number</Label>
                                                <Input id="invitePhone" type="tel" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="+1 (555) 123-4567" />
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
                                            {sendingInvite ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                            Send Invitation
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Members List */}
                    <div className="space-y-3">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium">
                                        {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-50">{member.profiles?.full_name || 'Unknown'}</p>
                                        <p className="text-sm text-slate-400">{member.profiles?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select value={member.role} onValueChange={(newRole) => handleUpdateMemberRole(member.id, newRole)}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="member">Member</SelectItem>
                                            <SelectItem value="leader">Leader</SelectItem>
                                            <SelectItem value="pastor">Pastor</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {member.user_id !== user?.id && (
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)} disabled={loading}>
                                            <Trash2 className="h-4 w-4 text-red-400" />
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
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/20">
                                <Mail className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg text-slate-50">Pending Invitations</CardTitle>
                                <CardDescription className="text-slate-400">{invitations.length} invitation{invitations.length !== 1 ? 's' : ''} waiting for response</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {invitations.map((invitation) => (
                                <div key={invitation.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                            <Mail className="h-5 w-5 text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-50">{invitation.email || invitation.phone_number}</p>
                                            <p className="text-sm text-slate-400">Invited as {invitation.role} • {invitation.invite_method}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-amber-400 border-amber-400/30">Pending</Badge>
                                        <Button variant="ghost" size="icon" onClick={() => handleResendInvitation(invitation)} disabled={loading}>
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleRevokeInvitation(invitation.id)} disabled={loading}>
                                            <Trash2 className="h-4 w-4 text-red-400" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Escalation Contacts */}
            <Card className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/20">
                            <ShieldAlert className="h-5 w-5 text-red-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-slate-50">Escalation Contacts</CardTitle>
                            <CardDescription className="text-slate-400">
                                Choose who gets notified when a call detects a crisis, prayer request, or pastoral care need.
                                Only members with Admin or Pastor roles are eligible.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {escalationEligibleMembers.length === 0 ? (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                            <p className="text-sm text-amber-300">
                                No team members with Admin or Pastor role. Assign the Pastor or Admin role above to enable escalation notifications.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {escalationEligibleMembers.map((member) => {
                                const prefs = notifPrefs[member.user_id] || { escalation_sms: true, escalation_email: true };
                                return (
                                    <div key={member.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-medium">
                                                {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-50">{member.profiles?.full_name || 'Unknown'}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-sm text-slate-400">{member.profiles?.email}</p>
                                                    <Badge variant={getRoleBadgeVariant(member.role) as any} className="text-[10px] px-1.5 py-0">
                                                        {member.role}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-slate-400" />
                                                <Label className="text-xs text-slate-400 hidden sm:inline">Email</Label>
                                                <Switch
                                                    checked={prefs.escalation_email}
                                                    onCheckedChange={(v) => handleToggleNotifPref(member.user_id, 'escalation_email', v)}
                                                    disabled={savingNotif === member.user_id + 'escalation_email'}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-slate-400" />
                                                <Label className="text-xs text-slate-400 hidden sm:inline">SMS</Label>
                                                <Switch
                                                    checked={prefs.escalation_sms}
                                                    onCheckedChange={(v) => handleToggleNotifPref(member.user_id, 'escalation_sms', v)}
                                                    disabled={savingNotif === member.user_id + 'escalation_sms'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <p className="text-xs text-slate-500 mt-2">
                                To add more contacts, change a team member's role to Admin or Pastor above.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}