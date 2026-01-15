import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const { currentOrganization } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Close mobile nav on route change
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Effect to disable body scroll when mobile nav is open
  useEffect(() => {
    if (isMobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobileNavOpen]);


  return (
    <div className="flex min-h-screen bg-background text-foreground w-full">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileNavOpen={isMobileNavOpen}
        onMobileNavClose={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileNavOpen(true)} />

        {/* Organization Status Bar */}
        <div className="h-8 bg-card/50 border-b border-border px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-hidden">
            <Users className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm text-muted-foreground hidden sm:inline">Organization:</span>
            <Badge variant="secondary" className="text-xs truncate">
              {currentOrganization?.name || 'Loading...'}
            </Badge>
          </div>
          {currentOrganization && (
            <div className="text-sm text-muted-foreground hidden sm:inline">
              Plan: <span className="font-medium text-foreground">{currentOrganization.subscription_plan || 'Free'}</span>
            </div>
          )}
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
