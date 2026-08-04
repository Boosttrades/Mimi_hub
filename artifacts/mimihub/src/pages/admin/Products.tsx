import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AdminLayout } from './AdminLayout';
import { useListProducts, useDeleteProduct, getListProductsQueryKey } from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatNaira } from '@/lib/utils/format';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export function AdminProducts() {
  const { data: products, isLoading } = useListProducts();
  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [productToDelete, setProductToDelete] = useState<number | null>(null);

  const handleDelete = async () => {
    if (!productToDelete) return;
    deleteProduct.mutate({ id: productToDelete }, {
      onSuccess: () => {
        toast.success('Product deleted successfully');
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setProductToDelete(null);
      },
      onError: () => {
        toast.error('Failed to delete product');
        setProductToDelete(null);
      }
    });
  };

  if (isLoading) return <AdminLayout title="Products"><LoadingSpinner size="lg" /></AdminLayout>;

  return (
    <AdminLayout title="Products">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg text-muted-foreground">Manage your store products</h2>
        <Link href="/admin/products/new">
          <Button className="gap-2"><Plus className="w-4 h-4" /> Add Product</Button>
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50 text-muted-foreground text-sm text-left">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium">Visibility</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products?.map((product) => (
                <tr key={product.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-secondary">
                        <img src={product.coverImage || product.images?.[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {formatNaira(product.price)}
                    {product.discountPct && (
                      <span className="ml-2 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                        -{product.discountPct}%
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.inStock ? `${product.stockQty || 0} in stock` : 'Out of stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {product.visible ? (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground"><Eye className="w-4 h-4" /> Visible</span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground opacity-50"><EyeOff className="w-4 h-4" /> Hidden</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setLocation(`/admin/products/${product.id}/edit`)}>
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      
                      <AlertDialog open={productToDelete === product.id} onOpenChange={(open) => !open && setProductToDelete(null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setProductToDelete(product.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{product.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {products?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No products found. Click "Add Product" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
