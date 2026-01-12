import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Users, UsersRound, MessageSquare, TrendingUp, UserPlus, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { currentOrganization } = useAuthStore();
  const [stats, setStats] = useState({
    totalPeople: 0,
    totalGroups: 0,
    totalCampaigns: 0,
    loading: true
  });

  useEffect(() => {
    loadStats();
  }, [currentOrganization]);

  const loadStats = async () => {
    if (!currentOrganization) return;

    try {
      // Get total people
      const { count: peopleCount } = await supabase
        .from('people')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id);

      // Get total groups
      const { count: groupsCount } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id);

      // Get total campaigns
      const { count: campaignsCount } = await supabase
        .from('communication_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id);

      setStats({
        totalPeople: peopleCount || 0,
        totalGroups: groupsCount || 0,
        totalCampaigns: campaignsCount || 0,
        loading: false
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back to {currentOrganization?.name || 'ChurchConnect'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total People Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total People</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPeople}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Members in your directory
            </p>
          </CardContent>
        </Card>

        {/* Total Groups Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active ministry groups
            </p>
          </CardContent>
        </Card>

        {/* Total Campaigns Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground mt-1">
              SMS & calling campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Link to="/people">
            <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
              <UserPlus className="h-6 w-6 text-primary" />
              <span className="font-medium">Add Person</span>
              <span className="text-xs text-muted-foreground">Add a new member to your directory</span>
            </Button>
          </Link>

          <Link to="/groups">
            <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
              <UsersRound className="h-6 w-6 text-primary" />
              <span className="font-medium">Manage Groups</span>
              <span className="text-xs text-muted-foreground">Create or edit ministry groups</span>
            </Button>
          </Link>

          <Link to="/communications">
            <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
              <Mail className="h-6 w-6 text-primary" />
              <span className="font-medium">Send Message</span>
              <span className="text-xs text-muted-foreground">Send SMS to your congregation</span>
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Getting Started Guide */}
      {stats.totalPeople === 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Welcome to ChurchConnect! Here's how to get started:
            </p>
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </span>
                <span>
                  <strong>Add your first members:</strong> Go to People → Add Person or upload a CSV file with your member list
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                <span>
                  <strong>Create groups:</strong> Organize members into groups like "First Timers", "Youth Ministry", etc.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  3
                </span>
                <span>
                  <strong>Start communicating:</strong> Send SMS messages or make AI calls to connect with your congregation
                </span>
              </li>
            </ol>
            <Link to="/people">
              <Button className="mt-4">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Member
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
