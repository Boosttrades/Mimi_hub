import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useGetAdminSummary, useListOrders } from '@workspace/api-client-react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Card, ErrorState, Page, SectionTitle, StatusBadge } from '@/components/AdminUI';
import { useColors } from '@/hooks/useColors';
import { formatDate, formatNaira, getErrorMessage } from '@/lib/format';

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const summary = useGetAdminSummary();
  const orders = useListOrders();
  const refreshing = summary.isRefetching || orders.isRefetching;
  const refresh = () => queryClient.invalidateQueries();

  if (summary.isLoading) {
    return (
      <Page title="Your store">
        <View style={styles.loading}><ActivityIndicator color={colors.adminTeal} size="large" /></View>
      </Page>
    );
  }

  if (summary.isError || !summary.data) {
    return (
      <Page title="Your store">
        <ErrorState message={getErrorMessage(summary.error)} onRetry={() => void summary.refetch()} />
      </Page>
    );
  }

  return (
    <Page
      title="Your store"
      subtitle="A clear view of what needs your attention today."
      onRefresh={refresh}
      refreshing={refreshing}
    >
      <Card style={{ backgroundColor: colors.adminDeep, borderColor: colors.adminDeep, padding: 18 }}>
        <View style={styles.openAccessHeading}>
          <View style={[styles.accessIcon, { backgroundColor: `${colors.adminGold}26` }]}>
            <Feather name="unlock" size={15} color={colors.adminGold} />
          </View>
          <Text style={[styles.accessLabel, { color: colors.adminGold }]}>TEMPORARY ACCESS</Text>
        </View>
        <Text style={[styles.accessTitle, { color: colors.primaryForeground }]}>Admin access is open</Text>
        <Text style={[styles.accessCopy, { color: `${colors.primaryForeground}CC` }]}>
          Add an admin allowlist before sharing the app beyond your trusted team.
        </Text>
      </Card>

      <View style={styles.metrics}>
        <Metric label="This month" value={formatNaira(summary.data.thisMonthRevenue)} icon="trending-up" />
        <Metric label="Orders" value={String(summary.data.totalOrders)} icon="shopping-bag" />
        <Metric label="Awaiting action" value={String(summary.data.pendingOrders)} icon="clock" />
        <Metric label="Low stock" value={String(summary.data.lowStockProducts)} icon="alert-triangle" />
      </View>

      <View style={styles.section}>
        <SectionTitle title="Catalog snapshot" />
        <Card>
          <CountRow icon="package" label="Products in store" value={summary.data.totalProducts} />
          <CountRow icon="eye" label="Published" value={summary.data.visibleProducts} />
          <CountRow icon="eye-off" label="Hidden" value={summary.data.hiddenProducts} />
          <CountRow icon="users" label="Customers" value={summary.data.totalCustomers} last />
        </Card>
        <ActionButton
          label="Manage products"
          icon="arrow-up-right"
          variant="secondary"
          onPress={() => router.push('/(tabs)/products')}
          testID="dashboard-products"
        />
      </View>

      <View style={styles.section}>
        <SectionTitle
          title="Recent orders"
          action={
            <Pressable onPress={() => router.push('/(tabs)/orders')} accessibilityRole="button">
              <Text style={[styles.textAction, { color: colors.adminTeal }]}>View all</Text>
            </Pressable>
          }
        />
        {orders.isLoading ? (
          <View style={styles.inlineLoading}><ActivityIndicator color={colors.adminTeal} /></View>
        ) : orders.data?.length ? (
          orders.data.slice(0, 3).map((order) => (
            <Card key={order.id}>
              <View style={styles.orderLine}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.orderRef, { color: colors.foreground }]}>{order.orderRef}</Text>
                  <Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>{order.fullName} · {formatDate(order.createdAt)}</Text>
                </View>
                <StatusBadge label={order.orderStatus} />
              </View>
              <Text style={[styles.orderValue, { color: colors.adminDeep }]}>{formatNaira(order.subtotal)}</Text>
            </Card>
          ))
        ) : (
          <Card><Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>No orders yet.</Text></Card>
        )}
      </View>
    </Page>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  const colors = useColors();
  return (
    <Card style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Feather name={icon} size={16} color={colors.adminTeal} />
      </View>
      <Text numberOfLines={1} style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Card>
  );
}

function CountRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: number;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.countRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Feather name={icon} size={15} color={colors.adminTeal} />
      <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.countValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 80, alignItems: 'center' },
  openAccessHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accessIcon: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  accessLabel: { fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 1.2 },
  accessTitle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 20, marginTop: 2 },
  accessCopy: { fontFamily: 'Manrope_400Regular', fontSize: 11, lineHeight: 17 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', flexGrow: 1, padding: 14, gap: 4 },
  metricHeader: { height: 19, justifyContent: 'center' },
  metricValue: { fontFamily: 'Manrope_700Bold', fontSize: 20, letterSpacing: -0.5 },
  metricLabel: { fontFamily: 'Manrope_500Medium', fontSize: 10 },
  section: { gap: 11 },
  textAction: { fontFamily: 'Manrope_700Bold', fontSize: 11 },
  countRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 11 },
  countLabel: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 12 },
  countValue: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  orderLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderRef: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  orderMeta: { fontFamily: 'Manrope_400Regular', fontSize: 11 },
  orderValue: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  inlineLoading: { padding: 22, alignItems: 'center' },
});
