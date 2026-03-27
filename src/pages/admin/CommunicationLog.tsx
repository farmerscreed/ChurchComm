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
  PhoneCall,
  Clock,
} from 'lucide-react';

interface DemoCallLog {
  id: string;
  lead_id: string | null;
  lead_name: string | null;
  phone_number: string | null;
  church_name: string | null;
  call_status: string | null;
  call_duration: number | null;
  vapi_call_id: string | null;
  created_at: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function getCallStatusColor(status: string | null): string {
  switch (status) {
    case 'completed':
    case 'ended':
      return 'border-green-500/30 text-green-400 bg-green-500/10';
    case 'failed':
    case 'error':
      return 'border-red-500/30 text-red-400 bg-red-500/10';
    case 'in-progress':
    case 'ringing':
      return 'border-blue-500/30 text-blue-400 bg-blue-500/10';
    case 'no-answer':
      return 'border-amber-500/30 text-amber-400 bg-amber-500/10';
    default:
      return 'border-slate-500/30 text-slate-400 bg-slate-500/10';
  }
}

export default function CommunicationLog() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<DemoCallLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-dashboard', {
        body: { action: 'calls', limit: 200 },
      });
      if (error) throw error;
      setCalls(data?.calls || []);
    } catch (err: any) {
      console.error('Error fetching communication log:', err);
      toast({
        title: 'Error loading calls',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCalls = calls.filter((call) => {
    if (!searchTerm) return true;
    return (
      (call.lead_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (call.phone_number || '').includes(searchTerm) ||
      (call.church_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading communication log...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <PhoneCall className="w-7 h-7 text-blue-400" />
            Communication Log
          </h1>
          <p className="text-muted-foreground mt-1">
            All demo call logs and their outcomes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-slate-300 hover:bg-white/5"
          onClick={fetchCalls}
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search by name, phone, or church..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Results Count */}
      <p className="text-sm text-slate-500">
        Showing {filteredCalls.length} of {calls.length} call records
      </p>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-x-auto overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-slate-400">Lead Name</TableHead>
              <TableHead className="text-slate-400">Phone</TableHead>
              <TableHead className="text-slate-400 hidden md:table-cell">Church</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400 hidden md:table-cell">Duration</TableHead>
              <TableHead className="text-slate-400">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCalls.length > 0 ? (
              filteredCalls.map((call) => (
                <TableRow key={call.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">
                    {call.lead_name || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm font-mono">
                    {call.phone_number || '-'}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm hidden md:table-cell">
                    {call.church_name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getCallStatusColor(call.call_status)}`}
                    >
                      {call.call_status || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatDuration(call.call_duration)}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {call.created_at
                      ? new Date(call.created_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                  No call records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
