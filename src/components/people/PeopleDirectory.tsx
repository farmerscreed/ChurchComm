import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Mail, Phone, Search, UserPlus } from 'lucide-react';
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
}

interface PeopleDirectoryProps {
  onRefresh?: () => void;
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
      if (!currentOrganization?.id) {
        return [];
      }

      let query = supabase
        .from('people')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      // Search filter
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('member_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Person[];
    },
    enabled: !!currentOrganization?.id,
  });

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
    if (!open) {
      setSelectedPerson(null);
    }
  };

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'member': return 'bg-green-100 text-green-800';
      case 'visitor': return 'bg-blue-100 text-blue-800';
      case 'prospect': return 'bg-purple-100 text-purple-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'child': return 'bg-yellow-100 text-yellow-800';
      case 'first_time_visitor': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="h-10 bg-muted rounded w-64 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-40 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded mb-1 w-2/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
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
          <Button
            variant="outline"
            onClick={handleRefresh}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
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
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== 'all'
                ? 'No people found matching your filters.'
                : 'No people in your directory yet. Add someone to get started!'}
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
          {people.map((person) => (
            <Card
              key={person.id}
              className="hover:shadow-md hover:shadow-primary/20 transition-all duration-200 cursor-pointer hover:border-primary/50"
              onClick={() => handlePersonClick(person)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="truncate">{person.first_name} {person.last_name}</span>
                  <Badge
                    variant="secondary"
                    className={`capitalize text-xs ${getStatusColor(person.member_status)}`}
                  >
                    {person.member_status.replace('_', ' ')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-sm">
                {/* Tags */}
                {person.tags && person.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {person.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {person.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{person.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Contact Information */}
                <div className="flex flex-col gap-2 text-muted-foreground">
                  {person.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate text-xs">{person.email}</span>
                    </div>
                  )}
                  {person.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="text-xs">{person.phone_number}</span>
                    </div>
                  )}
                  {!person.email && !person.phone_number && (
                    <p className="text-xs text-muted-foreground italic">No contact info</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Person Dialog - for both Add and Edit */}
      <PersonDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        person={selectedPerson}
        onSuccess={handleRefresh}
      />
    </div>
  );
};
