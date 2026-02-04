import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Users,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

      if (autoError && autoError.code !== 'PGRST116') {
        console.error('Error fetching automations:', autoError);
      }

      // Fetch upcoming birthdays count
      const { data: birthdays, error: bdayError } = await supabase
        .from('people')
        .select('id', { count: 'exact' })
        .eq('organization_id', currentOrganization.id)
        .not('birthday', 'is', null);

      if (bdayError) {
        console.error('Error fetching birthdays:', bdayError);
      }

      // Fetch scheduled messages count
      const { data: scheduled, error: schedError } = await supabase
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

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'birthday':
        return <Cake className="h-4 w-4" />;
      case 'scheduled':
        return <CalendarClock className="h-4 w-4" />;
      case 'group_join':
      case 'group_leave':
        return <Users className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTriggerLabel = (type: string) => {
    const labels: Record<string, string> = {
      birthday: 'Birthday',
      anniversary: 'Anniversary',
      membership_anniversary: 'Membership Anniversary',
      group_join: 'Group Join',
      group_leave: 'Group Leave',
      first_visit_followup: 'First Visit',
      missed_attendance: 'Missed Attendance',
      milestone: 'Milestone',
      scheduled: 'Scheduled',
      custom: 'Custom',
    };
    return labels[type] || type;
  };

  const automationCategories = [
    {
      title: 'Birthday Messages',
      description: 'Automatically send birthday wishes to your members',
      icon: Cake,
      href: '/automations/birthdays',
      color: 'from-pink-500 to-rose-500',
      stats: `${stats.upcomingBirthdays} members with birthdays`,
    },
    {
      title: 'Scheduled Messages',
      description: 'Schedule one-time or recurring messages',
      icon: CalendarClock,
      href: '/automations/scheduled',
      color: 'from-blue-500 to-cyan-500',
      stats: `${stats.scheduledMessages} scheduled`,
    },
    {
      title: 'Event Triggers',
      description: 'Automated responses to member actions',
      icon: Bell,
      href: '/automations/triggers',
      color: 'from-amber-500 to-orange-500',
      stats: `${stats.activeAutomations} active triggers`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            Automations
          </h1>
          <p className="text-muted-foreground mt-1">
            Automate your member communications and follow-ups
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
          <Link to="/automations/triggers">
            <Plus className="h-4 w-4 mr-2" />
            Create Automation
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Automations</p>
                {loading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.totalAutomations}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                {loading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-emerald-600">{stats.activeAutomations}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Executions</p>
                {loading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.totalExecutions}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Birthdays</p>
                {loading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-pink-600">{stats.upcomingBirthdays}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                <Cake className="h-5 w-5 text-pink-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automation Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {automationCategories.map((category) => (
          <Link key={category.title} to={category.href}>
            <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer group">
              <CardContent className="p-6">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <category.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-1">{category.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{category.stats}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Automations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Automations</CardTitle>
              <CardDescription>Your most recently created automations</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/automations/triggers">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          ) : recentAutomations.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No automations yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first automation to get started
              </p>
              <Button asChild>
                <Link to="/automations/triggers">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Automation
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAutomations.map((automation) => (
                <div
                  key={automation.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      {getTriggerIcon(automation.trigger_type)}
                    </div>
                    <div>
                      <p className="font-medium">{automation.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {getTriggerLabel(automation.trigger_type)}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {automation.total_executions} sent
                        </span>
                        {automation.last_executed_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(automation.last_executed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={automation.status === 'active' ? 'default' : 'secondary'}
                      className={automation.status === 'active' ? 'bg-emerald-500' : ''}
                    >
                      {automation.status}
                    </Badge>
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

      {/* Quick Tips */}
      <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Getting Started with Automations</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Automations help you stay connected with your members without manual effort.
                Start with birthday messages to celebrate your members, then explore scheduled
                messages for regular updates and event triggers for automatic follow-ups.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/automations/birthdays">
                    <Cake className="h-4 w-4 mr-1" />
                    Setup Birthdays
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/automations/scheduled">
                    <CalendarClock className="h-4 w-4 mr-1" />
                    Schedule Message
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
