import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetHomepageSettingsQueryKey,
  useGetHomepageSettings,
  useUpdateHomepageSettings,
  type FeaturedCollection,
  type HeroBanner,
  type HomepageSettings,
  type TrustItem,
} from '@workspace/api-client-react';
import {
  ActionButton,
  Card,
  ErrorState,
  IconAction,
  LoadingState,
  Page,
  SectionTitle,
  TextField,
} from '@/components/AdminUI';
import { getErrorMessage } from '@/lib/format';
import { useColors } from '@/hooks/useColors';

export default function HomepageScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const settingsQuery = useGetHomepageSettings();
  const updateSettings = useUpdateHomepageSettings();
  const [draft, setDraft] = useState<HomepageSettings | null>(null);

  if (settingsQuery.isLoading) {
    return <Page title="Website homepage" showBack><LoadingState label="Loading homepage content…" /></Page>;
  }
  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <Page title="Website homepage" showBack>
        <ErrorState message={getErrorMessage(settingsQuery.error)} onRetry={() => void settingsQuery.refetch()} />
      </Page>
    );
  }

  const data = draft ?? settingsQuery.data;

  function updateBanner(id: string, field: keyof HeroBanner, value: string) {
    setDraft((current) => {
      const base = current ?? settingsQuery.data!;
      return {
        ...base,
        heroBanners: base.heroBanners.map((banner) =>
          banner.id === id ? { ...banner, [field]: value } : banner,
        ),
      };
    });
  }

  function updateTrustItem(id: string, field: keyof TrustItem, value: string) {
    setDraft((current) => {
      const base = current ?? settingsQuery.data!;
      return {
        ...base,
        trustItems: base.trustItems.map((item) => item.id === id ? { ...item, [field]: value } : item),
      };
    });
  }

  function updateCollection(id: string, field: keyof FeaturedCollection, value: string) {
    setDraft((current) => {
      const base = current ?? settingsQuery.data!;
      return {
        ...base,
        featuredCollections: base.featuredCollections.map((item) =>
          item.id === id ? { ...item, [field]: value } : item,
        ),
      };
    });
  }

  function confirmRemove(label: string, onRemove: () => void) {
    Alert.alert(`Remove ${label}?`, 'This item will no longer appear on the website homepage.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: onRemove,
      },
    ]);
  }

  function removeBanner(id: string) {
    confirmRemove('banner', () => setDraft((current) => {
      const base = current ?? settingsQuery.data!;
      return { ...base, heroBanners: base.heroBanners.filter((item) => item.id !== id) };
    }));
  }

  function removeTrustItem(id: string) {
    confirmRemove('trust message', () => setDraft((current) => {
      const base = current ?? settingsQuery.data!;
      return { ...base, trustItems: base.trustItems.filter((item) => item.id !== id) };
    }));
  }

  function removeCollection(id: string) {
    confirmRemove('collection', () => setDraft((current) => {
      const base = current ?? settingsQuery.data!;
      return { ...base, featuredCollections: base.featuredCollections.filter((item) => item.id !== id) };
    }));
  }

  function addBanner() {
    setDraft((current) => ({
      ...(current ?? settingsQuery.data!),
      heroBanners: [
        ...(current ?? settingsQuery.data!).heroBanners,
        { id: `banner-${Date.now()}`, title: '', subtitle: '', image: '', buttonText: 'Shop now', buttonLink: '' },
      ],
    }));
  }

  function addTrustItem() {
    setDraft((current) => ({
      ...(current ?? settingsQuery.data!),
      trustItems: [
        ...(current ?? settingsQuery.data!).trustItems,
        { id: `trust-${Date.now()}`, title: '', subtitle: '', icon: 'star' },
      ],
    }));
  }

  function addCollection() {
    setDraft((current) => ({
      ...(current ?? settingsQuery.data!),
      featuredCollections: [
        ...(current ?? settingsQuery.data!).featuredCollections,
        { id: `collection-${Date.now()}`, title: '', description: '', image: '', link: '' },
      ],
    }));
  }

  async function save() {
    try {
      const saved = await updateSettings.mutateAsync({ data });
      setDraft(saved);
      await queryClient.invalidateQueries({ queryKey: getGetHomepageSettingsQueryKey() });
      Alert.alert('Homepage saved', 'Your homepage content has been updated.');
    } catch (error) {
      Alert.alert('Could not save homepage', getErrorMessage(error));
    }
  }

  return (
    <Page
      title="Website homepage"
      subtitle="Edit the banners, trust messages, and featured collections shown to shoppers."
      showBack
      onRefresh={() => void settingsQuery.refetch()}
      refreshing={settingsQuery.isRefetching}
    >
      <View style={styles.sections}>
        <Card>
          <SectionTitle
            title={`Hero banners · ${data.heroBanners.length}`}
            action={<IconAction icon="plus" label="Add hero banner" onPress={addBanner} />}
          />
          {data.heroBanners.map((banner, index) => (
              <Card key={banner.id} style={[styles.itemCard, { backgroundColor: colors.muted }]}>
              <SectionTitle
                title={`Banner ${index + 1}`}
                action={<IconAction icon="trash-2" label={`Remove banner ${index + 1}`} onPress={() => removeBanner(banner.id)} />}
              />
              <TextField label="Title" value={banner.title} onChangeText={(value) => updateBanner(banner.id, 'title', value)} />
              <TextField label="Subtitle" value={banner.subtitle} onChangeText={(value) => updateBanner(banner.id, 'subtitle', value)} multiline />
              <TextField label="Image URL" value={banner.image} onChangeText={(value) => updateBanner(banner.id, 'image', value)} autoCapitalize="none" keyboardType="url" />
              <TextField label="Button text" value={banner.buttonText ?? ''} onChangeText={(value) => updateBanner(banner.id, 'buttonText', value)} />
              <TextField label="Button link" value={banner.buttonLink ?? ''} onChangeText={(value) => updateBanner(banner.id, 'buttonLink', value)} autoCapitalize="none" />
            </Card>
          ))}
          {data.heroBanners.length === 0 ? (
            <ActionButton label="Add first banner" icon="plus" variant="secondary" onPress={addBanner} compact />
          ) : null}
        </Card>

        <Card>
          <SectionTitle
            title={`Trust messages · ${data.trustItems.length}`}
            action={<IconAction icon="plus" label="Add trust message" onPress={addTrustItem} />}
          />
          {data.trustItems.map((item, index) => (
              <Card key={item.id} style={[styles.itemCard, { backgroundColor: colors.muted }]}>
              <SectionTitle
                title={`Message ${index + 1}`}
                action={<IconAction icon="trash-2" label={`Remove message ${index + 1}`} onPress={() => removeTrustItem(item.id)} />}
              />
              <TextField label="Title" value={item.title} onChangeText={(value) => updateTrustItem(item.id, 'title', value)} />
              <TextField label="Subtitle" value={item.subtitle} onChangeText={(value) => updateTrustItem(item.id, 'subtitle', value)} />
              <TextField label="Icon name" value={item.icon} onChangeText={(value) => updateTrustItem(item.id, 'icon', value)} autoCapitalize="none" />
            </Card>
          ))}
          {data.trustItems.length === 0 ? (
            <ActionButton label="Add first message" icon="plus" variant="secondary" onPress={addTrustItem} compact />
          ) : null}
        </Card>

        <Card>
          <SectionTitle
            title={`Featured collections · ${data.featuredCollections.length}`}
            action={<IconAction icon="plus" label="Add collection" onPress={addCollection} />}
          />
          {data.featuredCollections.map((item, index) => (
              <Card key={item.id} style={[styles.itemCard, { backgroundColor: colors.muted }]}>
              <SectionTitle
                title={`Collection ${index + 1}`}
                action={<IconAction icon="trash-2" label={`Remove collection ${index + 1}`} onPress={() => removeCollection(item.id)} />}
              />
              <TextField label="Title" value={item.title} onChangeText={(value) => updateCollection(item.id, 'title', value)} />
              <TextField label="Description" value={item.description} onChangeText={(value) => updateCollection(item.id, 'description', value)} multiline />
              <TextField label="Image URL" value={item.image} onChangeText={(value) => updateCollection(item.id, 'image', value)} autoCapitalize="none" keyboardType="url" />
              <TextField label="Link" value={item.link} onChangeText={(value) => updateCollection(item.id, 'link', value)} autoCapitalize="none" />
            </Card>
          ))}
          {data.featuredCollections.length === 0 ? (
            <ActionButton label="Add first collection" icon="plus" variant="secondary" onPress={addCollection} compact />
          ) : null}
        </Card>
      </View>

      <ActionButton
        label="Save homepage"
        icon="check"
        loading={updateSettings.isPending}
        disabled={updateSettings.isPending}
        onPress={() => void save()}
        testID="homepage-save"
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  sections: { gap: 14 },
  itemCard: { marginTop: 4 },
});
