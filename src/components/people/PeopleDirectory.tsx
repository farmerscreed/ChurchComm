import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Mail, Phone, Search, UserPlus, Users, UserCheck, UserX, Baby, Sparkles, Calendar } from 'lucide-react';
import { PersonDialog } from './PersonDialog';

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
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

export const PeopleDirectory: React.FC<PeopleDirectoryProps> = ({ onRefresh }) => {
  const { currentOrganization } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

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
    children: people?.filter(p => p.member_status === 'child').length || 0,
  };

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setDialogOpen(true);
  };

  const handleAddPerson = () => {
    setSelectedPerson(null);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
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
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <Users className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total People</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-green-700 dark:text-green-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.members}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.visitors}</p>
              <p className="text-xs text-muted-foreground">Visitors</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
              <Baby className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.children}</p>
              <p className="text-xs text-muted-foreground">Children</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="member">Members</SelectItem>
              <SelectItem value="visitor">Visitors</SelectItem>
              <SelectItem value="first_time_visitor">First Time Visitors</SelectItem>
              <SelectItem value="prospect">Prospects</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="child">Children</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddPerson} className="whitespace-nowrap">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Person
          </Button>
        </div>
      </div>

      {/* People Grid */}
      {!people || people.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {search || statusFilter !== 'all' ? 'No people found' : 'Your directory is empty'}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Start building your congregation directory by adding your first person.'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button onClick={handleAddPerson}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Person
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {people.map((person) => {
            const config = STATUS_CONFIG[person.member_status] || STATUS_CONFIG.visitor;
            const initials = getInitials(person.first_name, person.last_name);
            const avatarColor = getAvatarColor(`${person.first_name}${person.last_name}`);

            return (
              <Card
                key={person.id}
                className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 cursor-pointer hover:border-primary/50 overflow-hidden"
                onClick={() => handlePersonClick(person)}
              >
                <CardContent className="p-0">
                  {/* Header with Avatar */}
                  <div className="p-4 flex items-start gap-3">
                    <div className={`h-12 w-12 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 shadow-sm`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                          {person.first_name} {person.last_name}
                        </h3>
                        <Badge className={`${config.bgColor} ${config.color} border-0 text-[10px] uppercase tracking-wide font-medium shrink-0`}>
                          {person.member_status.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Tags */}
                      {person.tags && person.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {person.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {person.tags.length > 2 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{person.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="px-4 pb-4 space-y-2">
                    {person.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate text-xs">{person.email}</span>
                      </div>
                    )}
                    {person.phone_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs">{person.phone_number}</span>
                      </div>
                    )}
                    {person.birthday && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs">{new Date(person.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                    {!person.email && !person.phone_number && (
                      <p className="text-xs text-muted-foreground italic">No contact info</p>
                    )}
                  </div>
                </CardContent>
              </Card>
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
    </div>
  );
};
