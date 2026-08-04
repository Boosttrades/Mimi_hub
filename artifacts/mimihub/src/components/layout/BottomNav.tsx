import { Link, useLocation } from 'wouter';
import { Home, LayoutGrid, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/categories', icon: LayoutGrid, label: 'Categories' },
    { href: '/account?tab=orders', icon: Package, label: 'Orders' },
    { href: '/account', icon: User, label: 'Account' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-primary/10 px-6 py-3 pb-safe md:hidden">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {navItems.map((item) => {
          // Precise matching for home, startsWith for others
          const isActive = item.href === '/' 
            ? location === '/'
            : location.startsWith(item.href.split('?')[0]);

          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 cursor-pointer",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={cn("h-6 w-6", isActive && "fill-current")} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
