
import { NavLink } from 'react-router-dom';
import { BarChart3, CreditCard, Target, TrendingUp, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

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
    ]
  },
  { to: '/reconciliation', label: 'Reconciliation', icon: CreditCard },
  { to: '/projection', label: 'Projection', icon: TrendingUp },
];

export const Sidebar = () => {
  const { signOut, user } = useAuth();

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col transition-colors duration-300">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">MiBudget</h1>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-4">
          {navItems.map((item) => (
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
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground" asChild>
          <NavLink to="/settings">
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </NavLink>
        </Button>

        <div className="pt-2 border-t border-border">
          <div className="text-[10px] text-muted-foreground mb-2 px-2 font-bold uppercase tracking-widest truncate">
            {user?.email}
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
