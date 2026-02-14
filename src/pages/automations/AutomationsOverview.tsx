import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Zap,
  Cake,
  CalendarClock,
  LayoutDashboard,
  List,
  Sparkles,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Clock
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
      // Fetch automations for counts
      const { data: automations } = await supabase
        .from('automations')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      const autoList = automations || [];
      const activeCount = autoList.filter(a => a.status === 'active').length;
      const totalExecs = autoList.reduce((sum, a) => sum + (a.total_executions || 0), 0);

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
      color: 'text-pink-500',
      bgColor: 'bg-pink-100 dark:bg-pink-900/20',
      stat: `${stats.upcomingBirthdays} upcoming`,
    },
    {
      id: 'scheduled',
      title: 'Scheduled Outreach',
      description: 'Plan and schedule SMS and AI calls in advance.',
      icon: CalendarClock,
      href: '/automations/scheduled',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      stat: `${stats.scheduledMessages} scheduled`,
    },
    {
      id: 'triggers',
      title: 'Event Triggers',
      description: 'React to member actions like first visits or group joins.',
      icon: Zap,
      href: '/automations/triggers',
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/20',
      stat: `${stats.activeAutomations} active`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Automations</h1>
        <p className="text-muted-foreground mt-2">
          Streamline your ministry with automated workflows and communications.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            All Workflows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Automations', value: stats.totalAutomations, icon: Zap },
              { label: 'Active', value: stats.activeAutomations, icon: Sparkles },
              { label: 'Executions', value: stats.totalExecutions, icon: TrendingUp },
              { label: 'Scheduled', value: stats.scheduledMessages, icon: Clock }
            ].map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-muted rounded-full mb-2">
                    <stat.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feature Cards */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Link key={category.id} to={category.href} className="group block h-full">
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          category.bgColor
                        )}>
                          <category.icon className={cn("h-6 w-6", category.color)} />
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{category.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 flex-grow">
                        {category.description}
                      </p>
                      <div className="mt-auto pt-4 border-t">
                        <span className="text-xs font-medium text-muted-foreground">
                          {category.stat}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="mt-6">
          <AutomationsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
