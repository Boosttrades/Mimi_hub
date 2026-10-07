import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Page } from '@/components/AdminUI';
import { useColors } from '@/hooks/useColors';

const manageLinks = [
  { title: 'Categories', detail: 'Collections and subcategories', icon: 'grid' as const, href: '/manage/categories' as const },
  { title: 'Store & delivery', detail: 'Shop identity, contact, delivery fees', icon: 'truck' as const, href: '/manage/store' as const },
  { title: 'Website homepage', detail: 'Hero banners shown on the store website', icon: 'image' as const, href: '/manage/homepage' as const },
];

export default function ManageScreen() {
  const colors = useColors();
  const router = useRouter();
  return (
    <Page title="Store controls" subtitle="The MimiiHub website stays online; these controls update its shared store data.">
      <View style={styles.list}>
        {manageLinks.map((link) => (
          <Pressable
            key={link.title}
            accessibilityRole="button"
            testID={`manage-${link.title.toLowerCase().replace(/[^a-z]+/g, '-')}`}
            onPress={() => router.push(link.href)}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <Card style={styles.linkCard}>
              <View style={[styles.iconTile, { backgroundColor: colors.secondary }]}>
                <Feather name={link.icon} size={19} color={colors.adminTeal} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.linkTitle, { color: colors.foreground }]}>{link.title}</Text>
                <Text style={[styles.linkDetail, { color: colors.mutedForeground }]}>{link.detail}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Card>
          </Pressable>
        ))}
      </View>
      <Card style={{ backgroundColor: colors.adminSand }}>
        <Text style={[styles.noteTitle, { color: colors.adminDeep }]}>Same store, separate control app</Text>
        <Text style={[styles.linkDetail, { color: colors.foreground }]}>
          Product, order, and settings updates go through the existing MimiiHub API and Supabase project. No duplicate store database is created.
        </Text>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15 },
  iconTile: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  linkTitle: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  linkDetail: { fontFamily: 'Manrope_400Regular', fontSize: 11, lineHeight: 17 },
  noteTitle: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
});
