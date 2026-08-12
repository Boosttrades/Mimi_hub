import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Check, ImagePlus, Loader2, MoveRight, Sparkles, Trash2, UploadCloud } from 'lucide-react';
import {
  getGetProductQueryKey, getListProductsQueryKey, useCreateProduct, useGetProduct,
  useListCategories, useUpdateProduct
} from '@workspace/api-client-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type ImageItem = { id: string; src: string; name: string; local?: boolean };
const fallbackCategories = [
  { id: 1, name: 'Home & Living', subcategories: [{ id: 11, name: 'Tableware' }, { id: 12, name: 'Decor' }] },
  { id: 2, name: 'Beauty & Wellness', subcategories: [{ id: 21, name: 'Body care' }, { id: 22, name: 'Fragrance' }] },
  { id: 3, name: 'Style & Accessories', subcategories: [{ id: 31, name: 'Jewellery' }, { id: 32, name: 'Clothing' }] },
];
const measurementUnits = ['ml', 'cl', 'L', 'g', 'kg', 'oz', 'lb', 'mm', 'cm', 'm'];
const clothingSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export function AdminProductForm() {
  const [matchEdit, params] = useRoute('/admin/products/:id/edit');
  const isEditing = Boolean(matchEdit);
  const productId = isEditing ? Number(params?.id) : 0;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: remoteCategories } = useListCategories();
  const { data: product, isLoading } = useGetProduct(productId, { query: { enabled: isEditing, queryKey: getGetProductQueryKey(productId) } });
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const fileRef = useRef<HTMLInputElement>(null);
  const categories: any[] = remoteCategories?.length ? remoteCategories : fallbackCategories;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [images, setImages] = useState<ImageItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', price: '', discountPct: '', categoryId: '',
    subcategoryId: '', sizeType: 'measurement', sizeValue: '', sizeUnit: 'ml', dimensions: '',
    featured: false, stockQty: '0', visible: true,
  });

  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name ?? '', description: product.description ?? '', price: String(product.price ?? ''),
      discountPct: String(product.discountPct ?? ''), categoryId: String(product.categoryId ?? ''),
      subcategoryId: String(product.subcategoryId ?? ''), sizeType: 'measurement', sizeValue: product.specs?.capacity ?? product.specs?.size ?? '',
      sizeUnit: (product.specs as (typeof product.specs & { unit?: string | null }) | undefined)?.unit ?? 'ml', dimensions: product.specs?.dimensions ?? '', featured: Boolean(product.featured),
      stockQty: String(product.stockQty ?? 0), visible: product.visible !== false,
    });
    const urls = [product.coverImage, ...(product.images ?? [])].filter(Boolean);
    setImages(Array.from(new Set(urls)).map((src: string, index: number) => ({ id: `remote-${index}`, src, name: `image-${index + 1}` })));
  }, [product]);

  const selectedCategory = categories.find((category) => String(category.id) === form.categoryId);
  const subcategories = selectedCategory?.subcategories ?? [];
  const setField = (name: string, value: string | boolean) => setForm((current) => ({ ...current, [name]: value }));

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).filter((file) => file.type.startsWith('image/')).map((file) => ({ id: `${file.name}-${file.lastModified}`, src: URL.createObjectURL(file), name: file.name, local: true }));
    setImages((current) => [...current, ...next]);
  };
  const handleDrop = (event: DragEvent<HTMLButtonElement>) => { event.preventDefault(); addFiles(event.dataTransfer.files); };
  const removeImage = (id: string) => setImages((current) => current.filter((image) => image.id !== id));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Give this piece a name.';
    if (!form.categoryId) nextErrors.categoryId = 'Choose a collection.';
    if (!form.price || Number(form.price) <= 0) nextErrors.price = 'Enter a price above zero.';
    if (!images.length) nextErrors.images = 'Add at least one product image.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const uploadLocalImage = async (image: ImageItem) => {
      if (!image.local) return image.src;
      const response = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/storage/upload`, {
        method: 'POST',
        body: await (async () => {
          const blob = await fetch(image.src).then((res) => res.blob());
          const formData = new FormData();
          formData.append('file', blob, image.name);
          return formData;
        })(),
      });
      if (!response.ok) throw new Error('Image upload failed');
      const result = await response.json() as { url: string };
      return result.url;
    };

    let imageUrls: string[];
    try {
      imageUrls = await Promise.all(images.map(uploadLocalImage));
    } catch {
      toast.error('Could not upload product images. Try again.');
      return;
    }
    const payload: any = {
      name: form.name.trim(), slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: form.description, price: Number(form.price), discountPct: Number(form.discountPct) || undefined,
      coverImage: imageUrls[0], images: imageUrls, categoryId: Number(form.categoryId),
      subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : undefined, stockQty: Number(form.stockQty) || 0,
      inStock: Number(form.stockQty) > 0, visible: form.visible, featured: form.featured,
      specs: { capacity: form.sizeValue, unit: form.sizeUnit, dimensions: form.dimensions },
    };
    const onSuccess = () => {
      setSaved(true);
      toast.success(isEditing ? 'Product changes saved' : 'Product added to your collection');
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      if (isEditing) queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
      setTimeout(() => setLocation('/admin/products'), 550);
    };
    const onError = () => toast.error('Could not save this product. Try again.');
    if (isEditing) updateMutation.mutate({ id: productId, data: payload }, { onSuccess, onError });
    else createMutation.mutate({ data: payload }, { onSuccess, onError });
  };

  const busy = createMutation.isPending || updateMutation.isPending;
  if (isEditing && isLoading) return <AdminLayout title="Edit product"><div className="grid gap-5 lg:grid-cols-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-44 animate-pulse rounded-[26px] bg-[hsl(var(--admin-deep)/.08)]" />)}</div></AdminLayout>;

  return (
    <AdminLayout title={isEditing ? 'Edit product' : 'Add a product'} eyebrow={isEditing ? 'Collection / edit mode' : 'Collection / new piece'}>
       <form onSubmit={submit} className="admin-rise">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><button type="button" onClick={() => setLocation('/admin/products')} data-testid="button-back-products" className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--admin-teal))]"><ArrowLeft className="h-4 w-4" /> Back to collection</button><p className="max-w-xl text-sm leading-6 text-[hsl(var(--admin-ink)/.55)]">Add the details that make this piece feel at home in your shop. You can always refine it later.</p></div>
           <div className="flex gap-3"><Button type="button" variant="outline" onClick={() => setLocation('/admin/products')} data-testid="button-cancel-product" className="h-11 rounded-full border-[hsl(var(--admin-deep)/.18)] px-5">Cancel</Button><Button type="submit" disabled={busy || saved} data-testid="button-save-product" className="h-11 gap-2 rounded-full bg-[hsl(var(--admin-deep))] px-6 text-[hsl(var(--background))] hover:bg-[hsl(var(--admin-teal))]">{saved ? <><Check className="h-4 w-4" /> Saved</> : busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : <>{isEditing ? 'Save changes' : 'Add Product'} <MoveRight className="h-4 w-4" /></>}</Button></div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <div className="space-y-6">
            <section className="admin-card rounded-[26px] p-6 sm:p-8"><div className="mb-7 flex items-start justify-between"><div><p className="admin-label">The essentials</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">Tell us about it</h2></div><Sparkles className="h-5 w-5 text-[hsl(var(--admin-gold))]" /></div><div className="space-y-5">
              <div><Label htmlFor="product-name" className="text-xs font-bold">Product name <span className="text-[hsl(var(--admin-coral))]">*</span></Label><Input id="product-name" data-testid="input-product-name" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Abeni stoneware vase" className="mt-2 h-12 rounded-xl border-[hsl(var(--admin-deep)/.15)] bg-[hsl(var(--background)/.55)]" />{errors.name && <p className="mt-1.5 text-xs text-[hsl(var(--admin-coral))]">{errors.name}</p>}</div>
              <div><Label htmlFor="product-description" className="text-xs font-bold">Description</Label><Textarea id="product-description" data-testid="input-product-description" value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="What makes this piece worth bringing home?" rows={5} className="mt-2 resize-none rounded-xl border-[hsl(var(--admin-deep)/.15)] bg-[hsl(var(--background)/.55)] leading-6" /><p className="mt-1.5 text-right text-[10px] text-[hsl(var(--admin-ink)/.4)]">{form.description.length}/500</p></div>
            </div></section>
            <section className="admin-card rounded-[26px] p-6 sm:p-8"><div className="mb-7"><p className="admin-label">The details</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">Give it shape</h2></div><div className="grid gap-5 sm:grid-cols-2">
              <div><Label className="text-xs font-bold">Category <span className="text-[hsl(var(--admin-coral))]">*</span></Label><Select value={form.categoryId} onValueChange={(v) => { setField('categoryId', v); setField('subcategoryId', ''); }}><SelectTrigger data-testid="select-product-category" className="mt-2 h-12 rounded-xl border-[hsl(var(--admin-deep)/.15)] bg-[hsl(var(--background)/.55)]"><SelectValue placeholder="Choose a collection" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent></Select>{errors.categoryId && <p className="mt-1.5 text-xs text-[hsl(var(--admin-coral))]">{errors.categoryId}</p>}</div>
              <div><Label className="text-xs font-bold">Subcategory</Label><Select value={form.subcategoryId} onValueChange={(v) => setField('subcategoryId', v)} disabled={!subcategories.length}><SelectTrigger data-testid="select-product-subcategory" className="mt-2 h-12 rounded-xl border-[hsl(var(--admin-deep)/.15)] bg-[hsl(var(--background)/.55)]"><SelectValue placeholder={subcategories.length ? 'Choose a subcategory' : 'Select a category first'} /></SelectTrigger><SelectContent>{subcategories.map((subcategory: any) => <SelectItem key={subcategory.id} value={String(subcategory.id)}>{subcategory.name}</SelectItem>)}</SelectContent></Select></div>
               <div className="sm:col-span-2"><div className="flex flex-wrap items-end justify-between gap-3"><div><Label htmlFor="product-size" className="text-xs font-bold">Size / capacity</Label><p className="mt-1 text-[11px] text-[hsl(var(--admin-ink)/.48)]">Choose measurements for products like perfume or rugs, or clothing sizes for apparel.</p></div><Select value={form.sizeType} onValueChange={(value) => setForm((current) => ({ ...current, sizeType: value, sizeUnit: value === 'clothing' ? 'S' : 'ml' }))}><SelectTrigger data-testid="select-product-size-type" className="h-10 w-[150px] rounded-xl border-[hsl(var(--admin-deep)/.15)] bg-[hsl(var(--background)/.55)]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="measurement">Measurement</SelectItem><SelectItem value="clothing">Clothing size</SelectItem></SelectContent></Select></div><div className="mt-2 flex gap-2"><Input id="product-size" data-testid="input-product-size" value={form.sizeValue} onChange={(e) => setField('sizeValue', e.target.value)} placeholder={form.sizeType === 'clothing' ? 'e.g. XL' : 'e.g. 500'} className="h-12 rounded-xl border-[hsl(var(--admin-deep)/.15)] bg-[hsl(var(--background)/.55)]" /><Select value={form.sizeUnit} onValueChange={(v) => setField('sizeUnit', v)}><SelectTrigger data-testid="select-product-size-unit" className="h-12 w-[120px] rounded-xl border-[hsl(var(--admin-deep)/.15)] bg-[hsl(var(--background)/.55)]"><SelectValue /></SelectTrigger><SelectContent>{(form.sizeType === 'clothing' ? clothingSizes : measurementUnits).map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent></Select></div></div>
              <div><Label htmlFor="product-dimensions" className="text-xs font-bold">Dimensions</Label><Input id="product-dimensions" data-testid="input-product-dimensions" value={form.dimensions} onChange={(e) => setField('dimensions', e.target.value)} placeholder="e.g. 18 × 10 × 10 cm" className="mt-2 h-12 rounded-xl border-[hsl(var(--admin-deep)/.15)] bg-[hsl(var(--background)/.55)]" /></div>
            </div></section>
            <section className="admin-card rounded-[26px] p-6 sm:p-8"><div className="mb-7"><p className="admin-label">The numbers</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">Price & availability</h2></div><div className="grid gap-5 sm:grid-cols-3">
              <div><Label htmlFor="product-price" className="text-xs font-bold">Price (₦) <span className="text-[hsl(var(--admin-coral))]">*</span></Label><Input id="product-price" data-testid="input-product-price" type="number" min="1" value={form.price} onChange={(e) => setField('price', e.target.value)} placeholder="0" className="mt-2 h-12 rounded-xl border-[hsl(var(--admin-deep)/.15)] bg-[hsl(var(--background)/.55)]" />{errors.price && <p className="mt-1.5 text-xs text-[hsl(var(--admin-coral))]">{errors.price}</p>}</div>
              <div><Label htmlFor="product-discount" className="text-xs font-bold">Discount (%)</Label><Input id="product-discount" data-testid="input-product-discount" type="number" min="0" max="100" value={form.discountPct} onChange={(e) => setField('discountPct', e.target.value)} placeholder="0" className="mt-2 h-12 rounded-xl border-[hsl(var(--admin-deep)/.15)] bg-[hsl(var(--background)/.55)]" /></div>
              <div><Label htmlFor="product-stock" className="text-xs font-bold">Units in stock</Label><Input id="product-stock" data-testid="input-product-stock" type="number" min="0" value={form.stockQty} onChange={(e) => setField('stockQty', e.target.value)} placeholder="0" className="mt-2 h-12 rounded-xl border-[hsl(var(--admin-deep)/.15)] bg-[hsl(var(--background)/.55)]" /></div>
            </div></section>
          </div>
          <div className="space-y-6">
            <section className="admin-card rounded-[26px] p-6 sm:p-8"><div className="mb-6 flex items-start justify-between"><div><p className="admin-label">The first impression</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">Product images</h2></div><ImagePlus className="h-5 w-5 text-[hsl(var(--admin-gold))]" /></div><button type="button" data-testid="button-upload-images" onClick={() => fileRef.current?.click()} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--admin-teal)/.38)] bg-[hsl(var(--admin-teal)/.045)] px-5 py-8 text-center transition-colors hover:bg-[hsl(var(--admin-teal)/.09)]"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(var(--admin-gold)/.25)] text-[hsl(var(--admin-deep))] transition-transform group-hover:scale-105"><UploadCloud className="h-5 w-5" /></span><span className="mt-4 text-sm font-extrabold text-[hsl(var(--admin-deep))]">Drop images here or browse</span><span className="mt-1 text-xs text-[hsl(var(--admin-ink)/.48)]">JPG, PNG up to 10MB each</span></button><input ref={fileRef} type="file" accept="image/*" multiple onChange={(e: ChangeEvent<HTMLInputElement>) => addFiles(e.target.files)} className="hidden" />{errors.images && <p className="mt-2 text-xs text-[hsl(var(--admin-coral))]">{errors.images}</p>}<div className="mt-4 grid grid-cols-3 gap-2">{images.map((image, index) => <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl bg-[hsl(var(--admin-deep)/.08)]" data-testid={`image-preview-${index}`}><img src={image.src} alt={image.name} className="h-full w-full object-cover" /><button type="button" onClick={() => removeImage(image.id)} data-testid={`button-remove-image-${index}`} aria-label={`Remove ${image.name}`} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--admin-deep)/.82)] text-[hsl(var(--background))] opacity-0 transition-opacity group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>{index === 0 && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[hsl(var(--background)/.9)] px-2 py-1 text-[9px] font-extrabold text-[hsl(var(--admin-deep))]">Cover</span>}</div>)}</div></section>
            <section className="rounded-[26px] bg-[hsl(var(--admin-gold)/.17)] p-6 sm:p-8"><div className="flex items-start justify-between"><div><p className="admin-label">Store setting</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[hsl(var(--admin-deep))]">Feature this piece</h2></div><Switch data-testid="switch-featured-product" checked={form.featured} onCheckedChange={(checked) => setField('featured', checked)} /></div><p className="mt-4 text-sm leading-6 text-[hsl(var(--admin-ink)/.6)]">Featured pieces appear in the carefully selected spotlight on your storefront. This is an admin setting, not a customer favourite.</p><div className="mt-6 flex items-center gap-2 text-xs font-bold text-[hsl(var(--admin-deep))]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[hsl(var(--background)/.6)]"><Check className="h-3.5 w-3.5" /></span> Visible in your curated collection</div></section>
            <section className="admin-card rounded-[26px] p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="admin-label">Store visibility</p><h2 className="mt-1 font-serif text-xl font-semibold text-[hsl(var(--admin-deep))]">Published to shop</h2></div><Switch data-testid="switch-product-visible" checked={form.visible} onCheckedChange={(checked) => setField('visible', checked)} /></div><p className="mt-3 text-xs leading-5 text-[hsl(var(--admin-ink)/.52)]">Turn this off while you are still polishing the details.</p></section>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}