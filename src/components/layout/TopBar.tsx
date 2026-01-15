import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/authStore';
import { Search, User, Settings, LogOut, Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const user = useAuthStore(state => state.user);
  const signOut = useAuthStore(state => state.signOut);
  const navigate = useNavigate();
  const [searchVisible, setSearchVisible] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'U';

  if (!user) {
    return (
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between h-full px-4">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </header>
    );
  }

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center justify-between h-full px-4">
        {/* Hamburger Menu (Mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Search */}
        <div className="flex-1 flex justify-center px-4">
          <div className="w-full max-w-md">
            {/* Mobile search - shows as icon */}
            <div className="relative md:hidden">
              <Button variant="ghost" size="icon" className="w-full justify-end" onClick={() => setSearchVisible(true)}>
                <Search className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>

            {/* Desktop search - always visible */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search people, groups..."
                className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>
        </div>


        {/* User Menu */}
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.user_metadata?.first_name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Search Overlay */}
        {searchVisible && (
          <div className="absolute top-0 left-0 w-full h-full bg-background flex items-center px-4 md:hidden">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                autoFocus
                className="w-full pl-10 pr-10 py-2 bg-transparent border-b-2 border-primary focus:outline-none"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 transform -translate-y-1/2"
                onClick={() => setSearchVisible(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
