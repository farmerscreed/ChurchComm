import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  History,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileNavOpen: boolean;
  onMobileNavClose: () => void;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  dataTour?: string;
  children?: {
    name: string;
    href: string;
    icon: any;
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
  const [expandedItems, setExpandedItems] = useState<string[]>([
    'people',
    'communications',
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
        { name: 'Send Messages', href: '/communications', icon: MessageSquare },
        { name: 'Call History', href: '/call-history', icon: PhoneCall },
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
        'flex flex-col h-full bg-card border-r',
        !isMobile && 'transition-all duration-300',
        !isMobile && (isCollapsed ? 'w-16' : 'w-64'),
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b h-16">
        <div
          className={cn(
            'flex flex-col',
            !isMobile && isCollapsed && 'hidden',
          )}
        >
          <h2 className="text-lg font-semibold">ChurchConnect</h2>
          {currentOrganization && (
            <p className="text-xs text-muted-foreground truncate">
              {currentOrganization.name}
            </p>
          )}
        </div>
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileNavClose}
            className="h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn('h-8 w-8', isCollapsed && 'mx-auto')}
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

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {navigation.map(item => {
            if (item.children) {
              const isExpanded = expandedItems.includes(item.name.toLowerCase());

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
                        'w-full justify-start gap-3 h-auto px-3 py-2 text-sm font-medium',
                        'hover:bg-accent hover:text-accent-foreground',
                        'text-muted-foreground',
                        !isMobile && isCollapsed && 'justify-center',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <div
                        className={cn(
                          'flex-1 text-left',
                          !isMobile && isCollapsed && 'hidden',
                        )}
                      >
                        {item.name}
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isExpanded && 'rotate-180',
                          !isMobile && isCollapsed && 'hidden',
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <div className={cn(!isMobile && isCollapsed && 'hidden')}>
                    <CollapsibleContent className="ml-6 space-y-1">
                      {item.children.map(child => (
                        <Link
                          key={child.name}
                          to={child.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            location.pathname === child.href
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-muted-foreground',
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
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  location.pathname === item.href
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground',
                  !isMobile && isCollapsed && 'justify-center',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className={cn(!isMobile && isCollapsed && 'hidden')}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className={cn('border-t p-3 space-y-1', !isMobile && isCollapsed && 'hidden')}>
        <Link
          to="/settings"
          data-tour="settings-nav"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            location.pathname === '/settings'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground',
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </Link>

        <Separator className="my-2" />

        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </Button>
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
