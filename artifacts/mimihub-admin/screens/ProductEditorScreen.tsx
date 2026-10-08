import { Feather } from '@expo/vector-icons';
import {
  getGetProductQueryKey,
  getListCategoriesQueryKey,
  getListProductsQueryKey,
  type Product,
  type ProductInput,
  type ProductUpdate,
  useCreateProduct,
  useGetProduct,
  useListCategories,
  useUpdateProduct,
  useUploadProductImage,
} from '@workspace/api-client-react';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ActionButton, Card, ChoiceChip, LoadingState, TextField } from '@/components/AdminUI';
import { useColors } from '@/hooks/useColors';
import { getErrorMessage, slugify } from '@/lib/format';

type ImageDraft = { uri: string; name: string; type?: string; local: boolean };
type FormValues = {
  name: string;
  description: string;
  price: string;
  discountPct: string;
  categoryId: string;
  subcategoryId: string;
  stockQty: string;
  sizeValue: string;
  sizeUnit: string;
  dimensions: string;
  visible: boolean;
  featured: boolean;
};

const emptyForm: FormValues = {
  name: '',
  description: '',
  price: '',
  discountPct: '',
  categoryId: '',
  subcategoryId: '',
  stockQty: '0',
  sizeValue: '',
  sizeUnit: 'ml',
  dimensions: '',
  visible: true,
  featured: false,
};

export default function ProductEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const productId = Number(id);
  const productQuery = useGetProduct(productId, {
    query: { enabled: editing, queryKey: getGetProductQueryKey(productId) },
  });

  if (editing && productQuery.isLoading) {
    return <View style={styles.loadingScreen}><LoadingState label="Loading product…" /></View>;
  }
  if (editing && (productQuery.isError || !productQuery.data)) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadError}>{getErrorMessage(productQuery.error)}</Text>
      </View>
    );
  }
  return <ProductEditor key={editing ? productId : 'new'} product={editing ? productQuery.data : undefined} />;
}

