import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useAdmin } from '@/hooks/useAdmin';
import { LogoIcon } from '@/components/ui/Logo';
import {
  LayoutDashboard,
  Target,
  Building2,
  PhoneCall,
  ArrowLeft,
  LogOut,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminNav = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Lead Pipeline', href: '/admin/leads', icon: Target },
  { name: 'Customers', href: '/admin/customers', icon: Building2 },
  { name: 'Communications', href: '/admin/communications', icon: PhoneCall },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuthStore();
  const { isAdmin } = useAdmin();

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <span className="text-red-400 text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-semibold text-white">Not Authorized</h2>
          <p className="text-sm text-slate-400">You need admin privileges to access this area.</p>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="border-white/10 text-slate-300 hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Admin Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0a0f1e] border-r border-white/5 h-screen sticky top-0">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <LogoIcon className="w-8 h-8" />
            <div>
              <h1 className="text-lg font-bold text-white">KeepFlock</h1>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">Admin Console</p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 space-y-1">
          {adminNav.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
                  active
                    ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                )}
              >
                <item.icon className={cn('w-5 h-5', active ? 'text-indigo-400' : 'text-slate-500')} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 space-y-2 border-t border-white/5">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start gap-3 px-4 py-2.5 h-auto text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
          <p className="text-[10px] text-slate-600 font-mono px-2 pt-2">
            {user?.email}
          </p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a0f1e] border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoIcon className="w-7 h-7" />
            <span className="text-sm font-bold text-white">Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white h-8 px-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> App
          </Button>
        </div>
        {/* Mobile nav tabs */}
        <div className="flex gap-1 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
          {adminNav.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all',
                  active
                    ? 'bg-indigo-500/15 text-indigo-300'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-h-screen md:pt-0 pt-24">
        <Outlet />
      </main>
    </div>
  );
}
