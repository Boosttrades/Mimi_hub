import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Archive,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Filter,
  MoreHorizontal,
  PackagePlus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListProductsQueryKey,
  useDeleteProduct,
  useGetStoreSettings,
  useListProducts,
  useUpdateProduct,
} from '@workspace/api-client-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNaira } from '@/lib/utils/format';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ProductFilter = 'All products' | 'Featured' | 'Low stock' | 'Out of stock' | 'Unpublished';

export function AdminProducts() {
  const { data: products = [], isLoading, isError, refetch } = useListProducts();
  const { data: storeSettings } = useGetStoreSettings();
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProductFilter>('All products');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const lowStockThreshold = storeSettings?.lowStockThreshold ?? 5;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.category?.name?.toLowerCase().includes(normalizedQuery);
      const matchesFilter =
        filter === 'All products' ||
        (filter === 'Featured' && product.featured) ||
        (filter === 'Low stock' &&
          product.inStock &&
          (product.stockQty ?? 0) > 0 &&
          (product.stockQty ?? 0) < lowStockThreshold) ||
        (filter === 'Out of stock' && (!product.inStock || (product.stockQty ?? 0) <= 0)) ||
        (filter === 'Unpublished' && !product.visible);

      return matchesSearch && matchesFilter;
    });
  }, [filter, lowStockThreshold, products, query]);

  const productToDelete = products.find((product) => product.id === deleteId);

  const handleDelete = () => {
    if (deleteId === null) return;

    deleteProduct.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast.success('Product deleted');
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setDeleteId(null);
        },
        onError: () => toast.error('Could not delete this product'),
      },
    );
  };

  const handleVisibilityChange = (id: number, visible: boolean) => {
    updateProduct.mutate(
      { id, data: { visible } },
      {
        onSuccess: () => {
          toast.success(visible ? 'Product published' : 'Product unpublished');
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
        onError: () => toast.error('Could not update product visibility'),
      },
    );
  };

  return (
    <AdminLayout title="Products" eyebrow="Workspace / products">
      <div className="admin-rise mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="max-w-lg text-sm leading-6 text-[hsl(var(--admin-ink)/.55)]">
            Manage the products currently stored in your MimiHub catalog.
          </p>
        </div>
        <Link href="/admin/products/new" data-testid="link-add-product">
          <Button className="h-11 gap-2 rounded-full bg-[hsl(var(--admin-deep))] px-5 text-[hsl(var(--background))] hover:bg-[hsl(var(--admin-teal))]">
            <PackagePlus className="h-4 w-4" />
            Add product
          </Button>
        </Link>
      </div>

      <div className="admin-rise admin-rise-1 mb-6 flex flex-col gap-4 rounded-[22px] border border-[hsl(var(--admin-deep)/.1)] bg-[hsl(var(--background)/.6)] p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--admin-ink)/.38)]" />
          <Input
            data-testid="input-search-products"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products or categories"
            className="h-11 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-[hsl(var(--admin-deep)/.06)] p-1">
          <Filter className="ml-2 mr-1 h-4 w-4 self-center text-[hsl(var(--admin-ink)/.45)]" />
          {(['All products', 'Featured', 'Low stock', 'Out of stock', 'Unpublished'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              data-testid={`button-filter-${item.toLowerCase().replaceAll(' ', '-')}`}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                filter === item
                  ? 'bg-[hsl(var(--background))] text-[hsl(var(--admin-deep))] shadow-sm'
                  : 'text-[hsl(var(--admin-ink)/.5)]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <section className="admin-card admin-rise admin-rise-2 overflow-hidden rounded-[26px]">
        <div className="flex items-center justify-between border-b border-[hsl(var(--admin-deep)/.1)] px-5 py-5 sm:px-7">
          <div>
            <p className="admin-label">{isLoading ? 'Loading' : `${filteredProducts.length} shown`}</p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">
              All products
            </h2>
          </div>
          {!isLoading && !isError && (
            <span className="admin-mono text-[10px] uppercase text-[hsl(var(--admin-ink)/.4)]">
              {products.length} total
            </span>
          )}
        </div>

        {isError ? (
          <div className="px-6 py-16 text-center">
            <RefreshCw className="mx-auto h-8 w-8 text-[hsl(var(--admin-coral)/.7)]" />
            <h3 className="mt-4 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">
              Products could not be loaded
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[hsl(var(--admin-ink)/.55)]">
              We could not reach the product catalog. Nothing is being shown until the real data is available.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              className="mt-5 gap-2 rounded-full"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--admin-deep)/.08)] text-left">
                    <th className="admin-label px-7 py-4">Product</th>
                    <th className="admin-label px-4 py-4">Price</th>
                    <th className="admin-label px-4 py-4">Stock</th>
                    <th className="admin-label px-4 py-4">Status</th>
                    <th className="admin-label px-7 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--admin-deep)/.08)]">
                  {isLoading
                    ? [1, 2, 3].map((row) => (
                        <tr key={row}>
                          <td colSpan={5} className="p-7">
                            <div className="h-10 animate-pulse rounded-xl bg-[hsl(var(--admin-deep)/.07)]" />
                          </td>
                        </tr>
                      ))
                    : filteredProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="group transition-colors hover:bg-[hsl(var(--admin-deep)/.025)]"
                          data-testid={`row-product-${product.id}`}
                        >
                          <td className="px-7 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[hsl(var(--admin-gold)/.2)]">
                                {product.coverImage ? (
                                  <img src={product.coverImage} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <PackagePlus className="h-5 w-5 text-[hsl(var(--admin-deep)/.5)]" />
                                )}
                                {product.featured && (
                                  <Star className="absolute bottom-1 right-1 h-3 w-3 fill-[hsl(var(--admin-gold))] text-[hsl(var(--admin-gold))]" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-extrabold text-[hsl(var(--admin-deep))]">{product.name}</p>
                                <p className="mt-1 text-[11px] text-[hsl(var(--admin-ink)/.45)]">
                                  {product.category?.name ?? 'Uncategorised'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm font-extrabold text-[hsl(var(--admin-deep))]">
                            {formatNaira(product.price)}
                            {(product.discountPct ?? 0) > 0 && (
                              <span className="ml-2 rounded-full bg-[hsl(var(--admin-coral)/.12)] px-2 py-1 text-[10px] text-[hsl(var(--admin-coral))]">
                                -{product.discountPct}%
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-xs font-bold ${product.inStock && (product.stockQty ?? 0) > 0 ? 'text-[hsl(var(--admin-teal))]' : 'text-[hsl(var(--admin-coral))]'}`}>
                              {product.inStock && (product.stockQty ?? 0) > 0 ? `${product.stockQty ?? 0} available` : 'Out of stock'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => handleVisibilityChange(product.id, !product.visible)}
                              disabled={updateProduct.isPending}
                              data-testid={`button-toggle-product-${product.id}`}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--admin-ink)/.58)] transition-colors hover:text-[hsl(var(--admin-teal))] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {product.visible ? (
                                <Eye className="h-3.5 w-3.5 text-[hsl(var(--admin-teal))]" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                              {product.visible ? 'Published' : 'Unpublished'}
                            </button>
                          </td>
                          <td className="px-7 py-4">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLocation(`/admin/products/${product.id}/edit`)}
                                data-testid={`button-edit-product-${product.id}`}
                                aria-label={`Edit ${product.name}`}
                              >
                                <Edit3 className="h-4 w-4 text-[hsl(var(--admin-teal))]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(product.id)}
                                data-testid={`button-delete-product-${product.id}`}
                                aria-label={`Delete ${product.name}`}
                              >
                                <Trash2 className="h-4 w-4 text-[hsl(var(--admin-coral))]" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[hsl(var(--admin-deep)/.08)] md:hidden">
              {isLoading
                ? [1, 2, 3].map((row) => (
                    <div key={row} className="p-4">
                      <div className="h-14 animate-pulse rounded-xl bg-[hsl(var(--admin-deep)/.07)]" />
                    </div>
                  ))
                : filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-4"
                      data-testid={`card-product-${product.id}`}
                    >
                      <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[hsl(var(--admin-gold)/.2)]">
                        {product.coverImage ? (
                          <img src={product.coverImage} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <PackagePlus className="h-5 w-5 text-[hsl(var(--admin-deep)/.5)]" />
                        )}
                        {product.featured && (
                          <Star className="absolute bottom-1 right-1 h-3 w-3 fill-[hsl(var(--admin-gold))] text-[hsl(var(--admin-gold))]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-[hsl(var(--admin-deep))]">{product.name}</p>
                          <p className="mt-1 text-xs text-[hsl(var(--admin-ink)/.48)]">
                            {formatNaira(product.price)} · {product.inStock && (product.stockQty ?? 0) > 0 ? `${product.stockQty ?? 0} available` : 'Out of stock'} · {product.visible ? 'Published' : 'Unpublished'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVisibilityChange(product.id, !product.visible)}
                          disabled={updateProduct.isPending}
                          data-testid={`button-mobile-toggle-product-${product.id}`}
                          aria-label={`${product.visible ? 'Unpublish' : 'Publish'} ${product.name}`}
                        >
                          {product.visible ? <EyeOff className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLocation(`/admin/products/${product.id}/edit`)}
                          data-testid={`button-mobile-edit-product-${product.id}`}
                          aria-label={`Edit ${product.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(product.id)}
                          data-testid={`button-mobile-delete-product-${product.id}`}
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-[hsl(var(--admin-coral))]" />
                        </Button>
                      </div>
                    </div>
                  ))}
            </div>

            {!isLoading && !filteredProducts.length && (
              <div className="px-6 py-16 text-center">
                {products.length ? (
                  <>
                    <Search className="mx-auto h-8 w-8 text-[hsl(var(--admin-teal)/.55)]" />
                    <h3 className="mt-4 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">
                      No matching products
                    </h3>
                    <p className="mt-2 text-sm text-[hsl(var(--admin-ink)/.55)]">
                      Try a different search or filter.
                    </p>
                  </>
                ) : (
                  <>
                    <Archive className="mx-auto h-8 w-8 text-[hsl(var(--admin-teal)/.55)]" />
                    <h3 className="mt-4 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">
                      No products yet
                    </h3>
                    <p className="mt-2 text-sm text-[hsl(var(--admin-ink)/.55)]">
                      Your real catalog is empty. Add the first product to get started.
                    </p>
                    <Link href="/admin/products/new" className="mt-5 inline-block">
                      <Button className="gap-2 rounded-full">
                        <PackagePlus className="h-4 w-4" />
                        Add product
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {productToDelete?.name} will be permanently removed from the catalog. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteProduct.isPending}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteProduct.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete product
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}