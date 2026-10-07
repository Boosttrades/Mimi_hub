import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/useColors';

type PageProps = {
  title: string;
  kicker?: string;
  subtitle?: string;
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Page({
  title,
  kicker = 'MIMIIHUB / ADMIN',
  subtitle,
  children,
  onRefresh,
  refreshing = false,
}: PageProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + 12,
          paddingBottom: bottomInset + (Platform.OS === 'web' ? 42 : 96),
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.adminTeal}
              colors={[colors.adminTeal]}
            />
          ) : undefined
        }
      >
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.adminDeep }]}>
            <Feather name="shopping-bag" size={15} color={colors.adminGold} />
          </View>
          <Text style={[styles.brandName, { color: colors.adminDeep }]}>MimiiHub</Text>
          <Text style={[styles.brandDivider, { color: colors.mutedForeground }]}>/</Text>
          <Text style={[styles.brandAdmin, { color: colors.mutedForeground }]}>ADMIN</Text>
        </View>
        <Text style={[styles.kicker, { color: colors.adminTeal }]}>{kicker}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        ) : null}
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet';
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  compact?: boolean;
};

export function ActionButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
  compact = false,
}: ActionButtonProps) {
  const colors = useColors();
  const palette = {
    primary: { bg: colors.adminDeep, fg: colors.primaryForeground, border: colors.adminDeep },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground, border: colors.border },
    danger: { bg: colors.destructive, fg: colors.destructiveForeground, border: colors.destructive },
    quiet: { bg: 'transparent', fg: colors.adminDeep, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.48 : pressed ? 0.82 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : icon ? (
        <Feather name={icon} size={16} color={palette.fg} />
      ) : null}
      <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconAction({
  icon,
  label,
  onPress,
  color,
  testID,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.iconAction, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Feather name={icon} size={19} color={color ?? colors.adminDeep} />
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  multiline = false,
  style,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.mutedForeground}
        accessibilityLabel={label}
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: error ? colors.destructive : colors.border,
            backgroundColor: colors.card,
            minHeight: multiline ? 96 : 50,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
      {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionTitleText, { color: colors.foreground }]}>{title}</Text>
      {action}
    </View>
  );
}

export function StatusBadge({ label }: { label: string }) {
  const colors = useColors();
  const normalized = label.toLowerCase();
  const tint =
    normalized.includes('deliver') || normalized.includes('paid') || normalized === 'visible'
      ? colors.adminTeal
      : normalized.includes('cancel') || normalized.includes('hidden')
        ? colors.destructive
        : normalized.includes('ship') || normalized.includes('prepar')
          ? colors.adminGold
          : colors.mutedForeground;
  return (
    <View style={[styles.badge, { backgroundColor: `${tint}1A` }]}>
      <Text style={[styles.badgeText, { color: tint }]}>{label}</Text>
    </View>
  );
}

export function ChoiceChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      style={[
        styles.choice,
        {
          backgroundColor: selected ? colors.adminDeep : colors.card,
          borderColor: selected ? colors.adminDeep : colors.border,
        },
      ]}
    >
      <Text style={[styles.choiceText, { color: selected ? colors.primaryForeground : colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ToggleRow({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={[styles.toggleTitle, { color: colors.foreground }]}>{title}</Text>
        {description ? (
          <Text style={[styles.toggleDescription, { color: colors.mutedForeground }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.adminTeal }}
        thumbColor={colors.card}
      />
    </View>
  );
}

export function LoadingState({ label = 'Loading store data…' }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.state}>
      <ActivityIndicator size="large" color={colors.adminTeal} />
      <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const colors = useColors();
  return (
    <Card style={styles.stateCard}>
      <Feather name="alert-circle" size={24} color={colors.destructive} />
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>Could not load this section</Text>
      <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{message}</Text>
      <ActionButton label="Try again" icon="refresh-cw" variant="secondary" onPress={onRetry} />
    </Card>
  );
}

export function EmptyState({
  title,
  detail,
  icon = 'inbox',
}: {
  title: string;
  detail: string;
  icon?: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={21} color={colors.adminTeal} />
      </View>
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  brandMark: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: 'Manrope_700Bold', fontSize: 14, letterSpacing: -0.3 },
  brandDivider: { fontSize: 14 },
  brandAdmin: { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1.4 },
  kicker: { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1.5, marginBottom: 7 },
  title: { fontFamily: 'Fraunces_600SemiBold', fontSize: 32, lineHeight: 38, letterSpacing: -0.7 },
  subtitle: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 20, marginTop: 7 },
  content: { gap: 16, marginTop: 21 },
  card: { borderWidth: 1, padding: 16, gap: 12 },
  button: {
    minHeight: 48,
    paddingHorizontal: 17,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: 12, borderRadius: 12 },
  buttonText: { fontFamily: 'Manrope_700Bold', fontSize: 12, letterSpacing: 0.1 },
  iconAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 7 },
  fieldLabel: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
  },
  errorText: { fontFamily: 'Manrope_500Medium', fontSize: 11 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitleText: { fontFamily: 'Fraunces_600SemiBold', fontSize: 19 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontFamily: 'Manrope_700Bold', fontSize: 10 },
  choice: { minHeight: 38, borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, justifyContent: 'center' },
  choiceText: { fontFamily: 'Manrope_700Bold', fontSize: 11 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 54 },
  toggleCopy: { flex: 1, gap: 3 },
  toggleTitle: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  toggleDescription: { fontFamily: 'Manrope_400Regular', fontSize: 11, lineHeight: 16 },
  state: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 34 },
  stateCard: { alignItems: 'center', paddingVertical: 24 },
  stateTitle: { fontFamily: 'Manrope_700Bold', fontSize: 14, textAlign: 'center' },
  stateText: { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, paddingVertical: 28 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
});
