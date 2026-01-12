import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentOrganization } = useAuthStore();

  return (
    <div className="min-h-screen bg-background text-foreground flex w-full">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        {/* Organization Status Bar */}
        <div className="h-8 bg-card/50 border-b border-border px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Organization:</span>
            <Badge variant="secondary" className="text-xs">
              {currentOrganization?.name || 'Loading...'}
            </Badge>
          </div>
          {currentOrganization && (
            <div className="text-sm text-muted-foreground">
              Plan: <span className="font-medium text-foreground">{currentOrganization.subscription_plan || 'Free'}</span>
            </div>
          )}
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
