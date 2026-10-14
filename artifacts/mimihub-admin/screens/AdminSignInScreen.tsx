import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Text, View, StyleSheet } from 'react-native';
import { ActionButton, Card, Page, TextField } from '@/components/AdminUI';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';

export default function AdminSignInScreen({ notice }: { notice?: string | null }) {
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signIn = async () => {
    if (!email.trim() || !password || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes('email not confirmed')) {
          setErrorMessage('Verify this email address through the confirmation message from Supabase before signing in.');
        } else if (message.includes('invalid login credentials')) {
          setErrorMessage('That email and password do not match.');
        } else {
          setErrorMessage(error.message);
        }
        return;
      }
      if (!data.session) {
        setErrorMessage('Supabase did not return a signed-in session. Please try again.');
      }
    } catch {
      setErrorMessage('Could not reach Supabase. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Page
      title="Admin sign in"
      subtitle="Use your verified MimiiHub account to manage the store."
    >
      <Card style={styles.introCard}>
        <View style={[styles.iconTile, { backgroundColor: colors.secondary }]}>
          <Feather name="shield" size={19} color={colors.adminTeal} />
        </View>
        <Text style={[styles.introText, { color: colors.mutedForeground }]}>
          Only accounts with the admin role in Supabase can access the control panel.
        </Text>
      </Card>

      {notice ? (
        <Text accessibilityRole="alert" style={[styles.message, { color: colors.destructive }]}>
          {notice}
        </Text>
      ) : null}
      {errorMessage ? (
        <Text accessibilityRole="alert" style={[styles.message, { color: colors.destructive }]}>
          {errorMessage}
        </Text>
      ) : null}

      <TextField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        testID="admin-email"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        autoCapitalize="none"
        autoComplete="current-password"
        secureTextEntry
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void signIn()}
        testID="admin-password"
      />
      <ActionButton
        label="Sign in"
        icon="log-in"
        onPress={() => void signIn()}
        loading={isSubmitting}
        disabled={!email.trim() || !password}
        testID="admin-sign-in"
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  introCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  iconTile: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  introText: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 18 },
  message: { fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 18 },
});
