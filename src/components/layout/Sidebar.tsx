import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronDown,
  LogOut,
  UsersRound,
  PhoneCall,
  X,
  PhoneForwarded,
  Zap,
  Cake,
  CalendarClock,
  Bell,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileNavOpen: boolean;
  onMobileNavClose: () => void;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  dataTour?: string;
  children?: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export function Sidebar({
  isCollapsed,
  onToggle,
  isMobileNavOpen,
  onMobileNavClose,
}: SidebarProps) {
  const location = useLocation();
  const { signOut, currentOrganization } = useAuthStore();
  const { canHandleEscalations, canManageOrgSettings } = usePermissions();
  const [expandedItems, setExpandedItems] = useState<string[]>([
    'people',
    'communications',
    'automations',
  ]);

  // Close mobile nav on route change
  useEffect(() => {
    onMobileNavClose();
  }, [location.pathname]);

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      dataTour: 'dashboard-nav',
    },
    {
      name: 'People',
      icon: Users,
      dataTour: 'people-nav',
      children: [
        { name: 'Directory', href: '/people', icon: Users },
        { name: 'Groups', href: '/groups', icon: UsersRound },
      ],
    },
    {
      name: 'Communications',
      icon: MessageSquare,
      dataTour: 'communications-nav',
      children: [
        { name: 'Outreach', href: '/communications', icon: MessageSquare },
        { name: 'Call History', href: '/call-history', icon: PhoneCall },
      ],
    },
    {
      name: 'Automations',
      icon: Zap,
      badge: 'New',
      dataTour: 'automations-nav',
      children: [
        { name: 'Overview', href: '/automations', icon: Sparkles },
        { name: 'Birthday Messages', href: '/automations/birthdays', icon: Cake },
        { name: 'Scheduled', href: '/automations/scheduled', icon: CalendarClock },
        { name: 'Event Triggers', href: '/automations/triggers', icon: Bell },
      ],
    },
    ...(canHandleEscalations
      ? [{
        name: 'Follow-ups',
        href: '/follow-ups',
        icon: PhoneForwarded,
      }]
      : []),
  ];

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName],
    );
  };

  const navContent = (isMobile: boolean) => (
    <div
      className={cn(
        'flex flex-col h-full bg-slate-900 border-r border-slate-800',
        !isMobile && 'transition-all duration-300',
        !isMobile && (isCollapsed ? 'w-16' : 'w-64'),
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 h-16">
        <div
          className={cn(
            'flex items-center gap-2',
            !isMobile && isCollapsed && 'hidden',
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-lg">🐑</span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-white">KeepFlock</h2>
            {currentOrganization && (
              <p className="text-xs text-slate-400 truncate max-w-[140px]">
                {currentOrganization.name}
              </p>
            )}
          </div>
        </div>
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileNavClose}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn('h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800', isCollapsed && 'mx-auto')}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
                isCollapsed && 'rotate-180',
              )}
            />
          </Button>
        )}
      </div>

      {/* Main Menu Label */}
      <div className={cn('px-4 py-3', !isMobile && isCollapsed && 'hidden')}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Main Menu</p>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1">
          {navigation.map(item => {
            if (item.children) {
              const isExpanded = expandedItems.includes(item.name.toLowerCase());
              const isChildActive = item.children.some(child => location.pathname === child.href || location.pathname.startsWith(child.href + '/'));

              return (
                <Collapsible
                  key={item.name}
                  open={isExpanded && (isMobile || !isCollapsed)}
                  onOpenChange={() => toggleExpanded(item.name.toLowerCase())}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      data-tour={item.dataTour}
                      className={cn(
                        'w-full justify-start gap-3 h-auto px-3 py-2.5 text-sm font-medium',
                        'hover:bg-slate-800 hover:text-white',
                        isChildActive ? 'text-white bg-slate-800/50' : 'text-slate-400',
                        !isMobile && isCollapsed && 'justify-center',
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <div
                        className={cn(
                          'flex-1 text-left flex items-center gap-2',
                          !isMobile && isCollapsed && 'hidden',
                        )}
                      >
                        {item.name}
                        {item.badge && (
                          <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[10px] px-1.5 py-0">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform text-slate-500',
                          isExpanded && 'rotate-180',
                          !isMobile && isCollapsed && 'hidden',
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <div className={cn(!isMobile && isCollapsed && 'hidden')}>
                    <CollapsibleContent className="ml-4 space-y-0.5 border-l border-slate-700/50 pl-3 mt-1">
                      {item.children.map(child => (
                        <Link
                          key={child.name}
                          to={child.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                            'hover:bg-slate-800 hover:text-white',
                            location.pathname === child.href || location.pathname.startsWith(child.href + '/')
                              ? 'bg-slate-800 text-white font-medium'
                              : 'text-slate-400',
                          )}
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href || '#'}
                data-tour={item.dataTour}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  'hover:bg-slate-800 hover:text-white',
                  location.pathname === item.href
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400',
                  !isMobile && isCollapsed && 'justify-center',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className={cn(!isMobile && isCollapsed && 'hidden')}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className={cn('border-t border-slate-800 p-3 space-y-1', !isMobile && isCollapsed && 'hidden')}>
        {canManageOrgSettings && (
          <Link
            to="/settings"
            data-tour="settings-nav"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              'hover:bg-slate-800 hover:text-white',
              location.pathname === '/settings'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400',
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span>Settings</span>
          </Link>
        )}

        <Separator className="my-2 bg-slate-700" />

        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-slate-800"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Sign Out</span>
        </Button>

        {/* Version */}
        <div className="pt-2 px-3">
          <p className="text-xs text-slate-600">v2.0.5 Beta</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out md:hidden',
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {navContent(true)}
      </div>

      {/* Backdrop for mobile */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onMobileNavClose}
        ></div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block">{navContent(false)}</div>
    </>
  );
}
