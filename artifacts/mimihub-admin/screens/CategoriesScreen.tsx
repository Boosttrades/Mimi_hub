import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListCategoriesQueryKey,
  useCreateCategory,
  useCreateSubcategory,
  useDeleteCategory,
  useDeleteSubcategory,
  useListCategories,
  useUpdateCategory,
  useUpdateSubcategory,
  type Category,
  type CategoryInput,
  type Subcategory,
} from '@workspace/api-client-react';
import {
  ActionButton,
  Card,
  EmptyState,
  ErrorState,
  IconAction,
  LoadingState,
  Page,
  SectionTitle,
  TextField,
} from '@/components/AdminUI';
import { getErrorMessage } from '@/lib/format';
import { useColors } from '@/hooks/useColors';

type CategoryDraft = { name: string; slug: string; description: string; image: string };
type SubcategoryDraft = { name: string; slug: string };

const emptyCategory: CategoryDraft = { name: '', slug: '', description: '', image: '' };

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function CategoriesScreen() {
  const colors = useColors();
  const categoriesQuery = useListCategories();
  const queryClient = useQueryClient();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createSubcategory = useCreateSubcategory();
  const updateSubcategory = useUpdateSubcategory();
  const deleteSubcategory = useDeleteSubcategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategory);
  const [addingSubcategoryTo, setAddingSubcategoryTo] = useState<number | null>(null);
  const [subcategoryDraft, setSubcategoryDraft] = useState<SubcategoryDraft>({ name: '', slug: '' });
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null);

  const invalidateCategories = () =>
    queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });

  function beginCreateCategory() {
    setEditingCategoryId(null);
    setCategoryDraft(emptyCategory);
    setFormOpen(true);
  }

  function beginEditCategory(category: Category) {
    setEditingCategoryId(category.id);
    setCategoryDraft({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      image: category.image ?? '',
    });
    setFormOpen(true);
  }

  function cancelCategoryForm() {
    setFormOpen(false);
    setEditingCategoryId(null);
    setCategoryDraft(emptyCategory);
  }

  async function saveCategory() {
    const name = categoryDraft.name.trim();
    const slug = categoryDraft.slug.trim();
    if (!name || !slug) {
      Alert.alert('Complete the category', 'A category name and URL slug are required.');
      return;
    }

    const data: CategoryInput = {
      name,
      slug,
      description: categoryDraft.description.trim(),
      image: categoryDraft.image.trim(),
    };
    try {
      if (editingCategoryId !== null) {
        await updateCategory.mutateAsync({ id: editingCategoryId, data });
      } else {
        await createCategory.mutateAsync({ data });
      }
      await invalidateCategories();
      cancelCategoryForm();
    } catch (error) {
      Alert.alert('Could not save category', getErrorMessage(error));
    }
  }

  function confirmDeleteCategory(category: Category) {
    Alert.alert(
      `Delete ${category.name}?`,
      'This removes the category and its subcategories. Products stay in the catalog but lose these category assignments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteCategory
              .mutateAsync({ id: category.id })
              .then(invalidateCategories)
              .catch((error: unknown) => Alert.alert('Could not delete category', getErrorMessage(error)));
          },
        },
      ],
    );
  }

  function beginAddSubcategory(categoryId: number) {
    setAddingSubcategoryTo(categoryId);
    setSubcategoryDraft({ name: '', slug: '' });
    setEditingSubcategoryId(null);
  }

  function beginEditSubcategory(subcategory: Subcategory) {
    setAddingSubcategoryTo(subcategory.categoryId);
    setEditingSubcategoryId(subcategory.id);
    setSubcategoryDraft({ name: subcategory.name, slug: subcategory.slug });
  }

  function cancelSubcategoryForm() {
    setAddingSubcategoryTo(null);
    setEditingSubcategoryId(null);
    setSubcategoryDraft({ name: '', slug: '' });
  }

  async function saveSubcategory(categoryId: number) {
    const name = subcategoryDraft.name.trim();
    const slug = subcategoryDraft.slug.trim();
    if (!name || !slug) {
      Alert.alert('Complete the subcategory', 'A subcategory name and URL slug are required.');
      return;
    }
    try {
      if (editingSubcategoryId !== null) {
        await updateSubcategory.mutateAsync({ id: editingSubcategoryId, data: { name, slug } });
      } else {
        await createSubcategory.mutateAsync({ categoryId, data: { name, slug } });
      }
      await invalidateCategories();
      cancelSubcategoryForm();
    } catch (error) {
      Alert.alert('Could not save subcategory', getErrorMessage(error));
    }
  }

  function confirmDeleteSubcategory(subcategory: Subcategory) {
    Alert.alert(
      `Delete ${subcategory.name}?`,
      'Products stay in the catalog but lose this subcategory assignment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteSubcategory
              .mutateAsync({ id: subcategory.id })
              .then(invalidateCategories)
              .catch((error: unknown) => Alert.alert('Could not delete subcategory', getErrorMessage(error)));
          },
        },
      ],
    );
  }

  if (categoriesQuery.isLoading) {
    return <Page title="Categories" showBack><LoadingState label="Loading categories…" /></Page>;
  }

  if (categoriesQuery.isError || !categoriesQuery.data) {
    return (
      <Page title="Categories" showBack>
        <ErrorState
          message={getErrorMessage(categoriesQuery.error)}
          onRetry={() => void categoriesQuery.refetch()}
        />
      </Page>
    );
  }

  const categories = categoriesQuery.data;
  const savingCategory = createCategory.isPending || updateCategory.isPending;
  const savingSubcategory = createSubcategory.isPending || updateSubcategory.isPending;

  return (
    <Page
      title="Categories"
      subtitle="Organize the product collection shown on your store."
      showBack
      onRefresh={() => void categoriesQuery.refetch()}
      refreshing={categoriesQuery.isRefetching}
    >
      {!formOpen ? (
        <ActionButton label="Add category" icon="plus" onPress={beginCreateCategory} testID="category-add" />
      ) : (
        <Card>
          <SectionTitle title={editingCategoryId === null ? 'New category' : 'Edit category'} />
          <TextField
            label="Name"
            value={categoryDraft.name}
            onChangeText={(name) =>
              setCategoryDraft((draft) => ({
                ...draft,
                name,
                slug: draft.slug === toSlug(draft.name) ? toSlug(name) : draft.slug,
              }))
            }
            placeholder="e.g. Home essentials"
            autoCapitalize="words"
          />
          <TextField
            label="URL slug"
            value={categoryDraft.slug}
            onChangeText={(slug) => setCategoryDraft((draft) => ({ ...draft, slug }))}
            placeholder="home-essentials"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            label="Image URL (optional)"
            value={categoryDraft.image}
            onChangeText={(image) => setCategoryDraft((draft) => ({ ...draft, image }))}
            placeholder="https://…"
            autoCapitalize="none"
            keyboardType="url"
          />
          <TextField
            label="Description (optional)"
            value={categoryDraft.description}
            onChangeText={(description) => setCategoryDraft((draft) => ({ ...draft, description }))}
            placeholder="A short introduction for shoppers"
            multiline
          />
          <ActionButton
            label={editingCategoryId === null ? 'Create category' : 'Save category'}
            icon="check"
            loading={savingCategory}
            disabled={savingCategory}
            onPress={() => void saveCategory()}
          />
          <ActionButton label="Cancel" variant="secondary" onPress={cancelCategoryForm} disabled={savingCategory} />
        </Card>
      )}

      {categories.length === 0 ? (
        <Card><EmptyState title="No categories yet" detail="Add a category to start organizing products." icon="grid" /></Card>
      ) : (
        <View style={styles.categoryList}>
          {categories.map((category) => {
            const subcategories = category.subcategories ?? [];
            return (
              <Card key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryHeading}>
                  <View style={styles.categoryCopy}>
                    <Text style={[styles.categoryName, { color: colors.foreground }]}>{category.name}</Text>
                    <Text style={[styles.categorySlug, { color: colors.mutedForeground }]}>/{category.slug}</Text>
                  </View>
                  <IconAction icon="edit-2" label={`Edit ${category.name}`} onPress={() => beginEditCategory(category)} />
                  <IconAction icon="trash-2" label={`Delete ${category.name}`} onPress={() => confirmDeleteCategory(category)} />
                </View>
                {category.description ? <Text style={[styles.description, { color: colors.mutedForeground }]}>{category.description}</Text> : null}
                <View style={[styles.subcategoryHeading, { borderTopColor: colors.border }]}>
                  <Text style={[styles.subcategoryTitle, { color: colors.foreground }]}>Subcategories · {subcategories.length}</Text>
                  <IconAction
                    icon="plus"
                    label={`Add subcategory to ${category.name}`}
                    onPress={() => beginAddSubcategory(category.id)}
                  />
                </View>
                {subcategories.map((subcategory) => (
                  <View key={subcategory.id} style={styles.subcategoryRow}>
                    <View style={styles.subcategoryCopy}>
                      <Text style={[styles.subcategoryName, { color: colors.foreground }]}>{subcategory.name}</Text>
                      <Text style={[styles.categorySlug, { color: colors.mutedForeground }]}>/{subcategory.slug}</Text>
                    </View>
                    <IconAction
                      icon="edit-2"
                      label={`Edit ${subcategory.name}`}
                      onPress={() => beginEditSubcategory(subcategory)}
                    />
                    <IconAction
                      icon="trash-2"
                      label={`Delete ${subcategory.name}`}
                      onPress={() => confirmDeleteSubcategory(subcategory)}
                    />
                  </View>
                ))}
                {addingSubcategoryTo === category.id ? (
                  <View style={[styles.subcategoryForm, { borderTopColor: colors.border }]}>
                    <TextField
                      label="Subcategory name"
                      value={subcategoryDraft.name}
                      onChangeText={(name) =>
                        setSubcategoryDraft((draft) => ({
                          ...draft,
                          name,
                          slug: draft.slug === toSlug(draft.name) ? toSlug(name) : draft.slug,
                        }))
                      }
                      placeholder="e.g. Bedding"
                      autoCapitalize="words"
                    />
                    <TextField
                      label="URL slug"
                      value={subcategoryDraft.slug}
                      onChangeText={(slug) => setSubcategoryDraft((draft) => ({ ...draft, slug }))}
                      placeholder="bedding"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <ActionButton
                      label={editingSubcategoryId === null ? 'Add subcategory' : 'Save subcategory'}
                      icon="check"
                      compact
                      loading={savingSubcategory}
                      disabled={savingSubcategory}
                      onPress={() => void saveSubcategory(category.id)}
                    />
                    <ActionButton
                      label="Cancel"
                      variant="secondary"
                      compact
                      onPress={cancelSubcategoryForm}
                      disabled={savingSubcategory}
                    />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  categoryList: { gap: 12 },
  categoryCard: { gap: 11 },
  categoryHeading: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  categoryCopy: { flex: 1, gap: 3 },
  categoryName: { fontFamily: 'Fraunces_600SemiBold', fontSize: 20 },
  categorySlug: { fontFamily: 'Manrope_400Regular', fontSize: 10 },
  description: { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 18 },
  subcategoryHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 5 },
  subcategoryTitle: { fontFamily: 'Manrope_700Bold', fontSize: 11 },
  subcategoryRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 2 },
  subcategoryCopy: { flex: 1, gap: 2 },
  subcategoryName: { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  subcategoryForm: { gap: 10, borderTopWidth: 1, paddingTop: 11 },
});
