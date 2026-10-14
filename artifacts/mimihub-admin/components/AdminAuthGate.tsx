import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform, Text, View, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import {
  getGetAdminSummaryQueryKey,
  useGetAdminSummary,
} from '@workspace/api-client-react';
import { ActionButton, Card, ErrorState, LoadingState, Page } from '@/components/AdminUI';
import { useColors } from '@/hooks/useColors';
import AdminSignInScreen from '@/screens/AdminSignInScreen';
import { getErrorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';

function getHttpStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const adminCheck = useGetAdminSummary({
    query: {
      queryKey: getGetAdminSummaryQueryKey(),
      enabled: authReady && Boolean(session),
      retry: false,
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });

  useEffect(() => {
    let mounted = true;
    let authEventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEventReceived = true;
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        queryClient.clear();
      }
      setSession(nextSession);
      setAuthReady(true);
      setRestoreError(null);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted || authEventReceived) return;
      setSession(data.session);
      setRestoreError(error?.message ?? null);
      setAuthReady(true);
    }).catch((error: unknown) => {
      if (!mounted || authEventReceived) return;
      setSession(null);
      setRestoreError(getErrorMessage(error));
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void supabase.auth.startAutoRefresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    });
    if (AppState.currentState === 'active') {
      void supabase.auth.startAutoRefresh();
    }
    return () => {
      subscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (!authReady) {
    return <Page title="Checking sign in"><LoadingState label="Restoring your secure session…" /></Page>;
  }

  if (!session) {
    return <AdminSignInScreen notice={restoreError} />;
  }

  if (adminCheck.isPending) {
    return <Page title="Checking admin access"><LoadingState label="Verifying your Supabase role…" /></Page>;
  }

  if (adminCheck.isError) {
    const status = getHttpStatus(adminCheck.error);
    if (status === 403) {
      return (
        <Page title="Admin access required" subtitle="This signed-in account does not have permission to manage the store yet.">
          <Card style={styles.messageCard}>
            <Text style={[styles.messageTitle, { color: colors.foreground }]}>Your account needs the admin role</Text>
            <Text style={[styles.messageBody, { color: colors.mutedForeground }]}>
              In Supabase, set this account's role in public.users to admin, then tap “Check access again.”
            </Text>
          </Card>
          <ActionButton
            label="Check access again"
            icon="refresh-cw"
            variant="secondary"
            onPress={() => void adminCheck.refetch()}
            testID="admin-check-access"
          />
          <ActionButton
            label="Sign out"
            icon="log-out"
            variant="quiet"
            onPress={() => void signOut()}
            testID="admin-denied-sign-out"
          />
        </Page>
      );
    }

    if (status === 401) {
      return (
        <Page title="Sign in again" subtitle="The saved session could not access the admin API.">
          <Card style={styles.messageCard}>
            <Text style={[styles.messageBody, { color: colors.mutedForeground }]}>
              Sign out, then sign in again with a verified administrator account.
            </Text>
          </Card>
          <ActionButton
            label="Sign out"
            icon="log-out"
            onPress={() => void signOut()}
            testID="admin-expired-sign-out"
          />
        </Page>
      );
    }

    return (
      <Page title="Could not verify access">
        <ErrorState
          message={getErrorMessage(adminCheck.error)}
          onRetry={() => void adminCheck.refetch()}
        />
        <ActionButton
          label="Sign out"
          icon="log-out"
          variant="quiet"
          onPress={() => void signOut()}
          testID="admin-error-sign-out"
        />
      </Page>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  messageCard: { gap: 8 },
  messageTitle: { fontFamily: 'Manrope_700Bold', fontSize: 14 },
  messageBody: { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 18 },
});
