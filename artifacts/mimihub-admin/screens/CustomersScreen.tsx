import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useGetAdminSummary } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, LoadingState, Page, TextField } from '@/components/AdminUI';
import { formatDate, formatNaira, getErrorMessage } from '@/lib/format';
import { useColors } from '@/hooks/useColors';

export default function CustomersScreen() {
  const colors = useColors();
  const [search, setSearch] = useState('');
  const summaryQuery = useGetAdminSummary();
  const customers = summaryQuery.data?.customers ?? [];
  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      `${customer.name} ${customer.phone} ${customer.location}`.toLowerCase().includes(term),
    );
  }, [customers, search]);

  if (summaryQuery.isLoading) {
    return <Page title="Customers" showBack><LoadingState label="Loading customer activity…" /></Page>;
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <Page title="Customers" showBack>
        <ErrorState message={getErrorMessage(summaryQuery.error)} onRetry={() => void summaryQuery.refetch()} />
      </Page>
    );
  }

  const returningPercent = summaryQuery.data.totalCustomers
    ? Math.round((summaryQuery.data.returningCustomers / summaryQuery.data.totalCustomers) * 100)
    : 0;

  return (
    <Page
      title="Customers"
      subtitle="Customer details are grouped from real orders by phone number."
      showBack
      onRefresh={() => void summaryQuery.refetch()}
      refreshing={summaryQuery.isRefetching}
    >
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{summaryQuery.data.totalCustomers}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>All customers</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.adminTeal }]}>{returningPercent}%</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Returning</Text>
        </Card>
      </View>

      <TextField
        label="Search customers"
        value={search}
        onChangeText={setSearch}
        placeholder="Name, phone, or location"
        autoCapitalize="none"
        testID="customers-search"
      />

      {filteredCustomers.length === 0 ? (
        <Card>
          <EmptyState
            title={customers.length ? 'No matching customers' : 'No customers yet'}
            detail={customers.length ? 'Try a different name, phone, or location.' : 'Customers appear after real orders are placed.'}
            icon="users"
          />
        </Card>
      ) : (
        <View style={styles.customerList}>
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} style={styles.customerCard} >
              <View style={styles.customerTop}>
                <View style={[styles.avatar, { backgroundColor: `${colors.adminGold}35` }]}>
                  <Text style={[styles.initials, { color: colors.adminDeep }]}>
                    {customer.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.customerIdentity}>
                  <Text style={[styles.customerName, { color: colors.foreground }]}>{customer.name}</Text>
                  <Text style={[styles.customerMeta, { color: colors.mutedForeground }]}>{customer.phone}</Text>
                  <Text style={[styles.customerMeta, { color: colors.mutedForeground }]}>{customer.location || 'Location not provided'}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${customer.name}`}
                  onPress={() => {
                    const phone = customer.phone.replace(/[^\d+]/g, '');
                    void Linking.openURL(`tel:${phone}`).catch(() =>
                      Alert.alert('Unable to start a call', 'Calling is not available on this device.'),
                    );
                  }}
                  style={[styles.callButton, { backgroundColor: colors.secondary }]}
                >
                  <Text style={[styles.callText, { color: colors.adminTeal }]}>Call</Text>
                </Pressable>
              </View>
              <View style={[styles.customerSummary, { borderTopColor: colors.border }]}>
                <View style={styles.summaryCell}>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatNaira(customer.spend)}</Text>
                  <Text style={[styles.customerMeta, { color: colors.mutedForeground }]}>Total spend</Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{customer.orders}</Text>
                  <Text style={[styles.customerMeta, { color: colors.mutedForeground }]}>Orders · first {formatDate(customer.firstOrderAt)}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, gap: 3, paddingVertical: 13 },
  statValue: { fontFamily: 'Manrope_700Bold', fontSize: 22 },
  statLabel: { fontFamily: 'Manrope_500Medium', fontSize: 10 },
  customerList: { gap: 11 },
  customerCard: { gap: 13 },
  customerTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  customerIdentity: { flex: 1, gap: 3 },
  customerName: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  customerMeta: { fontFamily: 'Manrope_400Regular', fontSize: 10, lineHeight: 15 },
  callButton: { minWidth: 52, minHeight: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  callText: { fontFamily: 'Manrope_700Bold', fontSize: 11 },
  customerSummary: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, paddingTop: 11 },
  summaryCell: { flex: 1, gap: 3 },
  summaryValue: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
});
