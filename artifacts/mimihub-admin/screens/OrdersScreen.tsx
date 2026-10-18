import { Feather } from '@expo/vector-icons';
import {
  getGetAdminSummaryQueryKey,
  getGetOrderStatsQueryKey,
  getListOrdersQueryKey,
  type OrderStatus,
  useListOrders,
  useUpdateOrderStatus,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Card, ChoiceChip, EmptyState, ErrorState, Page, StatusBadge } from '@/components/AdminUI';
import { useColors } from '@/hooks/useColors';
import { formatDate, formatNaira, getErrorMessage } from '@/lib/format';

const filters: Array<'All' | OrderStatus> = ['All', 'Confirming', 'Preparing', 'Shipping', 'Delivered', 'Cancelled'];
const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  Confirming: 'Preparing',
  Preparing: 'Shipping',
  Shipping: 'Delivered',
};

export default function OrdersScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'All' | OrderStatus>('All');
  const orders = useListOrders(filter === 'All' ? undefined : { status: filter });
  const updateOrder = useUpdateOrderStatus();

  const applyStatus = (id: number, status: OrderStatus) => {
    const inventoryNote = status === 'Delivered'
      ? '\n\nMarking an order delivered deducts its items from inventory.'
      : '';
    Alert.alert('Update order status?', `Set this order to ${status}?${inventoryNote}`, [
      { text: 'Not now', style: 'cancel' },
      {
        text: `Set ${status}`,
        onPress: async () => {
          try {
            await updateOrder.mutateAsync({ id, data: { orderStatus: status } });
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }),
              queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() }),
              queryClient.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() }),
            ]);
          } catch (error) {
            Alert.alert('Could not update order', getErrorMessage(error));
          }
        },
      },
    ]);
  };

  return (
    <Page
      title="Orders"
      subtitle="Review purchases and move each order through fulfillment."
      onRefresh={() => void orders.refetch()}
      refreshing={orders.isRefetching}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((status) => (
          <ChoiceChip
            key={status}
            label={status}
            selected={filter === status}
            onPress={() => setFilter(status)}
            testID={`orders-filter-${status.toLowerCase()}`}
          />
        ))}
      </ScrollView>
      {orders.isError ? (
        <ErrorState message={getErrorMessage(orders.error)} onRetry={() => void orders.refetch()} />
      ) : orders.isLoading ? (
        <View style={styles.loading}><Feather name="loader" size={22} color={colors.adminTeal} /></View>
      ) : orders.data?.length ? (
        <View style={styles.list}>
          {orders.data.map((order) => {
            const advanceTo = nextStatus[order.orderStatus];
            return (
              <Card key={order.id} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.reference, { color: colors.adminDeep }]}>{order.orderRef}</Text>
                    <Text style={[styles.customer, { color: colors.foreground }]}>{order.fullName}</Text>
                  </View>
                  <StatusBadge label={order.orderStatus} />
                </View>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>{formatDate(order.createdAt)} · {order.city}, {order.state}</Text>
                <View style={[styles.divider, { borderColor: colors.border }]} />
                <View style={styles.orderBottom}>
                  <View style={{ gap: 3 }}>
                    <Text style={[styles.total, { color: colors.foreground }]}>{formatNaira(order.subtotal)}</Text>
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>{order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.paymentStatus}</Text>
                  </View>
                  {advanceTo ? (
                    <ActionButton
                      label={advanceTo === 'Preparing' ? 'Prepare' : advanceTo === 'Shipping' ? 'Ship' : 'Deliver'}
                      icon={advanceTo === 'Delivered' ? 'check' : 'arrow-right'}
                      compact
                      loading={updateOrder.isPending && updateOrder.variables?.id === order.id}
                      onPress={() => applyStatus(order.id, advanceTo)}
                      testID={`order-advance-${order.id}`}
                    />
                  ) : null}
                </View>
                {order.orderStatus !== 'Cancelled' && order.orderStatus !== 'Delivered' ? (
                  <ActionButton
                    label="Cancel order"
                    icon="x"
                    variant="quiet"
                    compact
                    onPress={() => applyStatus(order.id, 'Cancelled')}
                    testID={`order-cancel-${order.id}`}
                  />
                ) : null}
                <View style={styles.itemList}>
                  {order.items.slice(0, 2).map((item) => (
                    <Text key={`${order.id}-${item.productId}`} numberOfLines={1} style={[styles.itemText, { color: colors.mutedForeground }]}>
                      {item.quantity} × {item.productName}
                    </Text>
                  ))}
                  {order.items.length > 2 ? (
                    <Text style={[styles.itemText, { color: colors.mutedForeground }]}>+ {order.items.length - 2} more</Text>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <Card><EmptyState icon="shopping-bag" title="No orders in this view" detail="Orders placed on the website will appear here." /></Card>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  filters: { gap: 8, paddingRight: 18 },
  loading: { padding: 24, alignItems: 'center' },
  list: { gap: 11 },
  orderCard: { gap: 10 },
  orderTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reference: { fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 0.5 },
  customer: { fontFamily: 'Manrope_700Bold', fontSize: 14 },
  meta: { fontFamily: 'Manrope_400Regular', fontSize: 10 },
  divider: { borderBottomWidth: 1 },
  orderBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  total: { fontFamily: 'Manrope_700Bold', fontSize: 15 },
  itemList: { gap: 4, paddingTop: 3 },
  itemText: { fontFamily: 'Manrope_400Regular', fontSize: 10 },
});
