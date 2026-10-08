import { Feather } from '@expo/vector-icons';
import {
  getListProductsQueryKey,
  useDeleteProduct,
  useListProducts,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Card, EmptyState, ErrorState, Page, StatusBadge, TextField } from '@/components/AdminUI';
import { useColors } from '@/hooks/useColors';
import { formatNaira, getErrorMessage } from '@/lib/format';

export default function ProductsScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const products = useListProducts(search.trim() ? { search: search.trim() } : undefined);
  const removeProduct = useDeleteProduct();

  const confirmDelete = (id: number, name: string) => {
    Alert.alert('Delete product?', `“${name}” will be removed from the store.`, [
      { text: 'Keep product', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeProduct.mutateAsync({ id });
            await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          } catch (error) {
            Alert.alert('Could not delete product', getErrorMessage(error));
          }
        },
      },
    ]);
  };

  return (
    <Page
      title="Products"
      subtitle="Update the catalog that appears on your MimiiHub website."
      onRefresh={() => void products.refetch()}
      refreshing={products.isRefetching}
    >
      <ActionButton
        label="Add a product"
        icon="plus"
        onPress={() => router.push('/product/new')}
        testID="products-add"
      />
      <TextField
        label="Search products"
        value={search}
        onChangeText={setSearch}
        placeholder="Name or description"
        autoCapitalize="none"
        returnKeyType="search"
        testID="products-search"
      />
      {products.isError ? (
        <ErrorState message={getErrorMessage(products.error)} onRetry={() => void products.refetch()} />
      ) : products.isLoading ? (
        <View style={styles.loading}><Feather name="loader" size={22} color={colors.adminTeal} /></View>
      ) : products.data?.length ? (
        <View style={styles.list}>
          <Text style={[styles.listCount, { color: colors.mutedForeground }]}>{products.data.length} products</Text>
          {products.data.map((product) => {
            const image = product.coverImage ?? product.images?.[0] ?? null;
            return (
              <Card key={product.id} style={styles.productCard}>
                {image ? (
                  <Image source={{ uri: image }} contentFit="cover" style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, styles.imageFallback, { backgroundColor: colors.secondary }]}>
                    <Feather name="image" size={20} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={styles.productCopy}>
                  <Text numberOfLines={2} style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
                  <Text style={[styles.productPrice, { color: colors.adminDeep }]}>{formatNaira(product.price)}</Text>
                  <View style={styles.badges}>
                    <StatusBadge label={product.visible ? 'Visible' : 'Hidden'} />
                    <StatusBadge label={(product.stockQty ?? 0) > 0 ? `${product.stockQty ?? 0} in stock` : 'Out of stock'} />
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${product.name}`}
                    testID={`product-edit-${product.id}`}
                    onPress={() => router.push(`/product/${product.id}`)}
                    style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.55 : 1 }]}
                  >
                    <Feather name="edit-2" size={17} color={colors.adminTeal} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${product.name}`}
                    testID={`product-delete-${product.id}`}
                    onPress={() => confirmDelete(product.id, product.name)}
                    style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.55 : 1 }]}
                  >
                    <Feather name="trash-2" size={17} color={colors.destructive} />
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <Card>
          <EmptyState
            icon="package"
            title={search ? 'No matching products' : 'Your catalog is empty'}
            detail={search ? 'Try another name or description.' : 'Add the first product to start building your catalog.'}
          />
        </Card>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  loading: { padding: 24, alignItems: 'center' },
  list: { gap: 11 },
  listCount: { fontFamily: 'Manrope_500Medium', fontSize: 11 },
  productCard: { flexDirection: 'row', alignItems: 'center', padding: 11, gap: 12 },
  productImage: { width: 70, height: 70, borderRadius: 13, backgroundColor: '#EEEAE2' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  productCopy: { flex: 1, gap: 4 },
  productName: { fontFamily: 'Manrope_700Bold', fontSize: 12, lineHeight: 17 },
  productPrice: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  actions: { alignSelf: 'stretch', justifyContent: 'space-around', alignItems: 'center' },
  iconButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
});