function ProductEditor({ product }: { product?: Product }) {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const categoriesQuery = useListCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const uploadImage = useUploadProductImage();
  const [permission, requestPermission] = ImagePicker.useMediaLibraryPermissions();
  const [form, setForm] = useState<FormValues>(() => product ? {
    name: product.name ?? '',
    description: product.description ?? '',
    price: String(product.price ?? ''),
    discountPct: product.discountPct == null ? '' : String(product.discountPct),
    categoryId: product.categoryId == null ? '' : String(product.categoryId),
    subcategoryId: product.subcategoryId == null ? '' : String(product.subcategoryId),
    stockQty: String(product.stockQty ?? 0),
    sizeValue: product.specs?.capacity ?? product.specs?.size ?? '',
    sizeUnit: product.specs?.unit ?? 'ml',
    dimensions: product.specs?.dimensions ?? '',
    visible: product.visible !== false,
    featured: Boolean(product.featured),
  } : emptyForm);
  const [images, setImages] = useState<ImageDraft[]>(() => {
    const urls = product ? [product.coverImage, ...(product.images ?? [])].filter(Boolean) : [];
    return Array.from(new Set(urls)).map((uri, index) => ({
      uri: String(uri),
      name: `image-${index + 1}`,
      local: false,
    }));
  });
  const [validationError, setValidationError] = useState('');
  const [saving, setSaving] = useState(false);
  const categories = categoriesQuery.data ?? [];
  const selectedCategory = categories.find((category) => String(category.id) === form.categoryId);
  const subcategories = selectedCategory?.subcategories ?? [];
  const busy = saving || createProduct.isPending || updateProduct.isPending || uploadImage.isPending;

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationError('');
  };

  const chooseImages = async () => {
    try {
      if (!permission?.granted) {
        const nextPermission = await requestPermission();
        if (!nextPermission.granted) {
          Alert.alert(
            'Photo access needed',
            'Allow photo access to attach product images.',
            nextPermission.canAskAgain
              ? [{ text: 'OK' }]
              : [{ text: 'Not now', style: 'cancel' }, { text: 'Open settings', onPress: () => void Linking.openSettings() }],
          );
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 8,
      });
      if (result.canceled) return;
      const picked = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName ?? `product-${Date.now()}-${index}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
        local: true,
      }));
      setImages((current) => [...current, ...picked].slice(0, 8));
    } catch (error) {
      Alert.alert('Could not open photos', getErrorMessage(error));
    }
  };

  const removeImage = (uri: string) => setImages((current) => current.filter((image) => image.uri !== uri));

  const submit = async () => {
    const price = Number(form.price);
    const discount = form.discountPct.trim() ? Number(form.discountPct) : null;
    const stock = Number(form.stockQty);
    if (!form.name.trim()) return setValidationError('Enter a product name.');
    if (!form.categoryId) return setValidationError('Choose a category.');
    if (!Number.isFinite(price) || price <= 0) return setValidationError('Enter a price above zero.');
    if (discount !== null && (!Number.isFinite(discount) || discount < 0 || discount > 100)) {
      return setValidationError('Discount must be between 0 and 100.');
    }
    if (!Number.isFinite(stock) || stock < 0) return setValidationError('Stock must be zero or more.');
    if (images.length === 0) return setValidationError('Add at least one product image.');

    setSaving(true);
    try {
      const imageUrls = await Promise.all(images.map(async (image) => {
        if (!image.local) return image.uri;
        const file = new File(image.uri);
        const uploaded = await uploadImage.mutateAsync({
          data: { file: file as unknown as string },
        });
        return uploaded.url;
      }));
      const categoryId = Number(form.categoryId);
      const subcategoryId = form.subcategoryId ? Number(form.subcategoryId) : null;
      const normalizedStock = Math.floor(stock);
      const basePayload: ProductInput = {
        name: form.name.trim(),
        slug: slugify(form.name),
        description: form.description.trim(),
        price,
        images: imageUrls,
        coverImage: imageUrls[0],
        categoryId,
        stockQty: normalizedStock,
        inStock: normalizedStock > 0,
        visible: form.visible,
        featured: form.featured,
        newArrival: product?.newArrival ?? false,
        bestSeller: product?.bestSeller ?? false,
        specs: {
          capacity: form.sizeValue.trim() || null,
          unit: form.sizeUnit || null,
          dimensions: form.dimensions.trim() || null,
        },
      };

      if (product) {
        const payload: ProductUpdate = {
          ...basePayload,
          discountPct: discount,
          subcategoryId,
        };
        await updateProduct.mutateAsync({ id: product.id, data: payload });
      } else {
        const payload: ProductInput = {
          ...basePayload,
          ...(discount === null ? {} : { discountPct: discount }),
          ...(subcategoryId === null ? {} : { subcategoryId }),
        };
        await createProduct.mutateAsync({ data: payload });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() }),
        ...(product ? [queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(product.id) })] : []),
      ]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', product ? 'Product changes are live on the store website.' : 'The product has been added to the store.', [
        { text: 'Done', onPress: () => router.replace('/(tabs)/products') },
      ]);
    } catch (error) {
      Alert.alert('Could not save product', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.editorRoot, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.editorContent}
        keyboardShouldPersistTaps="handled"
        bottomOffset={88}
      >
        <View style={styles.editorHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color={colors.adminDeep} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.editorKicker, { color: colors.adminTeal }]}>MIMIIHUB / CATALOG</Text>
            <Text style={[styles.editorTitle, { color: colors.foreground }]}>{product ? 'Edit product' : 'New product'}</Text>
          </View>
        </View>

        <Card style={styles.formCard}>
          <TextField label="Product name" value={form.name} onChangeText={(value) => setField('name', value)} placeholder="e.g. Woven cotton bedsheet set" testID="product-name" />
          <TextField label="Description" value={form.description} onChangeText={(value) => setField('description', value)} placeholder="Describe the product for shoppers" multiline testID="product-description" />
          <View style={styles.twoColumns}>
            <TextField label="Price (₦)" value={form.price} onChangeText={(value) => setField('price', value)} keyboardType="decimal-pad" placeholder="0" testID="product-price" />
            <TextField label="Discount (%)" value={form.discountPct} onChangeText={(value) => setField('discountPct', value)} keyboardType="decimal-pad" placeholder="Optional" testID="product-discount" />
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text style={[styles.formSectionTitle, { color: colors.foreground }]}>Collection</Text>
          {categoriesQuery.isLoading ? <LoadingState label="Loading categories…" /> : null}
          {categoriesQuery.isError ? (
            <Text style={[styles.help, { color: colors.destructive }]}>Could not load categories. Check your connection and retry.</Text>
          ) : (
            <>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {categories.map((category) => (
                  <ChoiceChip
                    key={category.id}
                    label={category.name}
                    selected={form.categoryId === String(category.id)}
                    onPress={() => {
                      setField('categoryId', String(category.id));
                      setField('subcategoryId', '');
                    }}
                    testID={`product-category-${category.id}`}
                  />
                ))}
              </ScrollView>
              {subcategories.length ? (
                <>
                  <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Subcategory</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    <ChoiceChip label="None" selected={!form.subcategoryId} onPress={() => setField('subcategoryId', '')} />
                    {subcategories.map((subcategory) => (
                      <ChoiceChip
                        key={subcategory.id}
                        label={subcategory.name}
                        selected={form.subcategoryId === String(subcategory.id)}
                        onPress={() => setField('subcategoryId', String(subcategory.id))}
                      />
                    ))}
                  </ScrollView>
                </>
              ) : null}
            </>
          )}
        </Card>

        <Card style={styles.formCard}>
          <View style={styles.sectionRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.formSectionTitle, { color: colors.foreground }]}>Product photos</Text>
              <Text style={[styles.help, { color: colors.mutedForeground }]}>Choose up to 8 images. They upload to the existing Supabase Storage bucket.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Add product photos" testID="product-add-images" onPress={() => void chooseImages()} style={styles.photoAction}>
              <Feather name="plus" size={17} color={colors.adminTeal} />
              <Text style={[styles.photoActionText, { color: colors.adminTeal }]}>Add</Text>
            </Pressable>
          </View>
          {images.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
              {images.map((image, index) => (
                <View key={`${image.uri}-${index}`} style={styles.photoItem}>
                  <Image source={{ uri: image.uri }} contentFit="cover" style={styles.photo} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${index + 1}`}
                    testID={`product-remove-image-${index}`}
                    onPress={() => removeImage(image.uri)}
                    style={[styles.removePhoto, { backgroundColor: colors.card }]}
                  >
                    <Feather name="x" size={13} color={colors.destructive} />
                  </Pressable>
                  {index === 0 ? <Text style={[styles.coverTag, { backgroundColor: colors.adminDeep, color: colors.primaryForeground }]}>COVER</Text> : null}
                </View>
              ))}
            </ScrollView>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => void chooseImages()} style={[styles.photoEmpty, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Feather name="image" size={22} color={colors.adminTeal} />
              <Text style={[styles.help, { color: colors.mutedForeground }]}>Add at least one photo</Text>
            </Pressable>
          )}
        </Card>

        <Card style={styles.formCard}>
          <Text style={[styles.formSectionTitle, { color: colors.foreground }]}>Stock and display</Text>
          <View style={styles.twoColumns}>
            <TextField label="Units in stock" value={form.stockQty} onChangeText={(value) => setField('stockQty', value)} keyboardType="number-pad" placeholder="0" testID="product-stock" />
            <TextField label="Size / capacity" value={form.sizeValue} onChangeText={(value) => setField('sizeValue', value)} placeholder="e.g. 500" testID="product-size" />
          </View>
          <TextField label="Size unit" value={form.sizeUnit} onChangeText={(value) => setField('sizeUnit', value)} placeholder="ml, kg, cm…" testID="product-size-unit" />
          <TextField label="Dimensions" value={form.dimensions} onChangeText={(value) => setField('dimensions', value)} placeholder="e.g. 18 × 10 × 10 cm" testID="product-dimensions" />
          <ToggleRow title="Visible on website" value={form.visible} onValueChange={(value) => setField('visible', value)} />
          <ToggleRow title="Featured product" value={form.featured} onValueChange={(value) => setField('featured', value)} />
        </Card>

        {validationError ? (
          <Text accessibilityRole="alert" style={[styles.validation, { color: colors.destructive }]}>{validationError}</Text>
        ) : null}
        <ActionButton label={product ? 'Save changes' : 'Add product'} icon="check" loading={busy} disabled={busy} onPress={() => void submit()} testID="product-submit" />
        <ActionButton label="Cancel" variant="secondary" disabled={busy} onPress={() => router.back()} testID="product-cancel" />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function ToggleRow({
  title,
  value,
  onValueChange,
}: {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.toggle}>
      <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{title}</Text>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.adminTeal }}
        thumbColor={colors.card}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadError: { fontFamily: 'Manrope_500Medium', fontSize: 13, padding: 24 },
  editorRoot: { flex: 1 },
  editorContent: { gap: 14, paddingTop: 54, paddingHorizontal: 18, paddingBottom: 30 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 3 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  editorKicker: { fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 1.4 },
  editorTitle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 27 },
  formCard: { gap: 15 },
  formSectionTitle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 18 },
  formLabel: { fontFamily: 'Manrope_700Bold', fontSize: 10, marginTop: 3 },
  help: { fontFamily: 'Manrope_400Regular', fontSize: 10, lineHeight: 16 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  chips: { gap: 8, paddingVertical: 3 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoAction: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 5 },
  photoActionText: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  photoStrip: { gap: 9, paddingVertical: 3 },
  photoItem: { position: 'relative' },
  photo: { width: 90, height: 90, borderRadius: 14, backgroundColor: '#EEEAE2' },
  removePhoto: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  coverTag: { position: 'absolute', bottom: 5, left: 5, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, fontFamily: 'Manrope_700Bold', fontSize: 8 },
  photoEmpty: { minHeight: 108, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, gap: 7, alignItems: 'center', justifyContent: 'center' },
  toggle: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggleLabel: { flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 12 },
  validation: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
});
