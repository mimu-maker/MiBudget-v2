
import { NavLink } from 'react-router-dom';
import { BarChart3, CreditCard, Target, TrendingUp, Settings, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  {
    to: '/', label: 'Overview', icon: BarChart3, subItems: [
      { to: '/special', label: 'Special', icon: TrendingUp },
      { to: '/klintemarken', label: 'Klintemarken', icon: TrendingUp },
    ]
  },
  { to: '/budget', label: 'Budget', icon: Target },
  {
    to: '/transactions',
    label: 'Transactions',
    icon: CreditCard,
    subItems: [
      { to: '/transactions/validation', label: 'Validation', icon: CreditCard },
    ],
    restricted: true
  },
  { to: '/reconciliation', label: 'Reconciliation', icon: CreditCard, restricted: true },
  { to: '/projection', label: 'Projection', icon: TrendingUp, restricted: true },
];

export const Sidebar = () => {
  const { signOut, user } = useAuth();
  const { userProfile } = useProfile();

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
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col transition-colors duration-300">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">MiBudget</h1>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-4">
          {navItems.filter(item => {
            if (userProfile?.role === 'restrict' && item.restricted) return false;
            return true;
          }).map((item) => (
            <li key={item.to} className="space-y-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${isActive && !item.subItems
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </NavLink>

              {item.subItems && (
                <ul className="ml-10 space-y-1">
                  {item.subItems.map((sub) => (
                    <li key={sub.to}>
                      <NavLink
                        to={sub.to}
                        className={({ isActive }) =>
                          `flex items-center px-3 py-2 text-xs font-medium rounded-md transition-all ${isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          }`
                        }
                      >
                        {sub.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-border mt-auto space-y-2">
        {userProfile?.role !== 'restrict' && (
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground" asChild>
            <NavLink to="/settings">
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </NavLink>
          </Button>
        )}

        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-3 px-2 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>{userProfile?.full_name ? getInitials(userProfile.full_name) : <User className="h-4 w-4" />}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">
                {userProfile?.full_name || 'Loading...'}
              </span>
              <span className="text-[10px] text-muted-foreground truncate opacity-70">
                {user?.email}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-400 hover:bg-red-50/10"
            onClick={() => {
              console.log('Sign Out button clicked');
              signOut();
            }}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>



          {/* Debug sign out button */}
          <Button
            variant="outline"
            className="w-full justify-start text-xs"
            onClick={() => {
              console.log('Debug: Force sign out');
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/';
            }}
          >
            Debug: Force Clear
          </Button>

        </div>
      </div>
    </div>
  );
};
