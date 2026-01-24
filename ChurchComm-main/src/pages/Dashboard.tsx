import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UsersRound,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Mail,
  ArrowRight,
  Check,
  BarChart,
  Activity,
  AlertTriangle,
  Heart,
  Sparkles,
  PhoneForwarded,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, parseISO } from 'date-fns';

export default function Dashboard() {
  const { user, currentOrganization } = useAuthStore();
  const [stats, setStats] = useState({
    totalPeople: 0,
    totalGroups: 0,
    totalCampaigns: 0,
  });
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getInitials = (name?: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const loadDashboardData = async () => {
    if (!currentOrganization) return;
    setLoading(true);

    try {
      // Parallelize all data fetching
      const [
        peopleStats,
        groupsCount,
        campaignsCount,
        attentionItems,
        recentPeople,
        recentGroups,
      ] = await Promise.all([
        supabase
          .from('people')
          .select('id, created_at', { count: 'exact' })
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('groups')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id),
        supabase
          .from('messaging_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id),
        supabase
          .from('follow_ups')
          .select('id, created_at, priority, status, person:person_id(first_name, last_name)')
          .eq('organization_id', currentOrganization.id)
          .neq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('people')
          .select('id, first_name, last_name, created_at')
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('groups')
          .select('id, name, created_at')
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false })
          .limit(2),
      ]);

      // Process stats
      const totalPeople = peopleStats.count || 0;
      setStats({
        totalPeople,
        totalGroups: groupsCount.count || 0,
        totalCampaigns: campaignsCount.count || 0,
      });

      // Process attention items
      setActionItems(attentionItems.data || []);
      
      // Process chart data
      const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
      const dailyCounts = Array.from({ length: 7 }).map((_, i) => {
        const date = startOfDay(subDays(new Date(), i));
        return {
          date: format(date, 'MMM d'),
          fullDate: format(date, 'yyyy-MM-dd'),
          newMembers: 0,
        };
      }).reverse();

      if (peopleStats.data) {
        peopleStats.data.forEach(p => {
          const createdAt = startOfDay(parseISO(p.created_at));
          if (createdAt >= sevenDaysAgo) {
            const dateStr = format(createdAt, 'yyyy-MM-dd');
            const dayData = dailyCounts.find(d => d.fullDate === dateStr);
            if (dayData) {
              dayData.newMembers += 1;
            }
          }
        });
      }
      setChartData(dailyCounts);

      // Process recent activities
      const activities: any[] = [];
      if (recentPeople.data) {
        recentPeople.data.forEach(p => activities.push({
          type: 'new_person',
          data: p,
          timestamp: p.created_at,
        }));
      }
      if (recentGroups.data) {
        recentGroups.data.forEach(g => activities.push({
          type: 'new_group',
          data: g,
          timestamp: g.created_at,
        }));
      }
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(activities.slice(0, 4));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentOrganization]);

  const allNextStepsCompleted = stats.totalPeople > 0 && stats.totalGroups > 0 && stats.totalCampaigns > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const NextStep = ({ icon, title, description, to, completed }: { icon: React.ReactNode, title: string, description: string, to: string, completed?: boolean }) => (
    <Link to={to} className="block hover:bg-muted/50 p-3 rounded-lg transition-colors">
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full ${completed ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'}`}>
          {completed ? <Check className="h-5 w-5" /> : icon}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {!completed && <ArrowRight className="h-5 w-5 text-muted-foreground self-center" />}
      </div>
    </Link>
  );

  const renderActivity = (activity: any) => {
    switch (activity.type) {
      case 'new_person':
        return {
          icon: <UserPlus className="h-4 w-4" />,
          text: <p><strong>{activity.data.first_name} {activity.data.last_name}</strong> was added to the directory.</p>,
          time: format(parseISO(activity.timestamp), 'MMM d, yyyy'),
        };
      case 'new_group':
        return {
          icon: <UsersRound className="h-4 w-4" />,
          text: <p>A new group <strong>"{activity.data.name}"</strong> was created.</p>,
          time: format(parseISO(activity.timestamp), 'MMM d, yyyy'),
        };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Welcome, {user?.user_metadata.first_name || 'Friend'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening at {currentOrganization?.name || 'your organization'}.
          </p>
        </div>
        <Avatar>
          <AvatarFallback>{getInitials(user?.user_metadata.full_name)}</AvatarFallback>
        </Avatar>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Needs Attention Section */}
          {actionItems.length > 0 && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                  Needs Your Attention
                </CardTitle>
                <CardDescription>
                  These items from recent calls require follow-up.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-amber-500/20">
                  {actionItems.map(item => (
                    <Link key={item.id} to="/follow-ups" className="block hover:bg-amber-500/10 -mx-6 px-6 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                           <p className="font-semibold">
                            {item.person?.first_name || 'Unknown'} {item.person?.last_name || ''}
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant={item.priority === 'urgent' || item.priority === 'high' ? 'destructive' : 'secondary'}>
                              {item.priority}
                            </Badge>
                            <span className='text-muted-foreground'>•</span>
                            <span className="text-muted-foreground capitalize">{item.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(item.created_at), 'MMM d')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total People</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPeople}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
                <UsersRound className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalGroups}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
                <MessageSquare className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
              </CardContent>
            </Card>
          </div>

          {/* New Members Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                New Member Growth
              </CardTitle>
              <CardDescription>New members added in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="newMembers" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Side Column */}
        <div className="space-y-6">
          {/* Next Steps */}
          {!allNextStepsCompleted && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <NextStep
                  icon={<UserPlus className="h-5 w-5" />}
                  title="Add a new member"
                  description="Grow your directory by adding a new person."
                  to="/people"
                  completed={stats.totalPeople > 0}
                />
                <NextStep
                  icon={<UsersRound className="h-5 w-5" />}
                  title="Create a group"
                  description="Organize your members into groups."
                  to="/groups"
                  completed={stats.totalGroups > 0}
                />
                <NextStep
                  icon={<Mail className="h-5 w-5" />}
                  title="Send a message"
                  description="Engage your community with an SMS campaign."
                  to="/communications"
                  completed={stats.totalCampaigns > 0}
                />
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length > 0 ? recentActivities.map((activity, index) => {
                  const rendered = renderActivity(activity);
                  if (!rendered) return null;
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted text-muted-foreground">{rendered.icon}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-sm">
                        {rendered.text}
                        <p className="text-xs text-muted-foreground">{rendered.time}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity to show.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
