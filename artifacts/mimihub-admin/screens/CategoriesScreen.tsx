import { useState } from 'react';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Alert, Linking, Modal, Platform, StyleSheet, Switch, Text, View } from 'react-native';
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
  useUploadCategoryImage,
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
  ToggleRow,
} from '@/components/AdminUI';
import { getErrorMessage } from '@/lib/format';
import { useColors } from '@/hooks/useColors';

type CategoryDraft = { name: string; slug: string; description: string; image: string };
type SubcategoryDraft = { name: string; slug: string };
type PendingDelete =
  | { kind: 'category'; category: Category }
  | { kind: 'subcategory'; subcategory: Subcategory };
type PendingCategoryImage = { uri: string };

const emptyCategory: CategoryDraft = { name: '', slug: '', description: '', image: '' };
const maxCategoryImageSize = 10 * 1024 * 1024;

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function CategoriesScreen() {
  const colors = useColors();
  const [permission, requestPermission] = ImagePicker.useMediaLibraryPermissions();
  const categoriesQuery = useListCategories({ includeHidden: true });
  const queryClient = useQueryClient();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createSubcategory = useCreateSubcategory();
  const updateSubcategory = useUpdateSubcategory();
  const deleteSubcategory = useDeleteSubcategory();
  const uploadImage = useUploadCategoryImage();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategory);
  const [addingSubcategoryTo, setAddingSubcategoryTo] = useState<number | null>(null);
  const [subcategoryDraft, setSubcategoryDraft] = useState<SubcategoryDraft>({ name: '', slug: '' });
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingCategoryImage, setPendingCategoryImage] = useState<PendingCategoryImage | null>(null);
  const [categoryImageError, setCategoryImageError] = useState<string | null>(null);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);

  const invalidateCategories = () =>
    queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });

  async function setCategoryVisibility(category: Category, visible: boolean) {
    try {
      await updateCategory.mutateAsync({ id: category.id, data: { visible } });
      await invalidateCategories();
    } catch (error) {
      await invalidateCategories();
      Alert.alert('Could not update category visibility', getErrorMessage(error));
    }
  }

  async function setSubcategoryVisibility(subcategory: Subcategory, visible: boolean) {
    try {
      await updateSubcategory.mutateAsync({ id: subcategory.id, data: { visible } });
      await invalidateCategories();
    } catch (error) {
      await invalidateCategories();
      Alert.alert('Could not update subcategory visibility', getErrorMessage(error));
    }
  }

  function beginCreateCategory() {
    setEditingCategoryId(null);
    setCategoryDraft(emptyCategory);
    setPendingCategoryImage(null);
    setCategoryImageError(null);
    setCategoryFormError(null);
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
    setPendingCategoryImage(null);
    setCategoryImageError(null);
    setCategoryFormError(null);
    setFormOpen(true);
  }

  function cancelCategoryForm() {
    setFormOpen(false);
    setEditingCategoryId(null);
    setCategoryDraft(emptyCategory);
    setPendingCategoryImage(null);
    setCategoryImageError(null);
    setCategoryFormError(null);
  }

  async function saveCategory() {
    const name = categoryDraft.name.trim();
    const slug = categoryDraft.slug.trim();
    if (!name || !slug) {
      setCategoryFormError('A category name and URL slug are required.');
      return;
    }

    setCategoryFormError(null);
    try {
      let image = categoryDraft.image.trim();
      if (pendingCategoryImage) {
        const file = new File(pendingCategoryImage.uri);
        const uploaded = await uploadImage.mutateAsync({
          data: { file: file as unknown as string },
        });
        image = uploaded.url;
      }
      const data: CategoryInput = {
        name,
        slug,
        description: categoryDraft.description.trim(),
        image,
      };
      if (editingCategoryId !== null) {
        await updateCategory.mutateAsync({ id: editingCategoryId, data });
      } else {
        await createCategory.mutateAsync({ data });
      }
      await invalidateCategories();
      cancelCategoryForm();
    } catch (error) {
      setCategoryFormError(getErrorMessage(error));
    }
  }

  async function chooseCategoryImage() {
    setCategoryImageError(null);
    try {
      if (Platform.OS !== 'web' && !permission?.granted) {
        const requested = await requestPermission();
        if (!requested.granted) {
          setCategoryImageError('Allow photo access to choose a category image.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;

      const extension = asset.fileName?.split('.').pop()?.toLowerCase();
      const mimeType = asset.mimeType?.toLowerCase()
        ?? (extension === 'png' ? 'image/png' : ['jpg', 'jpeg'].includes(extension ?? '') ? 'image/jpeg' : '');
      if (!['image/jpeg', 'image/png'].includes(mimeType)) {
        setCategoryImageError('Choose a JPG or PNG image.');
        return;
      }
      if (asset.fileSize && asset.fileSize > maxCategoryImageSize) {
        setCategoryImageError('The image must be 10 MB or smaller.');
        return;
      }

      setPendingCategoryImage({ uri: asset.uri });
      setCategoryDraft((draft) => ({ ...draft, image: asset.uri }));
      setCategoryFormError(null);
    } catch (error) {
      setCategoryImageError(getErrorMessage(error));
    }
  }

  function confirmDeleteCategory(category: Category) {
    setDeleteError(null);
    setPendingDelete({ kind: 'category', category });
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
    setDeleteError(null);
    setPendingDelete({ kind: 'subcategory', subcategory });
  }

  function closeDeleteConfirmation() {
    if (deleteCategory.isPending || deleteSubcategory.isPending) return;
    setPendingDelete(null);
    setDeleteError(null);
  }

  async function executeDelete() {
    if (!pendingDelete || deleteCategory.isPending || deleteSubcategory.isPending) return;
    setDeleteError(null);
    try {
      if (pendingDelete.kind === 'category') {
        await deleteCategory.mutateAsync({ id: pendingDelete.category.id });
      } else {
        await deleteSubcategory.mutateAsync({ id: pendingDelete.subcategory.id });
      }
      await invalidateCategories();
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(getErrorMessage(error));
    }
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
  const savingCategory = createCategory.isPending || updateCategory.isPending || uploadImage.isPending;
  const savingSubcategory = createSubcategory.isPending || updateSubcategory.isPending;
  const deleting = deleteCategory.isPending || deleteSubcategory.isPending;

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
          <View style={styles.imageUploadGroup}>
            <Text style={[styles.imageUploadLabel, { color: colors.foreground }]}>Category image (optional)</Text>
            {categoryDraft.image ? (
              <Image
                source={{ uri: categoryDraft.image }}
                contentFit="cover"
                style={[styles.categoryImagePreview, { backgroundColor: colors.secondary }]}
              />
            ) : (
              <View style={[styles.categoryImagePlaceholder, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Text style={[styles.imageHelper, { color: colors.mutedForeground }]}>No image selected</Text>
              </View>
            )}
            <ActionButton
              label={categoryDraft.image ? 'Choose a different image' : 'Upload category image'}
              icon="image"
              onPress={() => void chooseCategoryImage()}
              disabled={savingCategory}
            />
            {categoryDraft.image ? (
              <ActionButton
                label="Remove image"
                icon="trash-2"
                variant="secondary"
                onPress={() => {
                  setCategoryDraft((draft) => ({ ...draft, image: '' }));
                  setPendingCategoryImage(null);
                  setCategoryImageError(null);
                }}
                disabled={savingCategory}
              />
            ) : null}
            <Text style={[styles.imageHelper, { color: colors.mutedForeground }]}>JPG or PNG, up to 10 MB. Stored in Supabase Storage.</Text>
            {categoryImageError ? (
              <Text accessibilityRole="alert" style={[styles.formError, { color: colors.destructive }]}>{categoryImageError}</Text>
            ) : null}
            {Platform.OS !== 'web' && permission && !permission.granted && !permission.canAskAgain ? (
              <ActionButton
                label="Open photo settings"
                variant="secondary"
                onPress={() => void Linking.openSettings().catch(() => setCategoryImageError('Could not open device settings.'))}
              />
            ) : null}
          </View>
          <TextField
            label="Description (optional)"
            value={categoryDraft.description}
            onChangeText={(description) => setCategoryDraft((draft) => ({ ...draft, description }))}
            placeholder="A short introduction for shoppers"
            multiline
          />
          {categoryFormError ? (
            <Text accessibilityRole="alert" style={[styles.formError, { color: colors.destructive }]}>{categoryFormError}</Text>
          ) : null}
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
                  <IconAction
                    icon="trash-2"
                    label={`Delete ${category.name}`}
                    onPress={() => confirmDeleteCategory(category)}
                    testID={`category-delete-${category.id}`}
                  />
                </View>
                {category.description ? <Text style={[styles.description, { color: colors.mutedForeground }]}>{category.description}</Text> : null}
                <ToggleRow
                  title={category.visible ? 'Visible on storefront' : 'Hidden from storefront'}
                  description="Controls whether shoppers can see this category."
                  value={category.visible}
                  onValueChange={(visible) => void setCategoryVisibility(category, visible)}
                  disabled={updateCategory.isPending}
                  testID={`category-visibility-${category.id}`}
                />
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
                    <View style={styles.subcategoryVisibility}>
                      <Text style={[styles.visibilityLabel, { color: colors.mutedForeground }]}>
                        {subcategory.visible ? 'Visible' : 'Hidden'}
                      </Text>
                      <Switch
                        accessibilityLabel={
                          subcategory.visible
                            ? `Hide ${subcategory.name} from storefront`
                            : `Show ${subcategory.name} on storefront`
                        }
                        testID={`subcategory-visibility-${subcategory.id}`}
                        value={subcategory.visible}
                        onValueChange={(visible) => void setSubcategoryVisibility(subcategory, visible)}
                        disabled={updateSubcategory.isPending}
                        trackColor={{ false: colors.border, true: colors.adminTeal }}
                        thumbColor={colors.card}
                      />
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
                      testID={`subcategory-delete-${subcategory.id}`}
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
      <Modal
        visible={pendingDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteConfirmation}
      >
        <View style={styles.confirmationBackdrop}>
          {pendingDelete ? (
            <View
              accessibilityViewIsModal
              style={[
                styles.confirmationCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text style={[styles.confirmationTitle, { color: colors.foreground }]}>
                Delete {pendingDelete.kind === 'category'
                  ? pendingDelete.category.name
                  : pendingDelete.subcategory.name}?
              </Text>
              <Text style={[styles.confirmationMessage, { color: colors.mutedForeground }]}>
                {pendingDelete.kind === 'category'
                  ? 'This removes the category and its subcategories. Products stay in the catalog but lose these category assignments.'
                  : 'Products stay in the catalog but lose this subcategory assignment.'}
              </Text>
              {deleteError ? (
                <Text accessibilityRole="alert" style={[styles.confirmationError, { color: colors.destructive }]}>
                  Could not delete: {deleteError}
                </Text>
              ) : null}
              <View style={styles.confirmationActions}>
                <ActionButton
                  label="No, keep it"
                  variant="secondary"
                  compact
                  disabled={deleting}
                  onPress={closeDeleteConfirmation}
                  testID="delete-confirm-no"
                />
                <ActionButton
                  label="Yes, delete"
                  variant="danger"
                  compact
                  loading={deleting}
                  disabled={deleting}
                  onPress={() => void executeDelete()}
                  testID="delete-confirm-yes"
                />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  imageUploadGroup: { gap: 8 },
  imageUploadLabel: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  categoryImagePreview: { width: '100%', height: 160, borderRadius: 12 },
  categoryImagePlaceholder: { height: 100, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, borderStyle: 'dashed' },
  imageHelper: { fontFamily: 'Manrope_400Regular', fontSize: 11, lineHeight: 16 },
  formError: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 18 },
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
  subcategoryVisibility: { alignItems: 'center', justifyContent: 'center', minWidth: 54 },
  visibilityLabel: { fontFamily: 'Manrope_500Medium', fontSize: 9 },
  subcategoryName: { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  subcategoryForm: { gap: 10, borderTopWidth: 1, paddingTop: 11 },
  confirmationBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(25, 23, 20, 0.48)',
  },
  confirmationCard: { width: '100%', maxWidth: 440, borderWidth: 1, padding: 20, gap: 12 },
  confirmationTitle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, lineHeight: 28 },
  confirmationMessage: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
  confirmationError: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 18 },
  confirmationActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
});
