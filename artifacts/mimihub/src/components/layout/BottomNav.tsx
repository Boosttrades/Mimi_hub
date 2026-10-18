import { useLocation } from 'wouter';
import { Home, LayoutGrid, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollVisibility } from '@/hooks/useScrollVisibility';

export function BottomNav() {
  const [location, navigate] = useLocation();
  const isVisible = useScrollVisibility();

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/categories', icon: LayoutGrid, label: 'Categories' },
    { href: '/account/orders', icon: Package, label: 'Orders' },
    { href: '/account', icon: User, label: 'Account' },
  ];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pt-2 md:hidden pointer-events-none transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex items-center justify-between max-w-md mx-auto pointer-events-auto">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? location === '/'
            : item.href === '/account'
              ? location === '/account'
              : location === item.href;

          const Icon = item.icon;

          return (
            <div
              key={item.href}
              onClick={() => navigate(item.href)}
              role="button"
              aria-label={item.label}
            >
              <div
                className="flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer"
                style={{
                  width: 44,
                  height: 44,
                  background: isActive
                    ? 'linear-gradient(145deg, hsl(43deg 88% 58%), hsl(43deg 76% 40%))'
                    : 'white',
                  boxShadow: isActive
                    ? '0 4px 16px rgba(175, 135, 35, 0.55)'
                    : '0 2px 10px rgba(0, 0, 0, 0.13)',
                }}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px]",
                    isActive ? "fill-current text-[#f5ecd8]" : "text-primary"
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
