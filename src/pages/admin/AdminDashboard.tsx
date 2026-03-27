import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  TrendingUp,
  PhoneCall,
  Building2,
  Target,
  Loader2,
  ArrowRight,
  Calendar,
} from 'lucide-react';

interface AdminSummary {
  totalLeads: number;
  leadsThisWeek: number;
  demoCalls: number;
  activeCustomers: number;
  conversionRate: number;
  convertedCount: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AdminSummary>({
    totalLeads: 0,
    leadsThisWeek: 0,
    demoCalls: 0,
    activeCustomers: 0,
    conversionRate: 0,
    convertedCount: 0,
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-dashboard', {
        body: { action: 'summary' },
      });
      if (error) throw error;
      if (data?.summary) {
        setSummary(data.summary);
      }

      // Fetch recent leads
      const { data: leadsData, error: leadsError } = await supabase.functions.invoke(
        'admin-dashboard',
        { body: { action: 'leads', limit: 5 } }
      );
      if (!leadsError && leadsData?.leads) {
        setRecentLeads(leadsData.leads);
      }

      // Fetch recent calls
      const { data: callsData, error: callsError } = await supabase.functions.invoke(
        'admin-dashboard',
        { body: { action: 'calls', limit: 5 } }
      );
      if (!callsError && callsData?.calls) {
        setRecentCalls(callsData.calls);
      }
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      // Try to extract detailed error from the edge function response
      let description = err.message || 'Please try again.';
      try {
        if (err.context?.body) {
          const text = await new Response(err.context.body).text();
          description = text;
          console.error('Edge function response:', text);
        }
      } catch {}
      toast({
        title: 'Error loading admin data',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Total Leads',
      value: summary.totalLeads,
      icon: Users,
      color: 'purple',
      gradient: 'from-purple-500/10 to-purple-500/5',
      border: 'border-purple-500/20 hover:border-purple-500/30',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      onClick: () => navigate('/admin/leads'),
    },
    {
      label: 'Leads This Week',
      value: summary.leadsThisWeek,
      icon: Calendar,
      color: 'cyan',
      gradient: 'from-cyan-500/10 to-cyan-500/5',
      border: 'border-cyan-500/20 hover:border-cyan-500/30',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
      badge: summary.leadsThisWeek > 0 ? 'New' : undefined,
      onClick: () => navigate('/admin/leads'),
    },
    {
      label: 'Demo Calls',
      value: summary.demoCalls,
      icon: PhoneCall,
      color: 'blue',
      gradient: 'from-blue-500/10 to-blue-500/5',
      border: 'border-blue-500/20 hover:border-blue-500/30',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      onClick: () => navigate('/admin/communications'),
    },
    {
      label: 'Active Customers',
      value: summary.activeCustomers,
      icon: Building2,
      color: 'green',
      gradient: 'from-green-500/10 to-green-500/5',
      border: 'border-green-500/20 hover:border-green-500/30',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
      onClick: () => navigate('/admin/customers'),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Platform-wide overview of leads, customers, and sales activity.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-slate-300 hover:bg-white/5"
          onClick={fetchAdminData}
        >
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`p-5 rounded-xl bg-gradient-to-br ${card.gradient} border ${card.border} transition-colors cursor-pointer`}
            onClick={card.onClick}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              {card.badge && (
                <Badge className="bg-cyan-500/20 text-cyan-300 border-0 text-xs">
                  {card.badge}
                </Badge>
              )}
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-slate-500 mt-2">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Conversion Rate Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Target className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-400">Lead-to-Customer Conversion Rate</p>
            <p className="text-3xl font-bold text-white">{summary.conversionRate}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Converted</p>
            <p className="text-lg font-semibold text-indigo-400">
              {summary.convertedCount} / {summary.totalLeads}
            </p>
          </div>
        </div>
      </div>

      {/* Detail Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Leads */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Recent Leads
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-400 hover:text-purple-300 h-7 px-2"
              onClick={() => navigate('/admin/leads')}
            >
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {recentLeads.length > 0 ? (
              recentLeads.map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-xs font-medium text-white">
                      {(lead.first_name || lead.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {lead.first_name || lead.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">{lead.church_name || 'No church'}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      lead.status === 'converted'
                        ? 'border-green-500/30 text-green-400'
                        : lead.status === 'nurturing'
                        ? 'border-blue-500/30 text-blue-400'
                        : lead.status === 'contacted'
                        ? 'border-amber-500/30 text-amber-400'
                        : 'border-slate-500/30 text-slate-400'
                    }`}
                  >
                    {lead.status || 'new'}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-slate-500">No leads yet</div>
            )}
          </div>
        </div>

        {/* Recent Demo Calls */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-blue-400" />
              Recent Demo Calls
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-400 hover:text-blue-300 h-7 px-2"
              onClick={() => navigate('/admin/communications')}
            >
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {recentCalls.length > 0 ? (
              recentCalls.map((call: any) => (
                <div key={call.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center text-xs font-medium text-white">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {call.lead_name || call.phone_number || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {call.created_at
                          ? new Date(call.created_at).toLocaleDateString()
                          : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      call.call_status === 'completed'
                        ? 'border-green-500/30 text-green-400'
                        : call.call_status === 'failed'
                        ? 'border-red-500/30 text-red-400'
                        : 'border-slate-500/30 text-slate-400'
                    }`}
                  >
                    {call.call_status || 'pending'}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-slate-500">No demo calls yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
