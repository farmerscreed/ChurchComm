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
  Zap,
  Cake,
  CalendarClock,
  Bell,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { LogoIcon } from '@/components/ui/Logo';

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
        'flex flex-col h-full bg-[#0f172a] text-slate-300 relative overflow-hidden',
        !isMobile && 'transition-all duration-300 ease-in-out',
        !isMobile && (isCollapsed ? 'w-20' : 'w-72'),
        'shadow-2xl'
      )}
    >
      {/* Background Gradient Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-slate-950/0 to-slate-950/0 pointer-events-none" />

      {/* Header */}
      <div className={cn(
        "flex items-center p-6 h-20 mb-2 relative z-10",
        !isMobile && isCollapsed ? "justify-center px-0" : "justify-between"
      )}>
        <div className={cn("flex items-center gap-3 overflow-hidden transition-all duration-300", !isMobile && isCollapsed && "w-0 opacity-0 hidden")}>
          <div className="w-10 h-10 flex items-center justify-center">
            <LogoIcon className="w-10 h-10" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-white tracking-tight">KeepFlock</h2>
            {currentOrganization && (
              <p className="text-xs text-slate-400 truncate max-w-[140px] font-medium">
                {currentOrganization.name}
              </p>
            )}
          </div>
        </div>

        {/* Collapsed Logo */}
        {!isMobile && isCollapsed && (
          <div className="w-10 h-10 flex items-center justify-center">
            <LogoIcon className="w-10 h-10" />
          </div>
        )}

        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileNavClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full"
          >
            <X className="h-6 w-6" />
          </Button>
        ) : (
          !isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )
        )}
      </div>

      {/* Collapse Toggle for Desktop (Centered when collapsed) */}
      {!isMobile && isCollapsed && (
        <div className="w-full flex justify-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
          >
            <ChevronLeft className="h-5 w-5 rotate-180" />
          </Button>
        </div>
      )}


      {/* Main Menu Label */}
      <div className={cn('px-6 py-2 pb-4', !isMobile && isCollapsed && 'hidden')}>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Main Menu</p>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1.5 relative z-10">
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
                        'w-full justify-start gap-3.5 h-auto px-4 py-3 text-sm font-medium transition-all duration-200',
                        'hover:bg-white/5 hover:text-white rounded-xl',
                        isChildActive ? 'bg-white/5 text-white shadow-sm' : 'text-slate-400',
                        !isMobile && isCollapsed && 'justify-center px-2',
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", isChildActive ? "text-indigo-400" : "text-slate-400 group-hover:text-indigo-300")} />
                      <div
                        className={cn(
                          'flex-1 text-left flex items-center gap-2',
                          !isMobile && isCollapsed && 'hidden',
                        )}
                      >
                        {item.name}
                        {item.badge && (
                          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] px-1.5 py-0 font-semibold shadow-[0_0_10px_-3px_rgba(99,102,241,0.4)]">
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
                    <CollapsibleContent className="ml-4 space-y-1 pl-4 border-l border-slate-800 mt-2 mb-2">
                      {item.children.map(child => {
                        const active = location.pathname === child.href || location.pathname.startsWith(child.href + '/');
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                              'hover:text-white hover:bg-white/5',
                              active
                                ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                                : 'text-slate-400',
                            )}
                          >
                            <child.icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-indigo-400" : "text-slate-500")} />
                            <span>{child.name}</span>
                          </Link>
                        )
                      })}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            }

            const isActiveItem = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href || '#'}
                data-tour={item.dataTour}
                className={cn(
                  'flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group',
                  'hover:bg-white/5 hover:text-white',
                  isActiveItem
                    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-white shadow-sm ring-1 ring-white/5'
                    : 'text-slate-400',
                  !isMobile && isCollapsed && 'justify-center px-2',
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActiveItem ? "text-indigo-400" : "text-slate-400 group-hover:text-indigo-300")} />
                <span className={cn(!isMobile && isCollapsed && 'hidden')}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className={cn('p-4 space-y-1 relative z-10 border-t border-slate-800/50 bg-[#0f172a]', !isMobile && isCollapsed && 'items-center flex flex-col')}>
        {/* Settings Link */}
        {canManageOrgSettings && (
          <Link
            to="/settings"
            data-tour="settings-nav"
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
              'hover:bg-white/5 hover:text-white text-slate-400',
              location.pathname === '/settings' && 'bg-white/5 text-white',
              !isMobile && isCollapsed && 'justify-center px-2 w-full',
            )}
            title={!isMobile && isCollapsed ? "Settings" : ""}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className={cn(!isMobile && isCollapsed && 'hidden')}>Settings</span>
          </Link>
        )}

        {/* Sign Out Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn(
            "w-full justify-start gap-3.5 px-4 py-3 h-auto text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl",
            !isMobile && isCollapsed && 'justify-center px-2'
          )}
          title={!isMobile && isCollapsed ? "Sign Out" : ""}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className={cn(!isMobile && isCollapsed && 'hidden')}>Sign Out</span>
        </Button>

        {/* Version */}
        <div className={cn('pt-4 px-2', !isMobile && isCollapsed && 'hidden')}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-600 font-mono">v2.0.5 Beta</p>
            <div className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" title="System Operational"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar - Slide Over */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) md:hidden shadow-2xl',
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {navContent(true)}
      </div>

      {/* Backdrop for mobile */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={onMobileNavClose}
        ></div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block h-screen sticky top-0">{navContent(false)}</div>
    </>
  );
}
