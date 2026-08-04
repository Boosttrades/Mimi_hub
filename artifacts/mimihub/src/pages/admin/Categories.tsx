import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, getListCategoriesQueryKey } from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function AdminCategories() {
  const { data: categories, isLoading } = useListCategories();
  const queryClient = useQueryClient();
  
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', image: '' });

  const resetForm = () => {
    setFormData({ name: '', slug: '', description: '', image: '' });
    setIsEditing(null);
    setIsOpen(false);
  };

  const handleEdit = (cat: any) => {
    setFormData({ 
      name: cat.name, 
      slug: cat.slug, 
      description: cat.description || '', 
      image: cat.image || '' 
    });
    setIsEditing(cat.id);
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this category?')) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast.success('Category deleted');
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate({ id: isEditing, data: formData }, {
        onSuccess: () => {
          toast.success('Category updated');
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          resetForm();
        }
      });
    } else {
      createMutation.mutate({ data: formData }, {
        onSuccess: () => {
          toast.success('Category created');
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          resetForm();
        }
      });
    }
  };

  if (isLoading) return <AdminLayout title="Categories"><LoadingSpinner size="lg" /></AdminLayout>;

  return (
    <AdminLayout title="Categories">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg text-muted-foreground">Manage product categories</h2>
        <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Category' : 'New Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input value={formData.name} onChange={e => {
                  const val = e.target.value;
                  setFormData(p => ({ ...p, name: val, slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }));
                }} required />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} required />
              </div>
              <div>
                <Label>Image URL (Optional)</Label>
                <Input value={formData.image} onChange={e => setFormData(p => ({ ...p, image: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit">{isEditing ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories?.map((cat) => (
          <div key={cat.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="h-40 bg-secondary relative">
              {cat.image && <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-serif text-xl text-foreground">{cat.name}</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleEdit(cat)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                {cat.description || 'No description provided.'}
              </p>
              <div className="text-sm font-medium text-primary">
                {cat.subcategories?.length || 0} Subcategories
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
