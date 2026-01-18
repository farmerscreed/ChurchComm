import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Loader2, ChevronsRight, User, Users, MessageSquare } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Note {
    timestamp: string;
    content: string;
    type: 'system' | 'user';
    user_name?: string;
}

interface FollowUp {
  id: string;
  status: 'new' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  assigned_to: string | null;
  notes: Note[] | null;
  person: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    stage: string | null;
  } | null;
  assignee: {
      full_name: string | null;
  } | null;
}

interface OrganizationMember {
    user_id: string;
    profiles: {
        full_name: string | null;
    } | null;
}

const getPriorityClass = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'border-red-500 bg-red-500/5';
    case 'high': return 'border-amber-500 bg-amber-500/5';
    case 'medium': return 'border-blue-500 bg-blue-500/5';
    default: return 'border-gray-500 bg-gray-500/5';
  }
};

const getInitials = (name?: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
};

const FollowUpCard = ({ item, onUpdateStatus, members, onAssign, onOpenNotes }: { item: FollowUp; onUpdateStatus: (id: string, newStatus: FollowUp['status']) => void; members: OrganizationMember[]; onAssign: (id: string, userId: string) => void; onOpenNotes: (item: FollowUp) => void; }) => {
    const nextStatus = item.status === 'new' ? 'in_progress' : 'completed';
    const noteCount = item.notes?.length || 0;
    
    return (
        <Card className={`mb-4 ${getPriorityClass(item.priority)}`}>
            <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(item.person?.first_name)}</AvatarFallback></Avatar>
                        <div>
                            <p className="font-semibold">{item.person?.first_name} {item.person?.last_name}</p>
                            <p className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
                        </div>
                    </div>
                    {item.priority === 'urgent' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{item.person?.stage || 'Prospect'}</Badge>
                    <Badge variant="outline">{item.priority}</Badge>
                    <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => onOpenNotes(item)}>
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {noteCount} {noteCount === 1 ? 'Note' : 'Notes'}
                    </Button>
                </div>
                
                <div className="flex items-center gap-2">
                     <Avatar className="h-8 w-8"><AvatarFallback>{item.assignee ? getInitials(item.assignee.full_name) : <User className="h-4 w-4" />}</AvatarFallback></Avatar>
                    <Select value={item.assigned_to || ''} onValueChange={(value) => onAssign(item.id, value)}><SelectTrigger className="w-full"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {members.map(member => (
                                <SelectItem key={member.user_id} value={member.user_id}>{member.profiles?.full_name || 'Unknown User'}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {item.status !== 'completed' && (
                     <Button size="sm" className="w-full" onClick={() => onUpdateStatus(item.id, nextStatus)}>
                        Move to {nextStatus.replace('_', ' ')} <ChevronsRight className="h-4 w-4 ml-2" />
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};


export default function FollowUpsPage() {
    const { user, currentOrganization } = useAuthStore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
    const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
    const [newNote, setNewNote] = useState('');

    const loadData = async () => {
        if (!currentOrganization) return;
        setLoading(true);
        try {
            const [followUpsRes, membersRes] = await Promise.all([
                supabase.from('follow_ups').select(`*, person:person_id(*), assignee:assigned_to(full_name)`).eq('organization_id', currentOrganization.id).order('created_at', { ascending: false }),
                supabase.from('organization_members').select('user_id, profiles(full_name)').eq('organization_id', currentOrganization.id)
            ]);
            if (followUpsRes.error) throw followUpsRes.error;
            if (membersRes.error) throw membersRes.error;
            setFollowUps(followUpsRes.data as FollowUp[]);
            setMembers(membersRes.data as unknown as OrganizationMember[]);
        } catch (error: any) {
            toast({ title: "Error", description: "Could not load data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => { loadData(); }, [currentOrganization]);

    const handleUpdateStatus = async (id: string, newStatus: FollowUp['status']) => {
        // Optimistic update
        setFollowUps(prev => prev.map(f => f.id === id ? {...f, status: newStatus} : f));

        const { error } = await supabase
            .from('follow_ups')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
            loadData(); // Revert optimistic update
        } else {
            toast({ title: "Success", description: `Moved to ${newStatus.replace('_', ' ')}.` });
        }
    };

    const handleAssignFollowUp = async (id: string, userId: string) => {
        const assignedTo = userId === 'unassigned' ? null : userId;

        // Find the assignee name for optimistic update
        const assignee = members.find(m => m.user_id === userId);

        // Optimistic update
        setFollowUps(prev => prev.map(f => f.id === id ? {
            ...f,
            assigned_to: assignedTo,
            assignee: assignee ? { full_name: assignee.profiles?.full_name || null } : null
        } : f));

        const { error } = await supabase
            .from('follow_ups')
            .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            toast({ title: "Error", description: "Could not assign follow-up.", variant: "destructive" });
            loadData(); // Revert optimistic update
        } else {
            toast({ title: "Success", description: assignedTo ? "Follow-up assigned." : "Follow-up unassigned." });
        }
    };

    const handleOpenNotes = (item: FollowUp) => {
        setSelectedFollowUp(item);
        setIsNotesDialogOpen(true);
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !selectedFollowUp) return;

        const newNoteObject: Note = {
            content: newNote,
            timestamp: new Date().toISOString(),
            type: 'user',
            user_name: user?.user_metadata.full_name || 'User'
        };
        
        const updatedNotes = [...(selectedFollowUp.notes || []), newNoteObject];
        
        // Optimistic update
        setFollowUps(prev => prev.map(f => f.id === selectedFollowUp.id ? {...f, notes: updatedNotes} : f));
        setSelectedFollowUp(prev => prev ? {...prev, notes: updatedNotes} : null);
        setNewNote('');

        const { error } = await supabase.from('follow_ups').update({ notes: updatedNotes }).eq('id', selectedFollowUp.id);

        if (error) {
            toast({ title: "Error", description: "Could not save note.", variant: "destructive" });
            loadData(); // Revert optimistic update by refetching
        } else {
            toast({ title: "Success", description: "Note added." });
        }
    };

    const columns: { title: string; status: FollowUp['status'] }[] = [
        { title: 'New', status: 'new' },
        { title: 'In Progress', status: 'in_progress' },
        { title: 'Completed', status: 'completed' },
    ];

    if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Follow-up Pipeline</h1>
                    <p className="text-muted-foreground mt-1">Manage and track follow-up tasks for your community.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {columns.map(col => (
                        <div key={col.status}>
                            <h2 className="text-lg font-semibold mb-4 capitalize">{col.title} ({followUps.filter(f => f.status === col.status).length})</h2>
                            <Card className="bg-muted/30"><CardContent className="p-4 h-[70vh] overflow-y-auto">
                                {followUps.filter(f => f.status === col.status).length === 0 ? (
                                    <div className="flex justify-center items-center h-full"><p className="text-muted-foreground">No tasks here.</p></div>
                                ) : (
                                    followUps.filter(f => f.status === col.status).map(item => (
                                        <FollowUpCard key={item.id} item={item} onUpdateStatus={handleUpdateStatus} members={members} onAssign={handleAssignFollowUp} onOpenNotes={handleOpenNotes} />
                                    ))
                                )}
                            </CardContent></Card>
                        </div>
                    ))}
                </div>
            </div>

            <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Notes for {selectedFollowUp?.person?.first_name} {selectedFollowUp?.person?.last_name}</DialogTitle>
                        <DialogDescription>View and add notes for this follow-up task.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="max-h-64 overflow-y-auto pr-4 space-y-4">
                            {selectedFollowUp?.notes && selectedFollowUp.notes.length > 0 ? (
                                selectedFollowUp.notes.map((note, index) => (
                                    <div key={index} className="text-sm">
                                        <p className="whitespace-pre-wrap">{note.content}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {note.type === 'system' ? 'System' : (note.user_name || 'User')} • {formatDistanceToNow(parseISO(note.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No notes yet.</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-note">Add a new note</Label>
                            <Textarea id="new-note" value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>Close</Button>
                        <Button onClick={handleAddNote} disabled={!newNote.trim()}>Save Note</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}