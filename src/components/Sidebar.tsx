import { NavLink, useLocation } from 'react-router-dom';
import { Home, ArrowRightLeft, Target, TrendingUp, Settings, LogOut, User, Wallet, Clock, Link, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useValidationStats } from '@/hooks/useValidationStats';
import { useSettings } from '@/hooks/useSettings';

const PendingBadges = () => {
  const { pendingMappingCount, pendingCategoryCount, pendingValidationCount, duplicateGroupCount } = useValidationStats();

  // If no pending actions, don't render anything
  if (pendingMappingCount === 0 && pendingCategoryCount === 0 && pendingValidationCount === 0 && duplicateGroupCount === 0) {
    return null;
  }

  // Create array of active badges to render
  const badges = [
    { type: 'mapping', count: pendingMappingCount, color: 'bg-yellow-500', zIndex: 10, label: 'Pending Mapping' },
    { type: 'category', count: pendingCategoryCount, color: 'bg-orange-500', zIndex: 20, label: 'Pending Category' },
    { type: 'validation', count: pendingValidationCount, color: 'bg-indigo-500', zIndex: 25, label: 'Pending Validation' },
    { type: 'duplicate', count: duplicateGroupCount, color: 'bg-red-500', zIndex: 30, label: 'Duplicates' }
  ].filter(b => b.count > 0);

  return (
    <div className="ml-auto flex items-center pl-2">
      <div className="flex -space-x-2">
        {badges.map((badge, index) => (
          <Tooltip key={badge.type}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-sm ring-2 ring-zinc-950",
                  badge.color
                )}
                style={{ zIndex: badge.zIndex }}
              >
                {badge.count > 9 ? '9+' : badge.count}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[10px] font-bold">
              {badge.label}: {badge.count}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

const ReconciliationBadge = () => {
  const { reconciliationCount } = useValidationStats();

  if (!reconciliationCount || reconciliationCount === 0) return null;

  return (
    <div className="ml-auto flex items-center pl-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-sm ring-2 ring-zinc-950 bg-blue-500"
          >
            {reconciliationCount > 99 ? '99+' : reconciliationCount}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-[10px] font-bold">
          Pending Reconciliation: {reconciliationCount}
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

const navItems = [
  { to: '/', label: 'Overview', icon: Home },
  { to: '/budget', label: 'Budget', icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: ArrowRightLeft, restricted: true },
  { to: '/transactions/validation', label: 'Pending Action', icon: Clock, restricted: true },
  { to: '/reconciliation', label: 'Reconciliation', icon: Link, restricted: true },
  { to: '/projection', label: 'Projection', icon: TrendingUp, restricted: true },
];

export const Sidebar = () => {
  const { signOut, user } = useAuth();
  const { userProfile } = useProfile();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn(
      "bg-zinc-950 h-screen flex flex-col transition-all duration-300 sticky top-0 z-40 overflow-hidden shadow-2xl",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Brand Section */}
      <div className={cn(
        "p-6 h-20 flex items-center justify-between bg-zinc-900/40",
        isCollapsed && "px-0 justify-center"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 pl-2">
            <div className="h-8 w-8 bg-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">MiBUDGET</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800/50", !isCollapsed && "mr-2")}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-4 mb-4">
          <Button
            className={cn(
              "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-900/20 group/add",
              isCollapsed ? "h-10 w-10 mx-auto px-0 justify-center rounded-xl" : "h-10 px-4 justify-start rounded-xl"
            )}
            onClick={() => window.dispatchEvent(new CustomEvent('open-add-transaction'))}
          >
            <Plus className={cn("h-5 w-5 shrink-0 transition-transform group-hover/add:scale-110", !isCollapsed && "mr-3")} />
            {!isCollapsed && "Add Transaction"}
          </Button>
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => {
            if (userProfile?.role === 'restrict' && item.restricted) return null;
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={cn(
                    "flex items-center px-6 py-4 text-sm font-bold transition-all duration-200 group relative",
                    isActive
                      ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-500'
                      : 'text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900/50'
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-all duration-200",
                    !isCollapsed && "mr-3",
                    isActive && "text-teal-400"
                  )} />
                  {!isCollapsed && <span>{item.label}</span>}

                  {!isCollapsed && item.label === 'Pending Action' && (
                    <PendingBadges />
                  )}

                  {!isCollapsed && item.label === 'Reconciliation' && (
                    <ReconciliationBadge />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>

        {userProfile?.role !== 'restrict' && (
          <div className="mt-8">
            {!isCollapsed && (
              <p className="px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">
                System
              </p>
            )}
            <NavLink
              to="/settings"
              className={cn(
                "flex items-center px-6 py-3 text-sm font-bold transition-all duration-200",
                location.pathname === '/settings'
                  ? "bg-zinc-900 text-teal-400 border-l-4 border-teal-500"
                  : "text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900/50"
              )}
            >
              <Settings className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
              {!isCollapsed && "Settings"}
            </NavLink>
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className={cn(
        "p-4 border-t border-zinc-800/50 mt-auto bg-zinc-950",
        isCollapsed && "p-2 items-center"
      )}>
        <div className={cn("flex items-center gap-3 px-2 mb-4", isCollapsed && "justify-center px-0")}>
          <div className="relative">
            <Avatar className="h-10 w-10 border border-zinc-800 shadow-xl overflow-hidden">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-zinc-900 text-teal-400 font-bold">
                {userProfile?.full_name ? getInitials(userProfile.full_name) : <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-teal-500 border-2 border-zinc-950 shadow-sm" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-zinc-100 truncate leading-none mb-1">
                {userProfile?.full_name || 'User'}
              </span>
              <span className="text-[10px] text-zinc-500 truncate font-medium">
                {user?.email}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-zinc-500 font-bold hover:text-pink-400 hover:bg-pink-500/5 transition-colors",
              isCollapsed && "justify-center p-0 h-10 w-10 mx-auto font-normal"
            )}
            onClick={() => signOut()}
          >
            <LogOut className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
            {!isCollapsed && "Sign Out"}
          </Button>

          {!isCollapsed && (
            <Button
              variant="outline"
              className="w-full justify-start text-[9px] h-6 opacity-30 hover:opacity-100 border-zinc-800 text-zinc-600 hover:text-teal-400 hover:border-teal-500/30 font-black uppercase tracking-tight transition-all"
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
              }}
            >
              System Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
