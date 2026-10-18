import { useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetStoreSettingsQueryKey,
  useGetStoreSettings,
  useUpdateStoreSettings,
  type DeliverySettings,
  type SocialLinks,
  type StoreSettings,
  type StoreSettingsUpdate,
} from '@workspace/api-client-react';
import { ActionButton, Card, ErrorState, LoadingState, Page, SectionTitle, TextField } from '@/components/AdminUI';
import { getErrorMessage } from '@/lib/format';

type StoreTextField = 'storeName' | 'email' | 'contactPhone' | 'whatsapp' | 'logo';
type SocialField = keyof SocialLinks;

export default function StoreSettingsScreen() {
  const queryClient = useQueryClient();
  const settingsQuery = useGetStoreSettings();
  const updateSettings = useUpdateStoreSettings();
  const [draft, setDraft] = useState<StoreSettingsUpdate | null>(null);

  if (settingsQuery.isLoading) {
    return <Page title="Store & delivery" showBack><LoadingState label="Loading store settings…" /></Page>;
  }
  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <Page title="Store & delivery" showBack>
        <ErrorState message={getErrorMessage(settingsQuery.error)} onRetry={() => void settingsQuery.refetch()} />
      </Page>
    );
  }

  const form: StoreSettings = { ...settingsQuery.data, ...draft };

  function patchForm(patch: StoreSettingsUpdate) {
    setDraft((current) => ({ ...settingsQuery.data!, ...current, ...patch }));
  }

  function setStoreField(field: StoreTextField, value: string) {
    patchForm({ [field]: value } as StoreSettingsUpdate);
  }

  function setDeliveryField(field: keyof DeliverySettings, value: string) {
    const delivery = form.deliverySettings ?? {};
    if (field === 'deliveryNote') {
      patchForm({ deliverySettings: { ...delivery, deliveryNote: value } });
      return;
    }
    if (field === 'freeDeliveryThreshold') {
      patchForm({
        deliverySettings: {
          ...delivery,
          freeDeliveryThreshold: value.trim() ? Number(value) : null,
        },
      });
      return;
    }
    patchForm({ deliverySettings: { ...delivery, deliveryFee: Number(value) || 0 } });
  }

  function setSocialField(field: SocialField, value: string) {
    patchForm({
      socialLinks: {
        ...(form.socialLinks ?? {}),
        [field]: value,
      },
    });
  }

  async function save() {
    if (!form.storeName.trim() || !form.email.trim()) {
      Alert.alert('Complete store details', 'Store name and contact email are required.');
      return;
    }
    try {
      const saved = await updateSettings.mutateAsync({ data: form });
      setDraft(saved);
      await queryClient.invalidateQueries({ queryKey: getGetStoreSettingsQueryKey() });
      Alert.alert('Settings saved', 'Store details and delivery information are updated.');
    } catch (error) {
      Alert.alert('Could not save settings', getErrorMessage(error));
    }
  }

  return (
    <Page
      title="Store & delivery"
      subtitle="Update the contact details, delivery terms, and social links shown across your shop."
      showBack
      onRefresh={() => void settingsQuery.refetch()}
      refreshing={settingsQuery.isRefetching}
    >
      <Card>
        <SectionTitle title="Store profile" />
        <TextField label="Store name" value={form.storeName} onChangeText={(value) => setStoreField('storeName', value)} />
        <TextField
          label="Contact email"
          value={form.email}
          onChangeText={(value) => setStoreField('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField
          label="Contact phone"
          value={form.contactPhone ?? ''}
          onChangeText={(value) => setStoreField('contactPhone', value)}
          keyboardType="phone-pad"
        />
        <TextField
          label="WhatsApp number"
          value={form.whatsapp ?? ''}
          onChangeText={(value) => setStoreField('whatsapp', value)}
          keyboardType="phone-pad"
        />
        <TextField
          label="Store logo URL"
          value={form.logo ?? ''}
          onChangeText={(value) => setStoreField('logo', value)}
          placeholder="https://…"
          autoCapitalize="none"
          keyboardType="url"
        />
        <TextField
          label="Low-stock alert threshold"
          value={String(form.lowStockThreshold ?? 5)}
          onChangeText={(value) => patchForm({ lowStockThreshold: Math.max(1, Math.floor(Number(value) || 1)) })}
          keyboardType="number-pad"
        />
      </Card>

      <Card>
        <SectionTitle title="Delivery" />
        <TextField
          label="Delivery fee (₦)"
          value={String(form.deliverySettings?.deliveryFee ?? 0)}
          onChangeText={(value) => setDeliveryField('deliveryFee', value)}
          keyboardType="decimal-pad"
        />
        <TextField
          label="Free delivery from (₦)"
          value={form.deliverySettings?.freeDeliveryThreshold == null ? '' : String(form.deliverySettings.freeDeliveryThreshold)}
          onChangeText={(value) => setDeliveryField('freeDeliveryThreshold', value)}
          keyboardType="decimal-pad"
          placeholder="Leave blank to disable"
        />
        <TextField
          label="Delivery note"
          value={form.deliverySettings?.deliveryNote ?? ''}
          onChangeText={(value) => setDeliveryField('deliveryNote', value)}
          placeholder="e.g. Nationwide delivery available"
          multiline
        />
      </Card>

      <Card>
        <SectionTitle title="Social links" />
        {(['instagram', 'facebook', 'twitter', 'tiktok'] as const).map((field) => (
          <TextField
            key={field}
            label={field[0].toUpperCase() + field.slice(1)}
            value={form.socialLinks?.[field] ?? ''}
            onChangeText={(value) => setSocialField(field, value)}
            placeholder="https://…"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        ))}
      </Card>

      <ActionButton
        label="Save store settings"
        icon="check"
        loading={updateSettings.isPending}
        disabled={updateSettings.isPending}
        onPress={() => void save()}
        testID="store-settings-save"
      />
    </Page>
  );
}
