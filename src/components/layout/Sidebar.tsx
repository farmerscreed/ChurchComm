import { useState } from 'react';
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
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  children?: {
    name: string;
    href: string;
    icon: any;
  }[];
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { signOut, currentOrganization } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(['people', 'communications']);

  const navigation: NavigationItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard
    },
    {
      name: "People",
      icon: Users,
      children: [
        { name: "Directory", href: "/people", icon: Users },
        { name: "Groups", href: "/groups", icon: UsersRound }
      ]
    },
    {
      name: "Communications",
      icon: MessageSquare,
      children: [
        { name: "Send Messages", href: "/communications", icon: MessageSquare },
        { name: "Call History", href: "/call-history", icon: PhoneCall }
      ]
    }
  ];

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">ChurchConnect</h2>
            {currentOrganization && (
              <p className="text-xs text-muted-foreground truncate">
                {currentOrganization.name}
              </p>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            isCollapsed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {navigation.map((item) => {
            if (item.children) {
              const isExpanded = expandedItems.includes(item.name.toLowerCase());

              return (
                <Collapsible
                  key={item.name}
                  open={isExpanded && !isCollapsed}
                  onOpenChange={() => toggleExpanded(item.name.toLowerCase())}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 h-auto px-3 py-2 text-sm font-medium",
                        "hover:bg-accent hover:text-accent-foreground",
                        "text-muted-foreground",
                        isCollapsed && "justify-center"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.name}</span>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  {!isCollapsed && (
                    <CollapsibleContent className="ml-6 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          to={child.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            location.pathname === child.href ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
                          )}
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </CollapsibleContent>
                  )}
                </Collapsible>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href || '#'}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.href ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground",
                  isCollapsed && "justify-center"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3 space-y-1">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            location.pathname === "/settings" ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            isCollapsed && "justify-center"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>

        <Separator className="my-2" />

        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-destructive",
            isCollapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );
}
