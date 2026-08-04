import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Package, Tags, ShoppingCart, Home, Settings, Crown, LogOut, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
    { href: '/admin/products', icon: Package, label: 'Products' },
    { href: '/admin/categories', icon: Tags, label: 'Categories' },
    { href: '/admin/homepage', icon: Home, label: 'Homepage' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border w-64">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 text-primary">
          <Crown className="h-6 w-6" />
          <span className="font-serif font-bold text-xl tracking-[0.15em]">ADMIN</span>
        </div>
      </div>
      <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = item.href === '/admin' ? location === '/admin' : location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer",
                isActive ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <Link href="/">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer">
            <LogOut className="h-5 w-5" />
            View Store
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background/50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-50">
        <NavContent />
      </div>

      <div className="flex-1 flex flex-col md:ml-64 w-full">
        {/* Mobile Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:hidden sticky top-0 z-40">
          <div className="flex items-center gap-2 text-primary">
            <Crown className="h-5 w-5" />
            <span className="font-serif font-bold tracking-[0.1em]">ADMIN</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 text-foreground">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-0">
              <SheetHeader className="sr-only"><SheetTitle>Admin Menu</SheetTitle></SheetHeader>
              <NavContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Top bar (Desktop) */}
        <header className="h-16 border-b border-border bg-card hidden md:flex items-center justify-between px-8 sticky top-0 z-30">
          <h1 className="font-serif text-2xl text-foreground">{title}</h1>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <div className="md:hidden mb-6">
            <h1 className="font-serif text-2xl text-foreground">{title}</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
