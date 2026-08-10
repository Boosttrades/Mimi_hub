import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Archive, Edit3, Eye, EyeOff, Filter, MoreHorizontal, PackagePlus, Search, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteProduct, useListProducts, getListProductsQueryKey } from '@workspace/api-client-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNaira } from '@/lib/utils/format';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const demoProducts = [
  { id: 901, name: 'Abeni Stoneware Vase', category: { name: 'Home & Living' }, price: 38500, discountPct: 0, stockQty: 12, inStock: true, visible: true, featured: true, coverImage: '' },
  { id: 902, name: 'Owanbe Silk Head Tie', category: { name: 'Style & Accessories' }, price: 24000, discountPct: 10, stockQty: 8, inStock: true, visible: true, featured: false, coverImage: '' },
  { id: 903, name: 'Lagos Dawn Body Oil', category: { name: 'Beauty & Wellness' }, price: 18500, discountPct: 0, stockQty: 0, inStock: false, visible: true, featured: true, coverImage: '' },
  { id: 904, name: 'Ìfẹ́ Beaded Hoops', category: { name: 'Style & Accessories' }, price: 12000, discountPct: 0, stockQty: 23, inStock: true, visible: false, featured: false, coverImage: '' },
];

export function AdminProducts() {
  const { data: remoteProducts, isLoading } = useListProducts();
  const products: any[] = remoteProducts?.length ? remoteProducts : demoProducts;
  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All pieces' | 'Featured' | 'Low stock'>('All pieces');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'All pieces' || (filter === 'Featured' ? product.featured : product.stockQty < 10);
    return matchesSearch && matchesFilter;
  }), [products, query, filter]);
  const productToDelete = products.find((product) => product.id === deleteId);
  const handleDelete = () => {
    if (!deleteId) return;
    deleteProduct.mutate({ id: deleteId }, { onSuccess: () => { toast.success('Product removed from your collection'); queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); setDeleteId(null); }, onError: () => toast.error('Could not remove this product') });
  };
  return (
    <AdminLayout title="Your collection" eyebrow="Workspace / products">
      <div className="admin-rise mb-8 flex flex-wrap items-end justify-between gap-5">
        <div><p className="max-w-lg text-sm leading-6 text-[hsl(var(--admin-ink)/.55)]">A considered edit of everything currently living in the MimiHub shop.</p></div>
        <Link href="/admin/products/new" data-testid="link-add-product"><Button className="h-11 gap-2 rounded-full bg-[hsl(var(--admin-deep))] px-5 text-[hsl(var(--background))] hover:bg-[hsl(var(--admin-teal))]"><PackagePlus className="h-4 w-4" /> Add product</Button></Link>
      </div>
      <div className="admin-rise admin-rise-1 mb-6 flex flex-col gap-4 rounded-[22px] border border-[hsl(var(--admin-deep)/.1)] bg-[hsl(var(--background)/.6)] p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--admin-ink)/.38)]" /><Input data-testid="input-search-products" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your collection" className="h-11 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0" /></div>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-[hsl(var(--admin-deep)/.06)] p-1"><Filter className="ml-2 mr-1 h-4 w-4 self-center text-[hsl(var(--admin-ink)/.45)]" />{(['All pieces', 'Featured', 'Low stock'] as const).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} data-testid={`button-filter-${item.toLowerCase().replace(' ', '-')}`} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors ${filter === item ? 'bg-[hsl(var(--background))] text-[hsl(var(--admin-deep))] shadow-sm' : 'text-[hsl(var(--admin-ink)/.5)]'}`}>{item}</button>)}</div>
      </div>
      <section className="admin-card admin-rise admin-rise-2 overflow-hidden rounded-[26px]">
        <div className="flex items-center justify-between border-b border-[hsl(var(--admin-deep)/.1)] px-5 py-5 sm:px-7"><div><p className="admin-label">{visibleProducts.length} pieces</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">The edit</h2></div><span className="admin-mono text-[10px] uppercase text-[hsl(var(--admin-ink)/.4)]">Last synced just now</span></div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full"><thead><tr className="border-b border-[hsl(var(--admin-deep)/.08)] text-left"><th className="admin-label px-7 py-4">Piece</th><th className="admin-label px-4 py-4">Price</th><th className="admin-label px-4 py-4">Stock</th><th className="admin-label px-4 py-4">Status</th><th className="admin-label px-7 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[hsl(var(--admin-deep)/.08)]">{isLoading ? [1, 2, 3].map((i) => <tr key={i}><td colSpan={5} className="p-7"><div className="h-10 animate-pulse rounded-xl bg-[hsl(var(--admin-deep)/.07)]" /></td></tr>) : visibleProducts.map((product) => <tr key={product.id} className="group transition-colors hover:bg-[hsl(var(--admin-deep)/.025)]" data-testid={`row-product-${product.id}`}><td className="px-7 py-4"><div className="flex items-center gap-3"><div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[hsl(var(--admin-gold)/.2)]">{product.coverImage ? <img src={product.coverImage} alt="" className="h-full w-full object-cover" /> : <PackagePlus className="h-5 w-5 text-[hsl(var(--admin-deep)/.5)]" />}{product.featured && <Star className="absolute bottom-1 right-1 h-3 w-3 fill-[hsl(var(--admin-gold))] text-[hsl(var(--admin-gold))]" />}</div><div><p className="text-sm font-extrabold text-[hsl(var(--admin-deep))]">{product.name}</p><p className="mt-1 text-[11px] text-[hsl(var(--admin-ink)/.45)]">{product.category?.name ?? 'Uncategorised'}</p></div></div></td><td className="px-4 py-4 text-sm font-extrabold text-[hsl(var(--admin-deep))]">{formatNaira(product.price)}{product.discountPct > 0 && <span className="ml-2 rounded-full bg-[hsl(var(--admin-coral)/.12)] px-2 py-1 text-[10px] text-[hsl(var(--admin-coral))]">-{product.discountPct}%</span>}</td><td className="px-4 py-4"><span className={`text-xs font-bold ${product.inStock ? 'text-[hsl(var(--admin-teal))]' : 'text-[hsl(var(--admin-coral))]'}`}>{product.inStock ? `${product.stockQty ?? 0} available` : 'Out of stock'}</span></td><td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--admin-ink)/.58)]">{product.visible ? <Eye className="h-3.5 w-3.5 text-[hsl(var(--admin-teal))]" /> : <EyeOff className="h-3.5 w-3.5" />}{product.visible ? 'Live in shop' : 'Hidden'}</span></td><td className="px-7 py-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => setLocation(`/admin/products/${product.id}/edit`)} data-testid={`button-edit-product-${product.id}`}><Edit3 className="h-4 w-4 text-[hsl(var(--admin-teal))]" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(product.id)} data-testid={`button-delete-product-${product.id}`}><Trash2 className="h-4 w-4 text-[hsl(var(--admin-coral))]" /></Button></div></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-[hsl(var(--admin-deep)/.08)] md:hidden">{visibleProducts.map((product) => <div key={product.id} className="flex items-center gap-3 p-4" data-testid={`card-product-${product.id}`}><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[hsl(var(--admin-gold)/.2)]"><PackagePlus className="h-5 w-5 text-[hsl(var(--admin-deep)/.5)]" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-[hsl(var(--admin-deep))]">{product.name}</p><p className="mt-1 text-xs text-[hsl(var(--admin-ink)/.48)]">{formatNaira(product.price)} · {product.inStock ? `${product.stockQty} available` : 'Out of stock'}</p></div><Button variant="ghost" size="icon" onClick={() => setLocation(`/admin/products/${product.id}/edit`)} data-testid={`button-mobile-edit-product-${product.id}`}><MoreHorizontal className="h-4 w-4" /></Button></div>)}</div>
        {!isLoading && !visibleProducts.length && <div className="px-6 py-16 text-center"><Archive className="mx-auto h-8 w-8 text-[hsl(var(--admin-teal)/.55)]" /><h3 className="mt-4 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">Nothing in this corner</h3><p className="mt-2 text-sm text-[hsl(var(--admin-ink)/.55)]">Try a different search or add a new piece to your collection.</p></div>}
      </section>
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this piece?</AlertDialogTitle><AlertDialogDescription>{productToDelete?.name} will be removed from your collection. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Remove product</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </AdminLayout>
  );
}