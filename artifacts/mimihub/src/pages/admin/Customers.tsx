import { useMemo, useState } from 'react';
import { Mail, MoreHorizontal, Search, UsersRound } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Input } from '@/components/ui/input';

const customers = [
  { id: 1, name: 'Amaka Nwosu', email: 'amaka.nwosu@gmail.com', location: 'Lagos, NG', orders: 8, spend: '₦286,500', joined: 'Jan 2024', initials: 'AN', tone: 'gold' },
  { id: 2, name: 'Tobi Adeyemi', email: 'tobi.adeyemi@gmail.com', location: 'Abuja, NG', orders: 5, spend: '₦174,000', joined: 'Mar 2024', initials: 'TA', tone: 'teal' },
  { id: 3, name: 'Nneka Okafor', email: 'nneka.okafor@gmail.com', location: 'Enugu, NG', orders: 11, spend: '₦412,000', joined: 'Oct 2023', initials: 'NO', tone: 'coral' },
  { id: 4, name: 'Seyi Balogun', email: 'seyi.balogun@gmail.com', location: 'Ibadan, NG', orders: 3, spend: '₦78,500', joined: 'Jun 2024', initials: 'SB', tone: 'gold' },
  { id: 5, name: 'Ifeoma Eze', email: 'ifeoma.eze@gmail.com', location: 'Port Harcourt, NG', orders: 6, spend: '₦205,900', joined: 'Aug 2023', initials: 'IE', tone: 'teal' },
];

export function AdminCustomers() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <AdminLayout title="People who return" eyebrow="Workspace / customers">
      <div className="admin-rise mb-8 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div><p className="max-w-xl text-sm leading-6 text-[hsl(var(--admin-ink)/.55)]">A small, thoughtful view of the people choosing MimiHub again and again. Sample records for this workspace.</p></div>
        <div className="flex gap-3"><div className="rounded-2xl bg-[hsl(var(--admin-gold)/.2)] px-5 py-3"><p className="admin-label">All customers</p><p className="mt-1 text-2xl font-extrabold text-[hsl(var(--admin-deep))]">128</p></div><div className="rounded-2xl bg-[hsl(var(--admin-teal)/.1)] px-5 py-3"><p className="admin-label">Returning</p><p className="mt-1 text-2xl font-extrabold text-[hsl(var(--admin-teal))]">38%</p></div></div>
      </div>
      <section className="admin-card admin-rise admin-rise-1 overflow-hidden rounded-[26px]">
        <div className="flex flex-col gap-4 border-b border-[hsl(var(--admin-deep)/.1)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div><p className="admin-label">{filtered.length} shown</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">Your community</h2></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--admin-ink)/.38)]" /><Input data-testid="input-search-customers" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" className="h-10 rounded-xl border-[hsl(var(--admin-deep)/.12)] bg-[hsl(var(--background)/.6)] pl-9" /></div></div>
        <div className="divide-y divide-[hsl(var(--admin-deep)/.08)]">{filtered.map((customer) => <div key={customer.id} className="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-7" data-testid={`row-customer-${customer.id}`}><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full font-serif font-semibold ${customer.tone === 'teal' ? 'bg-[hsl(var(--admin-teal)/.14)] text-[hsl(var(--admin-teal))]' : customer.tone === 'coral' ? 'bg-[hsl(var(--admin-coral)/.13)] text-[hsl(var(--admin-coral))]' : 'bg-[hsl(var(--admin-gold)/.2)] text-[hsl(var(--admin-deep))]'}`}>{customer.initials}</div><div className="min-w-[170px] flex-1"><p className="text-sm font-extrabold text-[hsl(var(--admin-deep))]">{customer.name}</p><p className="mt-1 text-xs text-[hsl(var(--admin-ink)/.48)]">{customer.email}</p></div><p className="hidden text-xs text-[hsl(var(--admin-ink)/.52)] lg:block">{customer.location}</p><div className="min-w-[90px] text-right"><p className="text-sm font-extrabold text-[hsl(var(--admin-deep))]">{customer.spend}</p><p className="mt-1 text-[10px] text-[hsl(var(--admin-ink)/.45)]">{customer.orders} orders</p></div><button type="button" data-testid={`button-email-customer-${customer.id}`} onClick={() => window.location.href = `mailto:${customer.email}`} className="grid h-9 w-9 place-items-center rounded-xl text-[hsl(var(--admin-teal))] hover:bg-[hsl(var(--admin-teal)/.08)]" aria-label={`Email ${customer.name}`}><Mail className="h-4 w-4" /></button><button type="button" data-testid={`button-more-customer-${customer.id}`} className="grid h-9 w-9 place-items-center rounded-xl text-[hsl(var(--admin-ink)/.35)] hover:bg-[hsl(var(--admin-deep)/.06)]" aria-label={`More actions for ${customer.name}`}><MoreHorizontal className="h-4 w-4" /></button></div>)}</div>
        {!filtered.length && <div className="px-6 py-16 text-center"><UsersRound className="mx-auto h-8 w-8 text-[hsl(var(--admin-teal)/.55)]" /><p className="mt-4 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">No one by that name yet</p></div>}
      </section>
    </AdminLayout>
  );
}