import { useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetPaymentSettingsQueryKey,
  useGetPaymentSettings,
  useUpdatePaymentSettings,
  type PaymentSettings,
  type PaymentSettingsUpdate,
} from '@workspace/api-client-react';
import { ActionButton, Card, ErrorState, LoadingState, Page, SectionTitle, ToggleRow } from '@/components/AdminUI';
import { getErrorMessage } from '@/lib/format';

export default function PaymentSettingsScreen() {
  const queryClient = useQueryClient();
  const settingsQuery = useGetPaymentSettings();
  const updateSettings = useUpdatePaymentSettings();
  const [draft, setDraft] = useState<PaymentSettingsUpdate | null>(null);

  if (settingsQuery.isLoading) {
    return <Page title="Payment settings" showBack><LoadingState label="Loading payment settings…" /></Page>;
  }
  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <Page title="Payment settings" showBack>
        <ErrorState message={getErrorMessage(settingsQuery.error)} onRetry={() => void settingsQuery.refetch()} />
      </Page>
    );
  }

  const form: PaymentSettings = { ...settingsQuery.data, ...draft };

  function patchForm(patch: PaymentSettingsUpdate) {
    setDraft((current) => ({ ...settingsQuery.data!, ...current, ...patch }));
  }

  async function save() {
    try {
      const saved = await updateSettings.mutateAsync({ data: form });
      setDraft(saved);
      await queryClient.invalidateQueries({ queryKey: getGetPaymentSettingsQueryKey() });
      Alert.alert('Payment settings saved', 'Your enabled payment methods are updated.');
    } catch (error) {
      Alert.alert('Could not save payment settings', getErrorMessage(error));
    }
  }

  return (
    <Page
      title="Payment settings"
      subtitle="Choose which payment options shoppers can select at checkout."
      showBack
      onRefresh={() => void settingsQuery.refetch()}
      refreshing={settingsQuery.isRefetching}
    >
      <Card>
        <SectionTitle title="Available methods" />
        <ToggleRow
          title="Flutterwave online payments"
          description="Accept online card and transfer payments."
          value={form.flutterwaveEnabled}
          onValueChange={(value) => patchForm({ flutterwaveEnabled: value })}
        />
        <ToggleRow
          title="Pay on delivery"
          description="Allow customers to pay when their order arrives."
          value={form.payOnDeliveryEnabled}
          onValueChange={(value) => patchForm({ payOnDeliveryEnabled: value })}
        />
      </Card>
      <ActionButton
        label="Save payment settings"
        icon="check"
        loading={updateSettings.isPending}
        disabled={updateSettings.isPending}
        onPress={() => void save()}
        testID="payment-settings-save"
      />
    </Page>
  );
}
