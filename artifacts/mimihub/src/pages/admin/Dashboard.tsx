import { Link } from 'wouter';
import { ArrowUpRight, ChevronRight, Clock3, Package, Plus, ShoppingBag, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from './AdminLayout';
import { useGetAdminSummary, useListOrders } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils/format';

function statusClass(status: string) {
  if (status === 'Delivered') return 'bg-[hsl(var(--admin-teal)/.12)] text-[hsl(var(--admin-teal))]';
  if (status === 'Preparing') return 'bg-[hsl(var(--admin-gold)/.18)] text-[hsl(var(--admin-deep))]';
  if (status === 'Shipping') return 'bg-[hsl(var(--admin-teal)/.1)] text-[hsl(var(--admin-teal))]';
  return 'bg-[hsl(var(--admin-coral)/.12)] text-[hsl(var(--admin-coral))]';
}

export function Dashboard() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useGetAdminSummary();
  const { data: apiOrders = [], isLoading: ordersLoading, isError: ordersError, refetch: refetchOrders } = useListOrders();
  const isLoading = summaryLoading || ordersLoading;
  const orders = apiOrders.slice(0, 5);
  const today = format(new Date(), "EEEE, MMMM d, yyyy / HH:mm 'WAT'");
  const displayValue = (value: string | number | undefined) => value === undefined ? '—' : value;
  const statCards = [
    { label: 'Collected revenue', value: summary ? formatNaira(summary.totalRevenue) : undefined, icon: TrendingUp },
    { label: 'Revenue this month', value: summary ? formatNaira(summary.thisMonthRevenue) : undefined, icon: TrendingUp },
    { label: 'Orders this month', value: summary?.thisMonthOrders, icon: ShoppingBag },
    { label: 'Open orders', value: summary?.pendingOrders, icon: Clock3 },
  ];
  return (
    <AdminLayout title="Dashboard" eyebrow={`Workspace / ${today}`}>
      <div className="admin-rise grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="relative overflow-hidden rounded-[28px] bg-[hsl(var(--admin-deep))] p-7 text-[hsl(var(--background))] shadow-[0_20px_60px_hsl(var(--admin-deep)/.2)] sm:p-10">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[28px] border-[hsl(var(--admin-gold)/.18)]" />
          <div className="absolute -bottom-24 right-24 h-44 w-44 rounded-full border-[16px] border-[hsl(var(--admin-coral)/.16)]" />
          <div className="relative max-w-xl">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--background)/.1)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--admin-gold))]"><Sparkles className="h-3.5 w-3.5" /> Your shop at a glance</span>
            <h2 className="max-w-md font-serif text-4xl font-semibold leading-[.98] tracking-[-.04em] sm:text-6xl">Your store at a glance.</h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[hsl(var(--background)/.66)]">
              Live totals from the catalog and orders currently stored for your shop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/admin/products/new" data-testid="link-dashboard-add-product"><Button className="h-11 gap-2 rounded-full bg-[hsl(var(--admin-gold))] px-5 text-[hsl(var(--admin-deep))] hover:bg-[hsl(var(--admin-gold)/.9)]"><Plus className="h-4 w-4" /> Add a product</Button></Link>
              <Link href="/admin/orders" data-testid="link-dashboard-orders" className="inline-flex h-11 items-center gap-2 rounded-full border border-[hsl(var(--background)/.2)] px-5 text-xs font-bold hover:bg-[hsl(var(--background)/.1)]">Open orders <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>
        <section className="admin-card rounded-[28px] p-6 sm:p-8">
          <div className="mb-8 flex items-start justify-between">
             <div><p className="admin-label">Live metrics</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">Store performance</h2></div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--admin-gold)/.2)] text-[hsl(var(--admin-deep))]"><TrendingUp className="h-5 w-5" /></div>
          </div>
          <div className="space-y-5">
            {statCards.map((item, index) => {
              const Icon = item.icon;
              return <div key={item.label} className="flex items-center gap-4" data-testid={`stat-${index}`}>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--admin-deep)/.08)] text-[hsl(var(--admin-teal))]"><Icon className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="text-xs text-[hsl(var(--admin-ink)/.55)]">{item.label}</p><p className="mt-0.5 text-xl font-extrabold tracking-[-.04em] text-[hsl(var(--admin-deep))]">{item.value}</p></div>
              </div>;
            })}
          </div>
        </section>
      </div>
      <div className="admin-rise admin-rise-1 mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <section className="admin-card overflow-hidden rounded-[28px]">
          <div className="flex items-center justify-between border-b border-[hsl(var(--admin-deep)/.1)] px-6 py-5 sm:px-8"><div><p className="admin-label">Fulfilment queue</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">Recent orders</h2></div><Link href="/admin/orders" data-testid="link-dashboard-view-all" className="flex items-center gap-1 text-xs font-bold text-[hsl(var(--admin-teal))]">View all <ChevronRight className="h-4 w-4" /></Link></div>
          <div className="divide-y divide-[hsl(var(--admin-deep)/.08)]">
             {isLoading ? [1, 2, 3].map((item) => <div key={item} className="flex animate-pulse items-center gap-4 px-6 py-5 sm:px-8"><div className="h-10 w-10 rounded-xl bg-[hsl(var(--admin-deep)/.08)]" /><div className="h-4 w-2/3 rounded bg-[hsl(var(--admin-deep)/.08)]" /></div>) : ordersError ? <div className="px-6 py-12 text-center sm:px-8"><RefreshCw className="mx-auto h-7 w-7 text-[hsl(var(--admin-coral)/.7)]" /><p className="mt-3 text-sm font-bold text-[hsl(var(--admin-deep))]">Recent orders could not be loaded.</p><Button variant="outline" onClick={() => refetchOrders()} className="mt-4 rounded-full">Try again</Button></div> : orders.map((order, index) => <div key={order.id} className="flex items-center gap-4 px-6 py-5 sm:px-8" data-testid={`row-recent-order-${index}`}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--admin-gold)/.16)] font-serif font-semibold text-[hsl(var(--admin-deep))]">{String(order.fullName ?? '—').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[hsl(var(--admin-deep))]">{order.fullName}</p><p className="admin-mono mt-1 text-[10px] text-[hsl(var(--admin-ink)/.45)]">{order.orderRef} · {format(new Date(order.createdAt), 'MMM d, h:mm a')}</p></div><div className="hidden text-right sm:block"><p className="text-sm font-extrabold text-[hsl(var(--admin-deep))]">{formatNaira(order.subtotal)}</p><span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(order.orderStatus)}`}>{order.orderStatus}</span></div><ChevronRight className="h-4 w-4 text-[hsl(var(--admin-ink)/.3)] sm:hidden" /></div>)}
             {!isLoading && !ordersError && !orders.length && <div className="px-6 py-12 text-center text-sm text-[hsl(var(--admin-ink)/.55)] sm:px-8">No orders have been placed yet.</div>}
          </div>
        </section>
          <section className="rounded-[28px] bg-[hsl(var(--admin-gold)/.17)] p-6 sm:p-8"><div className="mb-8 flex items-center justify-between"><p className="admin-label">Inventory pulse</p><Package className="h-5 w-5 text-[hsl(var(--admin-deep))]" /></div>{summaryError ? <><p className="font-serif text-3xl font-semibold leading-tight tracking-[-.04em] text-[hsl(var(--admin-deep))]">Inventory data unavailable.</p><p className="mt-4 text-sm leading-6 text-[hsl(var(--admin-ink)/.63)]">The dashboard is not substituting estimates for live catalog data.</p><Button variant="outline" onClick={() => refetchSummary()} className="mt-6 rounded-full">Try again</Button></> : <><p className="font-serif text-3xl font-semibold leading-tight tracking-[-.04em] text-[hsl(var(--admin-deep))]">{summaryLoading ? 'Loading inventory.' : `${summary?.lowStockProducts ?? 0} products low in stock.`}</p><p className="mt-4 text-sm leading-6 text-[hsl(var(--admin-ink)/.63)]">{summaryLoading ? 'Checking your live catalog.' : `Low stock is below ${summary?.lowStockThreshold ?? 5} units · ${summary?.outOfStockProducts ?? 0} out of stock · ${summary?.hiddenProducts ?? 0} unpublished`}</p><Link href="/admin/products" className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--admin-teal))]">Review products <ArrowUpRight className="h-4 w-4" /></Link></>}</section>
      </div>
    </AdminLayout>
  );
}