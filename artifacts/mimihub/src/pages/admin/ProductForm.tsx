import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { AdminLayout } from './AdminLayout';
import { useGetProduct, useCreateProduct, useUpdateProduct, useListCategories, getListProductsQueryKey, getGetProductQueryKey } from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft } from 'lucide-react';

export function AdminProductForm() {
  const [matchEdit, params] = useRoute('/admin/products/:id/edit');
  const isEditing = Boolean(matchEdit);
  const productId = isEditing ? parseInt(params!.id, 10) : 0;

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: categories } = useListCategories();
  const { data: product, isLoading: loadingProduct } = useGetProduct(productId, { 
    query: { enabled: isEditing } 
  });

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const [formData, setFormData] = useState({
    name: '', slug: '', description: '', price: 0, discountPct: 0, 
    coverImage: '', images: '', categoryId: '', subcategoryId: '',
    stockQty: 0, inStock: true, visible: true, featured: false, 
    newArrival: false, bestSeller: false,
    specs: { capacity: '', weight: '', dimensions: '', size: '', color: '', material: '' }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && product) {
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        price: product.price,
        discountPct: product.discountPct || 0,
        coverImage: product.coverImage || '',
        images: product.images?.join('\n') || '',
        categoryId: product.categoryId?.toString() || '',
        subcategoryId: product.subcategoryId?.toString() || '',
        stockQty: product.stockQty || 0,
        inStock: product.inStock,
        visible: product.visible,
        featured: product.featured,
        newArrival: product.newArrival,
        bestSeller: product.bestSeller,
        specs: {
          capacity: product.specs?.capacity || '',
          weight: product.specs?.weight || '',
          dimensions: product.specs?.dimensions || '',
          size: product.specs?.size || '',
          color: product.specs?.color || '',
          material: product.specs?.material || ''
        }
      });
    }
  }, [isEditing, product]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('specs.')) {
      const specKey = name.split('.')[1];
      setFormData(prev => ({ ...prev, specs: { ...prev.specs, [specKey]: value } }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateSlug = () => {
    if (!formData.name) return;
    const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const imagesArray = formData.images.split('\n').map(i => i.trim()).filter(Boolean);
    const cId = parseInt(formData.categoryId, 10);
    const sId = parseInt(formData.subcategoryId, 10);

    const payload = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      price: Number(formData.price),
      discountPct: Number(formData.discountPct) || null,
      coverImage: formData.coverImage || (imagesArray.length > 0 ? imagesArray[0] : ''),
      images: imagesArray,
      categoryId: isNaN(cId) ? undefined : cId,
      subcategoryId: isNaN(sId) ? undefined : sId,
      stockQty: Number(formData.stockQty),
      inStock: formData.inStock,
      visible: formData.visible,
      featured: formData.featured,
      newArrival: formData.newArrival,
      bestSeller: formData.bestSeller,
      specs: formData.specs
    };

    if (isEditing) {
      updateMutation.mutate({ id: productId, data: payload }, {
        onSuccess: () => {
          toast.success('Product updated successfully');
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
          setLocation('/admin/products');
        },
        onError: () => {
          toast.error('Failed to update product');
          setIsSubmitting(false);
        }
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          toast.success('Product created successfully');
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setLocation('/admin/products');
        },
        onError: () => {
          toast.error('Failed to create product');
          setIsSubmitting(false);
        }
      });
    }
  };

  if (isEditing && loadingProduct) return <AdminLayout title="Edit Product"><LoadingSpinner size="lg" /></AdminLayout>;

  const selectedCategory = categories?.find(c => c.id.toString() === formData.categoryId);

  return (
    <AdminLayout title={isEditing ? "Edit Product" : "New Product"}>
      <div className="mb-6">
        <Button variant="ghost" className="gap-2 -ml-4 text-muted-foreground" onClick={() => setLocation('/admin/products')}>
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-serif text-lg mb-4">Basic Information</h3>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="mt-1" onBlur={generateSlug} />
              </div>
              <div>
                <Label htmlFor="slug">Slug (URL friendly)</Label>
                <Input id="slug" name="slug" value={formData.slug} onChange={handleChange} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={5} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-serif text-lg mb-4">Pricing & Inventory</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price (₦)</Label>
                <Input id="price" name="price" type="number" min="0" value={formData.price} onChange={handleChange} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="discountPct">Discount (%)</Label>
                <Input id="discountPct" name="discountPct" type="number" min="0" max="100" value={formData.discountPct} onChange={handleChange} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="stockQty">Stock Quantity</Label>
                <Input id="stockQty" name="stockQty" type="number" min="0" value={formData.stockQty} onChange={handleChange} className="mt-1" />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch id="inStock" checked={formData.inStock} onCheckedChange={(c) => setFormData(p => ({ ...p, inStock: c }))} />
                <Label htmlFor="inStock">In Stock</Label>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-serif text-lg mb-4">Specifications (Optional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(formData.specs).map((key) => (
                <div key={key}>
                  <Label htmlFor={`spec-${key}`} className="capitalize">{key}</Label>
                  <Input id={`spec-${key}`} name={`specs.${key}`} value={(formData.specs as any)[key]} onChange={handleChange} className="mt-1" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Organization */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-serif text-lg mb-4">Organization</h3>
            <div className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={formData.categoryId} onValueChange={(v) => handleSelectChange('categoryId', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedCategory?.subcategories && selectedCategory.subcategories.length > 0 && (
                <div>
                  <Label>Subcategory</Label>
                  <Select value={formData.subcategoryId} onValueChange={(v) => handleSelectChange('subcategoryId', v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                    <SelectContent>
                      {selectedCategory.subcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Images */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-serif text-lg mb-4">Images</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="coverImage">Cover Image URL</Label>
                <Input id="coverImage" name="coverImage" value={formData.coverImage} onChange={handleChange} className="mt-1" placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="images">Gallery Image URLs (one per line)</Label>
                <Textarea id="images" name="images" value={formData.images} onChange={handleChange} rows={5} className="mt-1" placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Visibility & Flags */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-serif text-lg mb-4">Status & Flags</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="visible" className="flex-1 cursor-pointer">Visible in store</Label>
                <Switch id="visible" checked={formData.visible} onCheckedChange={(c) => setFormData(p => ({ ...p, visible: c }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="featured" className="flex-1 cursor-pointer">Featured Product (Max 8)</Label>
                <Switch id="featured" checked={formData.featured} onCheckedChange={(c) => setFormData(p => ({ ...p, featured: c }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="newArrival" className="flex-1 cursor-pointer">New Arrival</Label>
                <Switch id="newArrival" checked={formData.newArrival} onCheckedChange={(c) => setFormData(p => ({ ...p, newArrival: c }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="bestSeller" className="flex-1 cursor-pointer">Best Seller</Label>
                <Switch id="bestSeller" checked={formData.bestSeller} onCheckedChange={(c) => setFormData(p => ({ ...p, bestSeller: c }))} />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditing ? 'Update Product' : 'Create Product')}
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}
