import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ChevronRight, Crown, ExternalLink, LayoutDashboard, Menu,
  Package, Settings, ShoppingBag, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useGetStoreSettings } from '@workspace/api-client-react';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  eyebrow?: string;
}

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', note: 'Pulse of the shop' },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders', note: 'Fulfilment queue' },
  { href: '/admin/products', icon: Package, label: 'Products', note: 'Your collection' },
  { href: '/admin/customers', icon: Users, label: 'Customers', note: 'People who return' },
];

function NavLinks({ location, onNavigate }: { location: string; onNavigate?: () => void }) {
  return (
    <div className="space-y-7">
      <div>
        <p className="admin-label mb-3 px-3">Workspace</p>
        <nav className="space-y-1" aria-label="Workspace navigation">
          {navItems.map((item) => {
            const active = item.href === '/admin' ? location === '/admin' : location.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                data-testid={`link-admin-${item.label.toLowerCase()}`}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl px-3 py-3.5 transition-all duration-200',
                  active
                    ? 'bg-[hsl(var(--admin-deep))] text-[hsl(var(--background))] shadow-[0_8px_20px_hsl(var(--admin-deep)/.18)]'
                    : 'text-[hsl(var(--admin-ink)/.62)] hover:bg-[hsl(var(--admin-deep)/.07)] hover:text-[hsl(var(--admin-deep))]'
                )}
              >
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', active ? 'bg-[hsl(var(--admin-gold))] text-[hsl(var(--admin-deep))]' : 'bg-[hsl(var(--admin-deep)/.08)]')}>
                  <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className={cn('mt-0.5 block truncate text-[10px]', active ? 'text-[hsl(var(--background)/.62)]' : 'text-[hsl(var(--admin-ink)/.42)]')}>{item.note}</span>
                </span>
                {active && <ChevronRight className="h-4 w-4 opacity-60" />}
              </Link>
            );
          })}
        </nav>
      </div>
      <div>
        <p className="admin-label mb-3 px-3">Manage</p>
        <nav className="space-y-1" aria-label="Management navigation">
          <Link
            href="/admin/settings"
            onClick={onNavigate}
            data-testid="link-admin-settings"
            className={cn('flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition-colors', location.startsWith('/admin/settings') ? 'bg-[hsl(var(--admin-gold)/.18)] text-[hsl(var(--admin-deep))]' : 'text-[hsl(var(--admin-ink)/.58)] hover:bg-[hsl(var(--admin-deep)/.07)]')}
          >
            <Settings className="h-[17px] w-[17px]" strokeWidth={1.8} />
            Settings
          </Link>
        </nav>
      </div>
    </div>
  );
}

function Sidebar({ location }: { location: string }) {
  return (
    <aside className="hidden w-[278px] shrink-0 border-r border-[hsl(var(--admin-deep)/.12)] bg-[hsl(var(--admin-sand)/.48)] lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-7 pb-8 pt-8">
        <div className="grid h-11 w-11 place-items-center rounded-[15px] bg-[hsl(var(--admin-deep))] text-[hsl(var(--admin-gold))] shadow-lg shadow-[hsl(var(--admin-deep)/.2)]">
          <Crown className="h-5 w-5" strokeWidth={1.7} />
        </div>
        <div>
          <p className="font-serif text-2xl font-semibold tracking-[-.04em] text-[hsl(var(--admin-deep))]">MimiHub</p>
          <p className="admin-label text-[9px]">Merchant studio</p>
        </div>
      </div>
      <div className="flex-1 px-4"><NavLinks location={location} /></div>
      <div className="m-4 rounded-2xl bg-[hsl(var(--admin-deep))] p-4 text-[hsl(var(--background))]">
        <div className="mb-8 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--admin-gold))]" />
          <span className="admin-mono text-[10px] uppercase tracking-[.1em] text-[hsl(var(--background)/.72)]">Store is live</span>
        </div>
        <p className="font-serif text-lg leading-tight">A beautiful shop is a daily practice.</p>
        <Link href="/" data-testid="link-view-store" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--admin-gold))] hover:underline">
          View live store <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  );
}

export function AdminLayout({ children, title, eyebrow = 'MimiHub / merchant studio' }: AdminLayoutProps) {
  const [location] = useLocation();
  const { data: storeSettings } = useGetStoreSettings();
  const storeName = storeSettings?.storeName || 'Store';
  const initials = storeName.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="admin-shell min-h-[100dvh]">
      <div className="flex min-h-[100dvh]">
        <Sidebar location={location} />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[hsl(var(--admin-deep)/.1)] bg-[hsl(var(--admin-surface)/.84)] px-4 backdrop-blur-xl sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="grid h-10 w-10 place-items-center rounded-xl border border-[hsl(var(--admin-deep)/.12)] text-[hsl(var(--admin-deep))] lg:hidden" aria-label="Open admin navigation" data-testid="button-open-admin-nav">
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[290px] border-0 bg-[hsl(var(--admin-sand))] p-0">
                  <SheetHeader className="sr-only"><SheetTitle>Merchant studio navigation</SheetTitle></SheetHeader>
                  <div className="flex items-center gap-3 px-6 pb-8 pt-8">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--admin-deep))] text-[hsl(var(--admin-gold))]"><Crown className="h-5 w-5" /></div>
                    <p className="font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">MimiHub</p>
                  </div>
                  <div className="px-4"><NavLinks location={location} /></div>
                </SheetContent>
              </Sheet>
              <div>
                <p className="admin-label hidden text-[9px] sm:block">{eyebrow}</p>
                <h1 className="font-serif text-[25px] font-semibold tracking-[-.035em] text-[hsl(var(--admin-deep))] sm:text-[30px]">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                 <p className="max-w-[140px] truncate text-xs font-bold text-[hsl(var(--admin-deep))]">{storeName}</p>
                 <p className="admin-mono text-[9px] uppercase text-[hsl(var(--admin-ink)/.45)]">Store</p>
              </div>
               <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-[hsl(var(--admin-gold))] bg-[hsl(var(--admin-gold)/.18)] font-serif font-semibold text-[hsl(var(--admin-deep))]" aria-label={`${storeName} store`}>{initials}</div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-8 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}