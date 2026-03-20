import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Cake,
  CalendarClock,
  LayoutDashboard,
  List,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Clock,
  HelpCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { AutomationsList } from '@/components/automations/AutomationsList';

interface AutomationStats {
  totalAutomations: number;
  activeAutomations: number;
  totalExecutions: number;
  upcomingBirthdays: number;
  scheduledMessages: number;
}

export default function AutomationsOverview() {
  const { currentOrganization } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'workflows'>('overview');
  const [stats, setStats] = useState<AutomationStats>({
    totalAutomations: 0,
    activeAutomations: 0,
    totalExecutions: 0,
    upcomingBirthdays: 0,
    scheduledMessages: 0,
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchStats();
    }
  }, [currentOrganization?.id]);

  const fetchStats = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data: automations } = await supabase
        .from('automations')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      const autoList = automations || [];
      const activeCount = autoList.filter(a => a.status === 'active').length;
      const totalExecs = autoList.reduce((sum, a) => sum + (a.total_executions || 0), 0);

      const { data: birthdays } = await supabase
        .from('people')
        .select('id', { count: 'exact' })
        .eq('organization_id', currentOrganization.id)
        .not('birthday', 'is', null);

      const { data: scheduled } = await supabase
        .from('scheduled_messages')
        .select('id', { count: 'exact' })
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'scheduled');

      setStats({
        totalAutomations: autoList.length,
        activeAutomations: activeCount,
        totalExecutions: totalExecs,
        upcomingBirthdays: birthdays?.length || 0,
        scheduledMessages: scheduled?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const categories = [
    {
      id: 'birthdays',
      title: 'Birthday & Anniversary',
      description: 'Send automated wishes to celebrate special days.',
      icon: Cake,
      href: '/automations/birthdays',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-500/20 hover:border-pink-500/30',
      gradientBg: 'from-pink-500/10 to-pink-500/5',
      stat: `${stats.upcomingBirthdays} upcoming`,
    },
    {
      id: 'scheduled',
      title: 'Scheduled Outreach',
      description: 'Plan and schedule SMS and AI calls in advance.',
      icon: CalendarClock,
      href: '/automations/scheduled',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/20 hover:border-blue-500/30',
      gradientBg: 'from-blue-500/10 to-blue-500/5',
      stat: `${stats.scheduledMessages} scheduled`,
    },
    {
      id: 'triggers',
      title: 'Event Triggers',
      description: 'React to member actions like first visits or group joins.',
      icon: Zap,
      href: '/automations/triggers',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/20 hover:border-amber-500/30',
      gradientBg: 'from-amber-500/10 to-amber-500/5',
      stat: `${stats.activeAutomations} active`,
    },
  ];

  const statCards = [
    { label: 'Total Automations', value: stats.totalAutomations, icon: Zap, color: 'text-purple-400', bgColor: 'bg-purple-500/20', gradientBg: 'from-purple-500/10 to-purple-500/5', borderColor: 'border-purple-500/20' },
    { label: 'Active', value: stats.activeAutomations, icon: Sparkles, color: 'text-green-400', bgColor: 'bg-green-500/20', gradientBg: 'from-green-500/10 to-green-500/5', borderColor: 'border-green-500/20' },
    { label: 'Executions', value: stats.totalExecutions, icon: TrendingUp, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', gradientBg: 'from-cyan-500/10 to-cyan-500/5', borderColor: 'border-cyan-500/20' },
    { label: 'Scheduled', value: stats.scheduledMessages, icon: Clock, color: 'text-blue-400', bgColor: 'bg-blue-500/20', gradientBg: 'from-blue-500/10 to-blue-500/5', borderColor: 'border-blue-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Zap className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Automations
            </span>
          </h1>
          <p className="text-slate-400 mt-1">
            Streamline your ministry with automated workflows and communications.
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1">
        {[
          { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
          { id: 'workflows' as const, label: 'All Workflows', icon: List },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <div
                key={i}
                className={cn(
                  "p-5 rounded-xl bg-gradient-to-br border transition-colors",
                  stat.gradientBg,
                  stat.borderColor
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bgColor)}>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-2">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.filter(c => c.id !== 'triggers').map((category) => (
              <Link key={category.id} to={category.href} className="group block">
                <div className={cn(
                  "p-6 rounded-xl bg-gradient-to-br border transition-all cursor-pointer hover:scale-[1.02]",
                  category.gradientBg,
                  category.borderColor
                )}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", category.bgColor)}>
                      <category.icon className={cn("h-6 w-6", category.color)} />
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{category.title}</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    {category.description}
                  </p>
                  <div className="pt-4 border-t border-white/10">
                    <Badge variant="outline" className="border-white/10 text-slate-400 bg-white/5">
                      {category.stat}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'workflows' && (
        <AutomationsList />
      )}

      {/* Help Link */}
      <div className="flex justify-center pt-2">
        <div className="border-dashed border-2 border-white/10 rounded-xl px-6 py-4 text-center text-slate-400">
          <HelpCircle className="h-5 w-5 mx-auto mb-1 opacity-50" />
          <p className="text-sm">Need help getting started?</p>
          <Link to="/automations/docs" className="text-sm text-amber-400 font-medium hover:underline">
            View Automations Guide
          </Link>
        </div>
      </div>
    </div>
  );
}
