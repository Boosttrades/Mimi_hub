import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useGetPaymentSettings, useGetStoreSettings } from '@workspace/api-client-react';
import {
  ActionButton,
  Card,
  ErrorState,
  LoadingState,
  Page,
  SectionTitle,
} from '@/components/AdminUI';
import { useColors } from '@/hooks/useColors';
import { formatNaira, getErrorMessage } from '@/lib/format';

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const storeQuery = useGetStoreSettings();
  const paymentQuery = useGetPaymentSettings();

  if (storeQuery.isLoading || paymentQuery.isLoading) {
    return <Page title="Settings" showBack><LoadingState label="Loading store settings…" /></Page>;
  }

  if (storeQuery.isError || paymentQuery.isError || !storeQuery.data || !paymentQuery.data) {
    const error = storeQuery.error ?? paymentQuery.error;
    return (
      <Page title="Settings" showBack>
        <ErrorState
          message={getErrorMessage(error)}
          onRetry={() => {
            void storeQuery.refetch();
            void paymentQuery.refetch();
          }}
        />
      </Page>
    );
  }

  const store = storeQuery.data;
  const payment = paymentQuery.data;

  return (
    <Page
      title="Settings"
      subtitle="Review your store details and payment options. Changes here are shared with the MimiiHub website."
      showBack
      onRefresh={() => {
        void storeQuery.refetch();
        void paymentQuery.refetch();
      }}
      refreshing={storeQuery.isRefetching || paymentQuery.isRefetching}
    >
      <Card>
        <SectionTitle title="Store profile" />
        <ValueRow label="Store name" value={store.storeName} />
        <ValueRow label="Contact email" value={store.email} />
        <ValueRow label="Contact phone" value={store.contactPhone || 'Not set'} />
        <ValueRow label="WhatsApp" value={store.whatsapp || 'Not set'} />
        <ValueRow
          label="Low-stock alert"
          value={`${store.lowStockThreshold ?? 5} units`}
          last
        />
        <ActionButton
          label="Edit store & delivery"
          icon="edit-2"
          variant="secondary"
          onPress={() => router.push('/manage/store')}
          testID="settings-edit-store"
        />
      </Card>

      <Card>
        <SectionTitle title="Delivery" />
        <ValueRow
          label="Delivery fee"
          value={formatNaira(store.deliverySettings?.deliveryFee ?? 0)}
        />
        <ValueRow
          label="Free delivery from"
          value={store.deliverySettings?.freeDeliveryThreshold == null
            ? 'Not set'
            : formatNaira(store.deliverySettings.freeDeliveryThreshold)}
        />
        <ValueRow
          label="Delivery note"
          value={store.deliverySettings?.deliveryNote || 'Not set'}
          last
        />
        <ActionButton
          label="Edit delivery details"
          icon="truck"
          variant="secondary"
          onPress={() => router.push('/manage/store')}
          testID="settings-edit-delivery"
        />
      </Card>

      <Card>
        <SectionTitle title="Payment methods" />
        <PaymentRow label="Flutterwave online payments" enabled={payment.flutterwaveEnabled} />
        <PaymentRow label="Pay on delivery" enabled={payment.payOnDeliveryEnabled} />
        <ActionButton
          label="Configure payments"
          icon="credit-card"
          variant="secondary"
          onPress={() => router.push('/manage/payment')}
          testID="settings-edit-payments"
        />
      </Card>
    </Page>
  );

  function ValueRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
    return (
      <View style={[
        styles.valueRow,
        !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    );
  }

  function PaymentRow({ label, enabled }: { label: string; enabled: boolean }) {
    return (
      <View style={[styles.valueRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.paymentState, { color: enabled ? colors.adminTeal : colors.mutedForeground }]}>
          {enabled ? 'Enabled' : 'Disabled'}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  valueRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingVertical: 9 },
  rowLabel: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 11 },
  rowValue: { flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 11, textAlign: 'right' },
  paymentState: { fontFamily: 'Manrope_700Bold', fontSize: 11 },
});
