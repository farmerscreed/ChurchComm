import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Mail, Phone, Search, UserPlus, Users, UserCheck, UserX, Baby, Sparkles, Calendar, Brain, LayoutGrid, LayoutList, MessageSquare, Crown } from 'lucide-react';
import { PersonDialog } from './PersonDialog';
import { MemberProfilePanel } from './MemberProfilePanel';

interface Person {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  address: any | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  member_status: string;
  tags: string[] | null;
  birthday: string | null;
  is_demo?: boolean;
}

interface PeopleDirectoryProps {
  onRefresh?: () => void;
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: typeof Users }> = {
  member: { color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/40', icon: UserCheck },
  visitor: { color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/40', icon: Users },
  prospect: { color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40', icon: Sparkles },
  inactive: { color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800', icon: UserX },
  child: { color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/40', icon: Baby },
  first_time_visitor: { color: 'text-pink-700 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/40', icon: Sparkles },
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-gradient-to-br from-blue-500 to-cyan-500',
    'bg-gradient-to-br from-green-500 to-emerald-500',
    'bg-gradient-to-br from-purple-500 to-pink-500',
    'bg-gradient-to-br from-pink-500 to-rose-500',
    'bg-gradient-to-br from-indigo-500 to-purple-500',
    'bg-gradient-to-br from-teal-500 to-cyan-500',
    'bg-gradient-to-br from-orange-500 to-amber-500',
    'bg-gradient-to-br from-cyan-500 to-blue-500'
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

export const PeopleDirectory: React.FC<PeopleDirectoryProps> = ({ onRefresh }) => {
  const { currentOrganization } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const { data: people, isLoading, error, refetch } = useQuery({
    queryKey: ['people', currentOrganization?.id, search, statusFilter],
    queryFn: async (): Promise<Person[]> => {
      if (!currentOrganization?.id) return [];

      let query = supabase
        .from('people')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('member_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Person[];
    },
    enabled: !!currentOrganization?.id,
  });

  const stats = {
    total: people?.length || 0,
    members: people?.filter(p => p.member_status === 'member').length || 0,
    visitors: people?.filter(p => p.member_status === 'visitor' || p.member_status === 'first_time_visitor').length || 0,
    leaders: people?.filter(p => p.tags?.includes('leader') || p.tags?.includes('Leader')).length || 0,
  };

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setProfilePanelOpen(true);
  };

  const handleAddPerson = () => {
    setSelectedPerson(null);
    setDialogOpen(true);
  };

  const handleEditFromPanel = () => {
    setProfilePanelOpen(false);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setSelectedPerson(null);
  };

  const handleProfilePanelClose = (open: boolean) => {
    setProfilePanelOpen(open);
    if (!open) setSelectedPerson(null);
  };

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Failed to load people. Please try again.</p>
          <Button variant="outline" onClick={handleRefresh}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row - Modern Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total People */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.total}</p>
          <p className="text-xs text-slate-400">Total People</p>
        </div>

        {/* Members */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.members}</p>
          <p className="text-xs text-slate-400">Members</p>
        </div>

        {/* Visitors */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.visitors}</p>
          <p className="text-xs text-slate-400">Visitors</p>
        </div>

        {/* Leaders */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Crown className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.leaders}</p>
          <p className="text-xs text-slate-400">Leaders</p>
        </div>
      </div>

      {/* Search and Filter Bar - Modern Design */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
          {/* Filter Pills */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter('all')}
              className={`rounded-full ${statusFilter === 'all' ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter('member')}
              className={`rounded-full ${statusFilter === 'member' ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              Members
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter('visitor')}
              className={`rounded-full ${statusFilter === 'visitor' ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              Visitors
            </Button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              className={`h-8 w-8 p-0 rounded-full ${viewMode === 'table' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'text-slate-400'}`}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-8 w-8 p-0 rounded-full ${viewMode === 'grid' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'text-slate-400'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={handleAddPerson}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Person
          </Button>
        </div>
      </div>

      {/* People Display - Table or Grid */}
      {!people || people.length === 0 ? (
        <Card className="border-dashed bg-white/5 border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">
              {search || statusFilter !== 'all' ? 'No people found' : 'Your directory is empty'}
            </h3>
            <p className="text-sm text-slate-400 text-center mb-4 max-w-sm">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Start building your congregation directory by adding your first person.'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button onClick={handleAddPerson} className="bg-gradient-to-r from-purple-600 to-blue-600">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Person
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Groups</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {people.map((person) => {
                  const config = STATUS_CONFIG[person.member_status] || STATUS_CONFIG.visitor;
                  const initials = getInitials(person.first_name, person.last_name);
                  const avatarColor = getAvatarColor(`${person.first_name}${person.last_name}`);

                  return (
                    <tr
                      key={person.id}
                      onClick={() => handlePersonClick(person)}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-sm font-medium text-white`}>
                              {initials}
                            </div>
                            {/* AI Memory indicator */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-purple-500 border-2 border-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Brain className="h-2.5 w-2.5 text-white" />
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-white">{person.first_name} {person.last_name}</p>
                            <p className="text-xs text-slate-500">{person.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={`text-xs border-0 ${
                            person.member_status === 'member' ? 'bg-green-500/20 text-green-400' :
                            person.member_status === 'visitor' || person.member_status === 'first_time_visitor' ? 'bg-cyan-500/20 text-cyan-400' :
                            person.member_status === 'child' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {person.member_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {person.tags && person.tags.length > 0 ? (
                            person.tags.slice(0, 2).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-white/10 text-slate-400">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-slate-600">No groups</span>
                          )}
                          {person.tags && person.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs border-white/10 text-slate-400">
                              +{person.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {person.phone_number && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Phone className="h-3 w-3" />
                              {person.phone_number}
                            </div>
                          )}
                          {person.birthday && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Calendar className="h-3 w-3" />
                              {new Date(person.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePersonClick(person);
                            }}
                            className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePersonClick(person);
                            }}
                            className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {people.map((person) => {
            const config = STATUS_CONFIG[person.member_status] || STATUS_CONFIG.visitor;
            const initials = getInitials(person.first_name, person.last_name);
            const avatarColor = getAvatarColor(`${person.first_name}${person.last_name}`);

            return (
              <div
                key={person.id}
                onClick={() => handlePersonClick(person)}
                className="group p-5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="relative">
                    <div className={`h-12 w-12 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 shadow-sm`}>
                      {initials}
                    </div>
                    {/* AI Memory indicator */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-500 border-2 border-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Brain className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold truncate text-white group-hover:text-purple-300 transition-colors">
                        {person.first_name} {person.last_name}
                      </h3>
                      <Badge
                        className={`border-0 text-[10px] uppercase tracking-wide font-medium shrink-0 ${
                          person.member_status === 'member' ? 'bg-green-500/20 text-green-400' :
                          person.member_status === 'visitor' || person.member_status === 'first_time_visitor' ? 'bg-cyan-500/20 text-cyan-400' :
                          person.member_status === 'child' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {person.member_status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Tags */}
                    {person.tags && person.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {person.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-slate-400">
                            {tag}
                          </Badge>
                        ))}
                        {person.tags.length > 2 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-slate-400">
                            +{person.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  {person.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate text-xs">{person.email}</span>
                    </div>
                  )}
                  {person.phone_number && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs">{person.phone_number}</span>
                    </div>
                  )}
                  {person.birthday && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs">{new Date(person.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                  {!person.email && !person.phone_number && (
                    <p className="text-xs text-slate-500 italic">No contact info</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PersonDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        person={selectedPerson}
        onSuccess={handleRefresh}
      />

      <MemberProfilePanel
        open={profilePanelOpen}
        onOpenChange={handleProfilePanelClose}
        person={selectedPerson}
        onEditClick={handleEditFromPanel}
      />
    </div>
  );
};
