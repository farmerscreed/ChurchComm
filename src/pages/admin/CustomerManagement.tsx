import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Loader2,
  RefreshCw,
  Building2,
  Clock,
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  member_count: number | null;
  minutes_used: number | null;
  minutes_included: number | null;
  plan_modules: string[] | null;
  created_at: string;
}

function getTrialDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const now = new Date();
  const end = new Date(trialEndsAt);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function getPlanBadgeColor(plan: string | null): string {
  switch (plan) {
    case 'pro':
      return 'border-purple-500/30 text-purple-400 bg-purple-500/10';
    case 'starter':
      return 'border-blue-500/30 text-blue-400 bg-blue-500/10';
    case 'enterprise':
      return 'border-amber-500/30 text-amber-400 bg-amber-500/10';
    default:
      return 'border-slate-500/30 text-slate-400 bg-slate-500/10';
  }
}

function getModuleBadgeColor(mod: string): string {
  switch (mod) {
    case 'attract':
      return 'border-green-500/30 text-green-400 bg-green-500/10';
    case 'engage':
      return 'border-blue-500/30 text-blue-400 bg-blue-500/10';
    case 'reach':
      return 'border-purple-500/30 text-purple-400 bg-purple-500/10';
    default:
      return 'border-slate-500/30 text-slate-400 bg-slate-500/10';
  }
}

export default function CustomerManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-dashboard', {
        body: { action: 'customers' },
      });
      if (error) throw error;
      setCustomers(data?.customers || []);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      toast({
        title: 'Error loading customers',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!searchTerm) return true;
    return (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading customers...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building2 className="w-7 h-7 text-green-400" />
            Customer Management
          </h1>
          <p className="text-muted-foreground mt-1">
            All organizations on the platform with their plan and usage details.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-slate-300 hover:bg-white/5"
          onClick={fetchCustomers}
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search by church name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Results Count */}
      <p className="text-sm text-slate-500">
        Showing {filteredCustomers.length} of {customers.length} organizations
      </p>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-x-auto overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-slate-400">Church Name</TableHead>
              <TableHead className="text-slate-400">Plan</TableHead>
              <TableHead className="text-slate-400 hidden md:table-cell">Modules</TableHead>
              <TableHead className="text-slate-400 hidden lg:table-cell">Trial Status</TableHead>
              <TableHead className="text-slate-400 hidden md:table-cell">Members</TableHead>
              <TableHead className="text-slate-400 hidden lg:table-cell">Minutes Used</TableHead>
              <TableHead className="text-slate-400 hidden md:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => {
                const trialDays = getTrialDaysRemaining(customer.trial_ends_at);
                return (
                  <TableRow key={customer.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">
                      {customer.name || 'Unnamed'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getPlanBadgeColor(customer.subscription_plan)}`}
                      >
                        {customer.subscription_plan || 'free'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {customer.plan_modules && customer.plan_modules.length > 0 ? (
                          customer.plan_modules.map((mod) => (
                            <Badge
                              key={mod}
                              variant="outline"
                              className={`text-[10px] ${getModuleBadgeColor(mod)}`}
                            >
                              {mod}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {trialDays !== null ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span
                            className={`text-xs ${
                              trialDays <= 3 ? 'text-red-400' : 'text-slate-400'
                            }`}
                          >
                            {trialDays > 0 ? `${trialDays}d remaining` : 'Expired'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {customer.subscription_status === 'active' ? 'Active' : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm hidden md:table-cell">
                      {customer.member_count ?? '-'}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm hidden lg:table-cell">
                      {customer.minutes_used != null && customer.minutes_included != null
                        ? `${customer.minutes_used} / ${customer.minutes_included}`
                        : customer.minutes_used ?? '-'}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm hidden md:table-cell">
                      {customer.created_at
                        ? new Date(customer.created_at).toLocaleDateString()
                        : '-'}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
