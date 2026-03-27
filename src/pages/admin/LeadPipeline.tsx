import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  PhoneCall,
  RefreshCw,
  Filter,
  Users,
} from 'lucide-react';

interface Lead {
  id: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  church_name: string | null;
  source: string | null;
  status: string | null;
  converted_to_signup: boolean | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'nurturing', label: 'Nurturing' },
  { value: 'converted', label: 'Converted' },
];

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'eligibility_checker', label: 'Eligibility Checker' },
  { value: 'demo_call', label: 'Demo Call' },
  { value: 'wordpress', label: 'WordPress' },
  { value: 'landing_page', label: 'Landing Page' },
];

function getStatusColor(status: string | null): string {
  switch (status) {
    case 'converted':
      return 'border-green-500/30 text-green-400 bg-green-500/10';
    case 'nurturing':
      return 'border-blue-500/30 text-blue-400 bg-blue-500/10';
    case 'contacted':
      return 'border-amber-500/30 text-amber-400 bg-amber-500/10';
    default:
      return 'border-slate-500/30 text-slate-400 bg-slate-500/10';
  }
}

function getSourceColor(source: string | null): string {
  switch (source) {
    case 'eligibility_checker':
      return 'border-purple-500/30 text-purple-400 bg-purple-500/10';
    case 'demo_call':
      return 'border-blue-500/30 text-blue-400 bg-blue-500/10';
    case 'wordpress':
      return 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10';
    default:
      return 'border-slate-500/30 text-slate-400 bg-slate-500/10';
  }
}

export default function LeadPipeline() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-dashboard', {
        body: { action: 'leads', limit: 200 },
      });
      if (error) throw error;
      setLeads(data?.leads || []);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      toast({
        title: 'Error loading leads',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setUpdatingId(leadId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-dashboard', {
        body: { action: 'update_lead_status', lead_id: leadId, status: newStatus },
      });
      if (error) throw error;
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
      toast({ title: 'Status updated', description: `Lead marked as ${newStatus}.` });
    } catch (err: any) {
      toast({
        title: 'Error updating status',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const triggerFollowUpCall = async (lead: Lead) => {
    if (!lead.phone) {
      toast({
        title: 'No phone number',
        description: 'This lead has no phone number on file.',
        variant: 'destructive',
      });
      return;
    }
    setCallingId(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke('sales-demo-call', {
        body: {
          phone: lead.phone,
          churchName: lead.church_name || 'your church',
          contactName: lead.first_name || 'there',
          leadId: lead.id,
        },
      });
      if (error) throw error;
      toast({
        title: 'Call initiated',
        description: `Follow-up call started to ${lead.first_name || lead.phone}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Error initiating call',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setCallingId(null);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchTerm ||
      (lead.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.church_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading lead pipeline...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 text-purple-400" />
            Lead Pipeline
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all incoming leads across sources.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-slate-300 hover:bg-white/5"
          onClick={fetchLeads}
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name, email, or church..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
            <Filter className="w-4 h-4 mr-2 text-slate-500" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
            <Filter className="w-4 h-4 mr-2 text-slate-500" />
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <p className="text-sm text-slate-500">
        Showing {filteredLeads.length} of {leads.length} leads
      </p>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-x-auto overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Email</TableHead>
              <TableHead className="text-slate-400 hidden md:table-cell">Church</TableHead>
              <TableHead className="text-slate-400 hidden lg:table-cell">Source</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400 hidden md:table-cell">Date</TableHead>
              <TableHead className="text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">
                    {lead.first_name || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {lead.email || '-'}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm hidden md:table-cell">
                    {lead.church_name || '-'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className={`text-xs ${getSourceColor(lead.source)}`}>
                      {(lead.source || 'unknown').replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.status || 'new'}
                      onValueChange={(val) => updateLeadStatus(lead.id, val)}
                      disabled={updatingId === lead.id}
                    >
                      <SelectTrigger
                        className={`w-[120px] h-7 text-xs border ${getStatusColor(lead.status)}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="nurturing">Nurturing</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm hidden md:table-cell">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 px-2"
                      onClick={() => triggerFollowUpCall(lead)}
                      disabled={callingId === lead.id || !lead.phone}
                      title={lead.phone ? 'Trigger follow-up call' : 'No phone number'}
                    >
                      {callingId === lead.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PhoneCall className="w-4 h-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  No leads found matching your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
