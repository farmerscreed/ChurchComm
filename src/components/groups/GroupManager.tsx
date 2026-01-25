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
  'from-blue-500 to-indigo-600',
  'from-green-500 to-emerald-600',
  'from-purple-500 to-violet-600',
  'from-pink-500 to-rose-600',
  'from-orange-500 to-amber-600',
  'from-teal-500 to-cyan-600',
  'from-red-500 to-pink-600',
  'from-indigo-500 to-purple-600',
];

function getGroupColor(name: string): string {
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading groups...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground mt-1">Organize your congregation into groups for targeted communication</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., Youth Ministry, First Timers"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="A brief description of this group's purpose"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateGroup} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <UsersRound className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-2xl font-bold">{groups.length}</p>
              <p className="text-xs text-muted-foreground">Total Groups</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{totalMembers}</p>
              <p className="text-xs text-muted-foreground">Total Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-700 dark:text-green-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {groups.length > 0 ? Math.round(totalMembers / groups.length) : 0}
              </p>
              <p className="text-xs text-muted-foreground">Avg per Group</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {groups.length > 0 && (
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UsersRound className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
              Create groups to organize your congregation for targeted communication campaigns.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No groups found matching "{searchQuery}"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const colorGradient = getGroupColor(group.name);
            const initials = getGroupInitials(group.name);

            return (
              <Card key={group.id} className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 overflow-hidden">
                {/* Colored Header */}
                <div className={`h-2 bg-gradient-to-r ${colorGradient}`} />

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${colorGradient} flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                        {initials}
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">{group.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{group.name}" and remove all members from it. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteGroup(group.id)} className="bg-red-600 hover:bg-red-700">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>

                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {group.description || 'No description provided.'}
                  </p>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button variant="secondary" className="w-full" onClick={() => openAddMembersDialog(group)}>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Manage Members - {addMembersGroup?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-4">
            {/* Current Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Current Members</h4>
                <Badge variant="secondary">{existingMembers.length}</Badge>
              </div>
              <div className="max-h-[180px] overflow-y-auto space-y-2 pr-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : existingMembers.length > 0 ? (
                  existingMembers.map(member => (
                    <div key={member.person_id} className="flex items-center justify-between bg-muted/50 p-2.5 rounded-lg">
                      <span className="text-sm">{member.full_name}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveMember(member.person_id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No members in this group yet.</p>
                )}
              </div>
            </div>

            {/* Add New Members */}
            <div className="space-y-3">
              <h4 className="font-medium">Add New Members</h4>
              <div className="min-h-[44px] border rounded-lg p-2 flex flex-wrap gap-2">
                {selectedPeople.length > 0 ? (
                  selectedPeople.map(person => (
                    <Badge key={person.id} variant="secondary" className="flex items-center gap-1.5 pr-1">
                      {person.full_name}
                      <button
                        onClick={() => setSelectedPeople(selectedPeople.filter(p => p.id !== person.id))}
                        className="hover:bg-muted rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground px-1">Select people from the list below</span>
                )}
              </div>
            </div>

            {/* People Picker */}
            <Command className="border rounded-lg">
              <CommandInput placeholder="Search people to add..." />
              <CommandList className="max-h-[180px]">
                <CommandEmpty>No people found.</CommandEmpty>
                <CommandGroup>
                  {availablePeople.map((person) => (
                    <CommandItem
                      key={person.id}
                      onSelect={() => setSelectedPeople([...selectedPeople, person])}
                      className="cursor-pointer"
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
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddMembers} disabled={isLoading || selectedPeople.length === 0}>
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
