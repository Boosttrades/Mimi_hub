import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import {
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateSubcategory,
  useUpdateSubcategory,
  useDeleteSubcategory,
  getListCategoriesQueryKey,
  getListProductsQueryKey,
  type Category,
  type Subcategory,
} from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type DeleteTarget =
  | { kind: 'category'; id: number; name: string; subcategoryCount: number }
  | { kind: 'subcategory'; id: number; name: string };

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function AdminCategories() {
  const { data: categories, isLoading } = useListCategories({ includeHidden: true });
  const queryClient = useQueryClient();

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const createSubcategoryMutation = useCreateSubcategory();
  const updateSubcategoryMutation = useUpdateSubcategory();
  const deleteSubcategoryMutation = useDeleteSubcategory();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<Record<number, string>>({});
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', image: '' });

  const refreshCategoryViews = () => {
    void queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
  };

  const resetForm = () => {
    setFormData({ name: '', slug: '', description: '', image: '' });
    setIsEditing(null);
    setIsOpen(false);
  };

  const handleEdit = (cat: Category) => {
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image || '',
    });
    setIsEditing(cat.id);
    setIsOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const onSuccess = (message: string) => {
      toast.success(message);
      refreshCategoryViews();
      setDeleteTarget(null);
    };
    const onError = () => toast.error(`Could not delete ${target.kind}. Please try again.`);

    if (target.kind === 'category') {
      deleteMutation.mutate({ id: target.id }, {
        onSuccess: () => onSuccess('Category deleted from the store'),
        onError,
      });
    } else {
      deleteSubcategoryMutation.mutate({ id: target.id }, {
        onSuccess: () => onSuccess('Subcategory deleted from the store'),
        onError,
      });
    }
  };

  const handleToggleCategory = (category: Category, visible: boolean) => {
    updateMutation.mutate(
      { id: category.id, data: { visible } },
      {
        onSuccess: () => {
          toast.success(`${category.name} is now ${visible ? 'visible' : 'hidden'} on the storefront`);
          refreshCategoryViews();
        },
        onError: () => toast.error(`Could not update ${category.name}. Please try again.`),
      },
    );
  };

  const handleToggleSubcategory = (subcategory: Subcategory, visible: boolean) => {
    updateSubcategoryMutation.mutate(
      { id: subcategory.id, data: { visible } },
      {
        onSuccess: () => {
          toast.success(`${subcategory.name} is now ${visible ? 'visible' : 'hidden'} on the storefront`);
          refreshCategoryViews();
        },
        onError: () => toast.error(`Could not update ${subcategory.name}. Please try again.`),
      },
    );
  };

  const handleCreateSubcategory = (categoryId: number) => {
    const name = subcategoryDrafts[categoryId]?.trim();
    if (!name) return;

    createSubcategoryMutation.mutate(
      { categoryId, data: { name, slug: slugify(name) } },
      {
        onSuccess: () => {
          toast.success('Subcategory created');
          setSubcategoryDrafts((drafts) => ({ ...drafts, [categoryId]: '' }));
          refreshCategoryViews();
        },
        onError: () => toast.error(`Could not add ${name}. Please try again.`),
      },
    );
  };

  const confirmPending = deleteMutation.isPending || deleteSubcategoryMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const onSuccess = (message: string) => {
      toast.success(message);
      refreshCategoryViews();
      resetForm();
    };
    const onError = () => toast.error(`Could not ${isEditing ? 'update' : 'create'} category. Please try again.`);

    if (isEditing) {
      updateMutation.mutate(
        { id: isEditing, data: formData },
        { onSuccess: () => onSuccess('Category updated'), onError },
      );
    } else {
      createMutation.mutate(
        { data: formData },
        { onSuccess: () => onSuccess('Category created'), onError },
      );
    }
  };

  if (isLoading) return <AdminLayout title="Categories"><LoadingSpinner size="lg" /></AdminLayout>;

  return (
    <AdminLayout title="Categories">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-lg text-muted-foreground">Manage product categories</h2>
        <Dialog open={isOpen} onOpenChange={(value) => { setIsOpen(value); if (!value) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Category' : 'New Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div>
                <Label htmlFor="category-name">Name</Label>
                <Input id="category-name" value={formData.name} onChange={(e) => {
                  const name = e.target.value;
                  setFormData((current) => ({ ...current, name, slug: slugify(name) }));
                }} required />
              </div>
              <div>
                <Label htmlFor="category-slug">Slug</Label>
                <Input id="category-slug" value={formData.slug} onChange={(e) => setFormData((current) => ({ ...current, slug: e.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="category-image">Image URL (Optional)</Label>
                <Input id="category-image" value={formData.image} onChange={(e) => setFormData((current) => ({ ...current, image: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="category-description">Description (Optional)</Label>
                <Input id="category-description" value={formData.description} onChange={(e) => setFormData((current) => ({ ...current, description: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {updateMutation.isPending || createMutation.isPending ? 'Saving…' : isEditing ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories?.map((cat) => (
          <div key={cat.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="relative h-40 bg-secondary">
              {cat.image && <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />}
              {!cat.visible && <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium">Hidden</span>}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-xl text-foreground">{cat.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{cat.subcategories?.length || 0} subcategories</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={`Edit ${cat.name}`} onClick={() => handleEdit(cat)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    aria-label={`Delete ${cat.name}`}
                    onClick={() => setDeleteTarget({ kind: 'category', id: cat.id, name: cat.name, subcategoryCount: cat.subcategories?.length ?? 0 })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground">
                {cat.description || 'No description provided.'}
              </p>

              <div className="mb-4 flex items-center justify-between border-y border-border py-3">
                <Label htmlFor={`category-visible-${cat.id}`} className="flex items-center gap-2 text-sm">
                  {cat.visible ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  {cat.visible ? 'Visible on storefront' : 'Hidden from storefront'}
                </Label>
                <Switch
                  id={`category-visible-${cat.id}`}
                  checked={cat.visible}
                  disabled={updateMutation.isPending}
                  onCheckedChange={(visible) => handleToggleCategory(cat, visible)}
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Subcategories</h4>
                {cat.subcategories?.length ? (
                  <ul className="space-y-2">
                    {cat.subcategories.map((sub) => (
                      <li key={sub.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                        <span className={`min-w-0 truncate text-sm ${sub.visible ? '' : 'text-muted-foreground line-through'}`}>{sub.name}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <Switch
                            checked={sub.visible}
                            disabled={updateSubcategoryMutation.isPending}
                            aria-label={`${sub.visible ? 'Hide' : 'Show'} ${sub.name}`}
                            onCheckedChange={(visible) => handleToggleSubcategory(sub, visible)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            aria-label={`Delete ${sub.name}`}
                            onClick={() => setDeleteTarget({ kind: 'subcategory', id: sub.id, name: sub.name })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No subcategories yet.</p>
                )}
                <div className="flex gap-2">
                  <Input
                    aria-label={`New subcategory for ${cat.name}`}
                    value={subcategoryDrafts[cat.id] ?? ''}
                    onChange={(e) => setSubcategoryDrafts((drafts) => ({ ...drafts, [cat.id]: e.target.value }))}
                    placeholder="New subcategory"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateSubcategory(cat.id);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Add subcategory to ${cat.name}`}
                    disabled={!subcategoryDrafts[cat.id]?.trim() || createSubcategoryMutation.isPending}
                    onClick={() => handleCreateSubcategory(cat.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open && !confirmPending) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.kind === 'category' ? 'category' : 'subcategory'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'category'
                ? `“${deleteTarget.name}” and its ${deleteTarget.subcategoryCount} subcategories will be deleted. Products will remain in your store but will no longer be assigned to this category. This cannot be undone.`
                : `“${deleteTarget?.name}” will be deleted. Products will remain in this category but will no longer be assigned to this subcategory. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmPending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={confirmPending} onClick={handleDelete}>
              {confirmPending ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
