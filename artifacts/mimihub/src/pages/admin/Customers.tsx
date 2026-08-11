import { useMemo, useState } from 'react';
import { Phone, RefreshCw, Search, UsersRound } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Input } from '@/components/ui/input';
import { useGetAdminSummary } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils/format';

export function AdminCustomers() {
  const [query, setQuery] = useState('');
  const { data: summary, isLoading, isError, refetch } = useGetAdminSummary();
  const customers = summary?.customers ?? [];
  const filtered = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.location}`.toLowerCase().includes(query.toLowerCase())), [customers, query]);
  const returningPercent = summary?.totalCustomers ? Math.round((summary.returningCustomers / summary.totalCustomers) * 100) : 0;
  return (
    <AdminLayout title="People who return" eyebrow="Workspace / customers">
      <div className="admin-rise mb-8 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div><p className="max-w-xl text-sm leading-6 text-[hsl(var(--admin-ink)/.55)]">Customers are derived from real orders in your store. Guest orders are grouped by phone number.</p></div>
        <div className="flex gap-3"><div className="rounded-2xl bg-[hsl(var(--admin-gold)/.2)] px-5 py-3"><p className="admin-label">All customers</p><p className="mt-1 text-2xl font-extrabold text-[hsl(var(--admin-deep))]">{isLoading ? '—' : summary?.totalCustomers ?? 0}</p></div><div className="rounded-2xl bg-[hsl(var(--admin-teal)/.1)] px-5 py-3"><p className="admin-label">Returning</p><p className="mt-1 text-2xl font-extrabold text-[hsl(var(--admin-teal))]">{isLoading ? '—' : `${returningPercent}%`}</p></div></div>
      </div>
      <section className="admin-card admin-rise admin-rise-1 overflow-hidden rounded-[26px]">
        <div className="flex flex-col gap-4 border-b border-[hsl(var(--admin-deep)/.1)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div><p className="admin-label">{filtered.length} shown</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">Your community</h2></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--admin-ink)/.38)]" /><Input data-testid="input-search-customers" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" className="h-10 rounded-xl border-[hsl(var(--admin-deep)/.12)] bg-[hsl(var(--background)/.6)] pl-9" /></div></div>
        {isError ? <div className="px-6 py-16 text-center"><RefreshCw className="mx-auto h-8 w-8 text-[hsl(var(--admin-coral)/.7)]" /><p className="mt-4 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">Customers could not be loaded</p><Button variant="outline" onClick={() => refetch()} className="mt-5 gap-2 rounded-full"><RefreshCw className="h-4 w-4" />Try again</Button></div> : isLoading ? <div className="divide-y divide-[hsl(var(--admin-deep)/.08)]">{[1, 2, 3].map((row) => <div key={row} className="flex animate-pulse items-center gap-4 px-5 py-5 sm:px-7"><div className="h-11 w-11 rounded-full bg-[hsl(var(--admin-deep)/.08)]" /><div className="h-4 w-1/2 rounded bg-[hsl(var(--admin-deep)/.08)]" /></div>)}</div> : <div className="divide-y divide-[hsl(var(--admin-deep)/.08)]">{filtered.map((customer) => <div key={customer.id} className="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-7" data-testid={`row-customer-${customer.id}`}><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[hsl(var(--admin-gold)/.2)] font-serif font-semibold text-[hsl(var(--admin-deep))]">{customer.name.split(' ').map((name) => name[0]).join('').slice(0, 2)}</div><div className="min-w-[170px] flex-1"><p className="text-sm font-extrabold text-[hsl(var(--admin-deep))]">{customer.name}</p><p className="mt-1 text-xs text-[hsl(var(--admin-ink)/.48)]">{customer.phone}</p></div><p className="hidden text-xs text-[hsl(var(--admin-ink)/.52)] lg:block">{customer.location}</p><div className="min-w-[90px] text-right"><p className="text-sm font-extrabold text-[hsl(var(--admin-deep))]">{formatNaira(customer.spend)}</p><p className="mt-1 text-[10px] text-[hsl(var(--admin-ink)/.45)]">{customer.orders} orders · joined {new Date(customer.firstOrderAt).toLocaleDateString()}</p></div><a href={`tel:${customer.phone}`} data-testid={`button-call-customer-${customer.id}`} className="grid h-9 w-9 place-items-center rounded-xl text-[hsl(var(--admin-teal))] hover:bg-[hsl(var(--admin-teal)/.08)]" aria-label={`Call ${customer.name}`}><Phone className="h-4 w-4" /></a></div>)}</div>}
         {!isLoading && !isError && !filtered.length && <div className="px-6 py-16 text-center"><UsersRound className="mx-auto h-8 w-8 text-[hsl(var(--admin-teal)/.55)]" /><p className="mt-4 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">{customers.length ? 'No matching customers' : 'No customers yet'}</p><p className="mt-2 text-sm text-[hsl(var(--admin-ink)/.55)]">{customers.length ? 'Try a different search.' : 'Customers will appear here after real orders are placed.'}</p></div>}
      </section>
    </AdminLayout>
  );
}