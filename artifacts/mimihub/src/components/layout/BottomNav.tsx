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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pt-2 md:hidden pointer-events-none">
      <div className="flex items-center justify-between max-w-md mx-auto pointer-events-auto">
        {navItems.map((item) => {
          // Precise matching for home, startsWith for others
          const isActive = item.href === '/'
            ? location === '/'
            : item.href.includes('?tab=orders')
              // Orders tab: active only when on /account with tab=orders
              ? location === '/account' && new URLSearchParams(window.location.search).get('tab') === 'orders'
              // Account tab: active on /account but NOT when tab=orders is set
              : item.href === '/account'
                ? location === '/account' && new URLSearchParams(window.location.search).get('tab') !== 'orders'
                : location.startsWith(item.href.split('?')[0]);

          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className="flex items-center justify-center rounded-full bg-primary transition-all duration-200 cursor-pointer"
                style={{ width: 38, height: 38, boxShadow: '0 4px 14px rgba(201,168,76,0.45)' }}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-[#f5ecd8]" : "text-white")} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
