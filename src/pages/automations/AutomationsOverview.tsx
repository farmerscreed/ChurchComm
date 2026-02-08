import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Zap,
  Cake,
  CalendarClock,
  Bell,
  Plus,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Play,
  PauseCircle,
  BarChart3
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ... interfaces ... (same as before)
interface AutomationStats {
  totalAutomations: number;
  activeAutomations: number;
  totalExecutions: number;
  upcomingBirthdays: number;
  scheduledMessages: number;
}

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  status: string;
  total_executions: number;
  last_executed_at: string | null;
}

export default function AutomationsOverview() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AutomationStats>({
    totalAutomations: 0,
    activeAutomations: 0,
    totalExecutions: 0,
    upcomingBirthdays: 0,
    scheduledMessages: 0,
  });
  const [recentAutomations, setRecentAutomations] = useState<Automation[]>([]);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchData();
    }
  }, [currentOrganization?.id]);

  const fetchData = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      // Fetch automations
      const { data: automations, error: autoError } = await supabase
        .from('automations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (autoError && autoError.code !== 'PGRST116' && autoError.code !== 'PGRST205') {
        console.error('Error fetching automations:', autoError);
      }

      // Fetch upcoming birthdays count
      const { data: birthdays } = await supabase
        .from('people')
        .select('id', { count: 'exact' })
        .eq('organization_id', currentOrganization.id)
        .not('birthday', 'is', null);

      // Fetch scheduled messages count
      const { data: scheduled } = await supabase
        .from('scheduled_messages')
        .select('id', { count: 'exact' })
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'scheduled');

      const autoList = automations || [];
      const activeCount = autoList.filter(a => a.status === 'active').length;
      const totalExecs = autoList.reduce((sum, a) => sum + (a.total_executions || 0), 0);

      setStats({
        totalAutomations: autoList.length,
        activeAutomations: activeCount,
        totalExecutions: totalExecs,
        upcomingBirthdays: birthdays?.length || 0,
        scheduledMessages: scheduled?.length || 0,
      });

      setRecentAutomations(autoList);
    } catch (error) {
      console.error('Error fetching automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    // ... toggle logic ...
    try {
      const { error } = await supabase
        .from('automations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setRecentAutomations(prev =>
        prev.map(a => (a.id === id ? { ...a, status: newStatus } : a))
      );

      toast({
        title: newStatus === 'active' ? 'Automation activated' : 'Automation paused',
        description: `The automation has been ${newStatus === 'active' ? 'activated' : 'paused'}.`,
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update automation status.',
        variant: 'destructive',
      });
    }
  };

  const categories = [
    {
      id: 'birthdays',
      title: 'Birthday & Anniversary',
      description: 'Send automated wishes to celebrate special days.',
      icon: Cake,
      href: '/automations/birthdays',
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20',
      stat: `${stats.upcomingBirthdays} upcoming`,
    },
    {
      id: 'scheduled',
      title: 'Scheduled Outreach',
      description: 'Plan and schedule SMS and AI calls in advance.',
      icon: CalendarClock,
      href: '/automations/scheduled',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      stat: `${stats.scheduledMessages} scheduled`,
    },
    {
      id: 'triggers',
      title: 'Event Triggers',
      description: 'React to member actions like first visits or group joins.',
      icon: Zap,
      href: '/automations/triggers',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      stat: `${stats.activeAutomations} active`,
    },
  ];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-80 w-80 rounded-full bg-fuchsia-500/30 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-80 w-80 rounded-full bg-blue-500/30 blur-3xl animate-pulse delay-1000"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight flex items-center gap-3">
              <Sparkles className="h-10 w-10 text-yellow-300" />
              Automation Center
            </h1>
            <p className="text-lg text-indigo-100 max-w-2xl leading-relaxed">
              Supercharge your ministry with intelligent workflows. Automate follow-ups, birthdays, and communications so no one falls through the cracks.
            </p>
          </div>
          <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-xl shadow-indigo-900/20 border-0 font-bold px-8" asChild>
            <Link to="/automations/triggers">
              <Plus className="h-5 w-5 mr-2" />
              New Automation
            </Link>
          </Button>
        </div>

        {/* Quick Stats in Header */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {[
            { label: 'Total Automations', value: stats.totalAutomations, icon: Zap, color: 'text-yellow-300', bg: 'bg-yellow-400/20' },
            { label: 'Active Workflows', value: stats.activeAutomations, icon: CheckCircle2, color: 'text-emerald-300', bg: 'bg-emerald-400/20' },
            { label: 'Total Executions', value: stats.totalExecutions, icon: TrendingUp, color: 'text-blue-300', bg: 'bg-blue-400/20' },
            { label: 'Scheduled Actions', value: stats.scheduledMessages, icon: Clock, color: 'text-orange-300', bg: 'bg-orange-400/20' }
          ].map((stat, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 transition-transform hover:scale-105">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">{stat.value}</p>
                <p className="text-xs font-medium text-indigo-200 uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Categories Grid */}
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 px-1">Explore features</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Link key={category.id} to={category.href} className="group block h-full">
            <div className="h-full relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-indigo-500/30">
              <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10")} />

              <div className="relative h-full p-6 flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-110",
                    category.bgColor
                  )}>
                    <category.icon className={cn("h-8 w-8", category.color)} />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    {category.description}
                  </p>
                </div>

                <div className="mt-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:bg-white group-hover:shadow-sm transition-all">
                    <span className={cn("w-2 h-2 rounded-full", category.color.replace('text-', 'bg-'))} />
                    {category.stat}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity / Automations List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Recent Automations
            </h2>
            <Button variant="ghost" size="sm" asChild className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950">
              <Link to="/automations/triggers">View All</Link>
            </Button>
          </div>

          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : recentAutomations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                  <Zap className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-lg font-medium">No active automations</p>
                  <p className="text-sm">Get started by choosing a category above.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentAutomations.map((automation) => (
                    <div key={automation.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-3 rounded-xl",
                          automation.trigger_type === 'birthday' ? "bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400" :
                            automation.trigger_type === 'scheduled' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                              "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                        )}>
                          {automation.trigger_type === 'birthday' ? <Cake className="h-5 w-5" /> :
                            automation.trigger_type === 'scheduled' ? <CalendarClock className="h-5 w-5" /> :
                              <Zap className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">{automation.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="capitalize">{automation.trigger_type.replace(/_/g, ' ')}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {automation.total_executions} runs
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5",
                          automation.status === 'active'
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        )}>
                          {automation.status === 'active' ? (
                            <><Play className="h-3 w-3 fill-current" /> Active</>
                          ) : (
                            <><PauseCircle className="h-3 w-3" /> Paused</>
                          )}
                        </div>
                        <Switch
                          checked={automation.status === 'active'}
                          onCheckedChange={() => toggleAutomation(automation.id, automation.status)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info/Help Side Card */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-xl">
            <CardContent className="p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
              <div className="relative z-10">
                <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                  <Sparkles className="h-6 w-6 text-yellow-300" />
                </div>
                <h3 className="text-xl font-bold mb-2">Pro Tip</h3>
                <p className="text-indigo-100 mb-6">
                  Combine <strong>Event Triggers</strong> with <strong>AI Calls</strong> to create a powerful welcome journey for first-time guests.
                </p>
                <Button variant="secondary" className="w-full bg-white text-indigo-600 hover:bg-indigo-50" asChild>
                  <Link to="/automations/triggers">Try it now</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 dark:border-slate-800 bg-transparent shadow-none">
            <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">Need help setting up?</p>
              <Button variant="link" className="text-indigo-500" asChild>
                <Link to="/automations/docs">View Documentation</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
