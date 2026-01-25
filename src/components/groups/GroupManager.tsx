import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Users, UserPlus, Trash2, X, UsersRound, Search, Loader2 } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string;
  member_count: number;
}

interface Person {
  id: string;
  full_name: string;
}

interface GroupMember {
  person_id: string;
  full_name: string;
}

const GROUP_COLORS = [
  { gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/30' },
  { gradient: 'from-green-500 to-emerald-600', shadow: 'shadow-green-500/30' },
  { gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/30' },
  { gradient: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-500/30' },
  { gradient: 'from-orange-500 to-amber-600', shadow: 'shadow-orange-500/30' },
  { gradient: 'from-teal-500 to-cyan-600', shadow: 'shadow-teal-500/30' },
  { gradient: 'from-red-500 to-pink-600', shadow: 'shadow-red-500/30' },
  { gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/30' },
];

function getGroupColor(name: string): { gradient: string; shadow: string } {
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % GROUP_COLORS.length;
  return GROUP_COLORS[index];
}

function getGroupInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function GroupManager() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });

  const [addMembersGroup, setAddMembersGroup] = useState<Group | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);
  const [existingMembers, setExistingMembers] = useState<GroupMember[]>([]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    await Promise.all([fetchGroups(), fetchPeople()]);
    setIsLoading(false);
  };

  const fetchGroups = async () => {
    if (!currentOrganization?.id) return;
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, description, group_members(count)')
      .eq('organization_id', currentOrganization.id)
      .order('name', { ascending: true });

    if (!error && data) {
      setGroups(data.map(group => ({
        ...group,
        member_count: (group as any).group_members[0]?.count || 0,
      })));
    }
  };

  const fetchPeople = async () => {
    if (!currentOrganization?.id) return;
    const { data, error } = await supabase
      .from('people')
      .select('id, first_name, last_name')
      .eq('organization_id', currentOrganization.id)
      .order('last_name', { ascending: true });

    if (!error && data) {
      setPeople(data.map(p => ({ id: p.id, full_name: `${p.first_name} ${p.last_name}` })));
    }
  };

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchInitialData();
    }
  }, [currentOrganization]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [groups, searchQuery]);

  const totalMembers = groups.reduce((acc, g) => acc + g.member_count, 0);

  const openAddMembersDialog = async (group: Group) => {
    setAddMembersGroup(group);
    setIsLoading(true);
    const { data, error } = await supabase
      .from('group_members')
      .select('person_id, people(first_name, last_name)')
      .eq('group_id', group.id);

    if (error) {
      toast({ title: "Error fetching members", description: error.message, variant: "destructive" });
      setExistingMembers([]);
    } else {
      setExistingMembers(data.map((m: any) => ({
        person_id: m.person_id,
        full_name: `${m.people.first_name} ${m.people.last_name}`
      })));
    }
    setIsLoading(false);
  };

  const handleRemoveMember = async (personId: string) => {
    if (!addMembersGroup) return;
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', addMembersGroup.id)
      .eq('person_id', personId);

    if (error) {
      toast({ title: "Error removing member", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Member removed." });
      setExistingMembers(existingMembers.filter(m => m.person_id !== personId));
      await fetchGroups();
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name || !currentOrganization?.id) {
      toast({ title: 'Error', description: 'Group name is required.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('groups')
      .insert({ name: newGroup.name, description: newGroup.description, organization_id: currentOrganization.id })
      .select('*, group_members(count)')
      .single();

    if (error) {
      toast({ title: 'Error creating group', description: error.message, variant: 'destructive' });
    } else if (data) {
      toast({ title: 'Success', description: 'Group created successfully.' });
      setGroups([...groups, { ...data, member_count: 0 }]);
      setNewGroup({ name: '', description: '' });
      setIsCreateDialogOpen(false);
    }
    setIsLoading(false);
  };

  const handleDeleteGroup = async (groupId: string) => {
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) {
      toast({ title: "Error deleting group", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Group deleted successfully." });
      setGroups(groups.filter(g => g.id !== groupId));
    }
  };

  const handleAddMembers = async () => {
    if (!addMembersGroup || selectedPeople.length === 0) return;

    setIsLoading(true);
    const newMembers = selectedPeople.map(p => ({
      group_id: addMembersGroup.id,
      person_id: p.id,
    }));

    const { error } = await supabase.from('group_members').insert(newMembers);

    if (error) {
      toast({ title: 'Error adding members', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Members added successfully.' });
      await fetchGroups();
      const newlyAddedMembers = selectedPeople.map(p => ({ person_id: p.id, full_name: p.full_name }));
      setExistingMembers([...existingMembers, ...newlyAddedMembers]);
      setSelectedPeople([]);
    }
    setIsLoading(false);
  };

  const availablePeople = useMemo(() => {
    const existingMemberIds = new Set(existingMembers.map(m => m.person_id));
    return people.filter(p => !selectedPeople.some(sp => sp.id === p.id) && !existingMemberIds.has(p.id));
  }, [people, selectedPeople, existingMembers]);

  if (isLoading && groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        <p className="text-sm text-slate-400">Loading groups...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-50">Groups</h1>
          <p className="text-slate-400 mt-1">Organize your congregation into groups for targeted communication</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-slate-50">Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Group Name</Label>
                <Input
                  id="name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., Youth Ministry, First Timers"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="A brief description of this group's purpose"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateGroup} disabled={isLoading} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white">
                {isLoading ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <UsersRound className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-50">{groups.length}</p>
              <p className="text-xs text-slate-400">Total Groups</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-50">{totalMembers}</p>
              <p className="text-xs text-slate-400">Total Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-50">
                {groups.length > 0 ? Math.round(totalMembers / groups.length) : 0}
              </p>
              <p className="text-xs text-slate-400">Avg per Group</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {groups.length > 0 && (
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
      )}

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <Card className="bg-white/5 border border-white/10 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
              <UsersRound className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-slate-50">No groups yet</h3>
            <p className="text-sm text-slate-400 text-center mb-4 max-w-sm">
              Create groups to organize your congregation for targeted communication campaigns.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card className="bg-white/5 border border-white/10">
          <CardContent className="py-8 text-center">
            <p className="text-slate-400">No groups found matching "{searchQuery}"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const colorData = getGroupColor(group.name);
            const initials = getGroupInitials(group.name);

            return (
              <Card key={group.id} className="group bg-white/5 border border-white/10 rounded-xl hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 overflow-hidden">
                {/* Colored Header */}
                <div className={`h-2 bg-gradient-to-r ${colorData.gradient} shadow-lg shadow-${colorData.gradient.split('-')[1]}-500/20`} />

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${colorData.gradient} flex items-center justify-center text-white font-semibold text-sm shadow-lg ${colorData.shadow}`}>
                        {initials}
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-50">{group.name}</CardTitle>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-white/10">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-slate-50">Delete Group?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            This will permanently delete "{group.name}" and remove all members from it. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/10 hover:bg-white/20 text-white border-white/10">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteGroup(group.id)} className="bg-red-600 hover:bg-red-700 text-white">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>

                <CardContent className="pb-3">
                  <p className="text-sm text-slate-400 line-clamp-2 min-h-[40px]">
                    {group.description || 'No description provided.'}
                  </p>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button variant="secondary" className="w-full bg-white/10 hover:bg-white/20 text-white border-0" onClick={() => openAddMembersDialog(group)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Manage Members
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Members Dialog */}
      <Dialog open={!!addMembersGroup} onOpenChange={() => { setAddMembersGroup(null); setSelectedPeople([]); setExistingMembers([]); }}>
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl text-slate-50">
              Manage Members - {addMembersGroup?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-4">
            {/* Current Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-50">Current Members</h4>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">{existingMembers.length}</Badge>
              </div>
              <div className="max-h-[180px] overflow-y-auto space-y-2 pr-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                  </div>
                ) : existingMembers.length > 0 ? (
                  existingMembers.map(member => (
                    <div key={member.person_id} className="flex items-center justify-between bg-white/5 border border-white/10 p-2.5 rounded-lg">
                      <span className="text-sm text-slate-50">{member.full_name}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleRemoveMember(member.person_id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">No members in this group yet.</p>
                )}
              </div>
            </div>

            {/* Add New Members */}
            <div className="space-y-3">
              <h4 className="font-medium text-slate-50">Add New Members</h4>
              <div className="min-h-[44px] border border-white/10 rounded-lg p-2 flex flex-wrap gap-2 bg-white/5">
                {selectedPeople.length > 0 ? (
                  selectedPeople.map(person => (
                    <Badge key={person.id} variant="secondary" className="flex items-center gap-1.5 pr-1 bg-purple-500/20 text-purple-400">
                      {person.full_name}
                      <button
                        onClick={() => setSelectedPeople(selectedPeople.filter(p => p.id !== person.id))}
                        className="hover:bg-purple-500/30 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-slate-500 px-1">Select people from the list below</span>
                )}
              </div>
            </div>

            {/* People Picker */}
            <Command className="border border-white/10 rounded-lg bg-slate-900">
              <CommandInput placeholder="Search people to add..." className="text-white placeholder:text-slate-500" />
              <CommandList className="max-h-[180px]">
                <CommandEmpty className="text-slate-400">No people found.</CommandEmpty>
                <CommandGroup>
                  {availablePeople.map((person) => (
                    <CommandItem
                      key={person.id}
                      onSelect={() => setSelectedPeople([...selectedPeople, person])}
                      className="cursor-pointer text-slate-50 hover:bg-white/10"
                    >
                      {person.full_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="bg-white/10 hover:bg-white/20 text-white">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddMembers} disabled={isLoading || selectedPeople.length === 0} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${selectedPeople.length} Member${selectedPeople.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
