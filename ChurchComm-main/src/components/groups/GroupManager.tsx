import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Plus, Users, UserPlus, Trash2, X, Pencil } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
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
} from "@/components/ui/alert-dialog"

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

export function GroupManager() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });

  // Edit group state
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editGroupData, setEditGroupData] = useState({ name: '', description: '' });

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
      .eq('organization_id', currentOrganization.id);

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
      await fetchGroups(); // Refresh count on main card
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

  const openEditDialog = (group: Group) => {
    setEditingGroup(group);
    setEditGroupData({ name: group.name, description: group.description || '' });
  };

  const handleEditGroup = async () => {
    if (!editingGroup || !editGroupData.name.trim()) {
      toast({ title: 'Error', description: 'Group name is required.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase
      .from('groups')
      .update({ name: editGroupData.name, description: editGroupData.description })
      .eq('id', editingGroup.id);

    if (error) {
      toast({ title: 'Error updating group', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Group updated successfully.' });
      setGroups(groups.map(g =>
        g.id === editingGroup.id
          ? { ...g, name: editGroupData.name, description: editGroupData.description }
          : g
      ));
      setEditingGroup(null);
    }
    setIsLoading(false);
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
      await fetchGroups(); // Refresh member counts
      // Add new members to the dialog's list
      const newlyAddedMembers = selectedPeople.map(p => ({ person_id: p.id, full_name: p.full_name }));
      setExistingMembers([...existingMembers, ...newlyAddedMembers]);
      setSelectedPeople([]);
    }
    setIsLoading(false);
  };

  const availablePeople = useMemo(() => {
    // Exclude people who are already selected OR already in the group
    const existingMemberIds = new Set(existingMembers.map(m => m.person_id));
    return people.filter(p => !selectedPeople.some(sp => sp.id === p.id) && !existingMemberIds.has(p.id));
  }, [people, selectedPeople, existingMembers]);

  if (isLoading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Groups</h2>
          <p className="text-muted-foreground mt-1">Organize your members into groups</p>
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
                  placeholder="e.g., 'First Timers' or 'Youth Ministry'"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="A brief summary of the group's purpose"
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

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create your first group to organize your members
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="font-semibold">{group.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => openEditDialog(group)}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the "{group.name}" group. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardTitle>
                <p className="text-sm text-muted-foreground pt-1">{group.description || 'No description.'}</p>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-sm text-muted-foreground flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{group.member_count} members</span>
                </div>
              </CardContent>
              <CardFooter>
                  <Button variant="secondary" className="w-full flex-col sm:flex-row h-auto sm:h-10" onClick={() => openAddMembersDialog(group)}>
                    <UserPlus className="h-4 w-4 mb-1 sm:mb-0 sm:mr-2" />
                    <span>Add / View Members</span>
                  </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Members Dialog */}
      <Dialog open={!!addMembersGroup} onOpenChange={() => { setAddMembersGroup(null); setSelectedPeople([]); setExistingMembers([]) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Manage Members for {addMembersGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">

            {/* Existing Members List */}
            <div className="space-y-2">
                <h4 className="font-medium">Current Members ({existingMembers.length})</h4>
                 <div className="max-h-[150px] md:max-h-[200px] overflow-y-auto space-y-2 pr-2">
                    {isLoading ? <p>Loading members...</p> :
                     existingMembers.length > 0 ? existingMembers.map(member => (
                        <div key={member.person_id} className="flex items-center justify-between bg-muted p-2 rounded-md">
                           <span className="text-sm">{member.full_name}</span>
                           <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleRemoveMember(member.person_id)}>
                               <Trash2 className="h-4 w-4 text-red-500" />
                           </Button>
                        </div>
                    )) : <p className="text-sm text-muted-foreground">No members in this group yet.</p>}
                </div>
            </div>

            {/* Add New Members */}
            <div className="space-y-2">
                <h4 className="font-medium">Add New Members</h4>
                {/* Selected People Badges */}
                <div className="min-h-[40px] border rounded-md p-2 flex flex-wrap gap-2">
                    {selectedPeople.length > 0 ? selectedPeople.map(person => (
                        <Badge key={person.id} variant="secondary" className="flex items-center gap-1">
                            {person.full_name}
                            <button onClick={() => setSelectedPeople(selectedPeople.filter(p => p.id !== person.id))}>
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )) : <span className="text-sm text-muted-foreground">Select people from the list below</span>}
                </div>
            </div>

            {/* Searchable Member List */}
            <Command>
                <CommandInput placeholder="Search for people to add..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                        {availablePeople.map((person) => (
                            <CommandItem
                                key={person.id}
                                onSelect={() => {
                                    setSelectedPeople([...selectedPeople, person]);
                                }}
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
                {isLoading ? 'Adding...' : `Add ${selectedPeople.length} Members`}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Group Name</Label>
              <Input
                id="edit-name"
                value={editGroupData.name}
                onChange={(e) => setEditGroupData({ ...editGroupData, name: e.target.value })}
                placeholder="e.g., 'First Timers' or 'Youth Ministry'"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={editGroupData.description}
                onChange={(e) => setEditGroupData({ ...editGroupData, description: e.target.value })}
                placeholder="A brief summary of the group's purpose"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditGroup} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
