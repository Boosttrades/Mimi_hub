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

const ADMIN_ACCESS_TIMEOUT_MS = 15_000;

type AccessState = 'checking' | 'allowed' | 'denied' | 'error';

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<AccessState>('checking');
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<number | null>(null);
  const [accessAttempt, setAccessAttempt] = useState(0);

  const adminCheck = useGetAdminSummary({
    query: {
      queryKey: getGetAdminSummaryQueryKey(),
      enabled: authReady && Boolean(session) && accessState === 'allowed',
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
        setAccessState('checking');
        setAccessError(null);
        setAccessStatus(null);
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

  useEffect(() => {
    if (!authReady || !session) {
      if (authReady) setAccessState('checking');
      return;
    }

    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), ADMIN_ACCESS_TIMEOUT_MS);

    setAccessState('checking');
    setAccessError(null);
    setAccessStatus(null);

    const verifyAccess = async () => {
      try {
        const apiDomain = process.env.EXPO_PUBLIC_DOMAIN;
        if (!apiDomain) throw new Error('The admin API address is not configured.');

        const response = await fetch(`https://${apiDomain}/api/admin/access`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        if (!active) return;
        if (response.ok) {
          setAccessState('allowed');
          return;
        }

        const payload = await response.json().catch(() => null) as {
          error?: { message?: string };
        } | null;
        setAccessStatus(response.status);
        setAccessError(payload?.error?.message || `The server could not verify admin access (HTTP ${response.status}).`);
        setAccessState(response.status === 403 ? 'denied' : 'error');
      } catch (error) {
        if (!active) return;
        const timedOut = controller.signal.aborted;
        setAccessError(timedOut
          ? 'The admin server took too long to respond. It may be waking up after inactivity. Please try again.'
          : getErrorMessage(error));
        setAccessState('error');
      }
    };

    void verifyAccess();

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [authReady, session, accessAttempt]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const retryAccess = () => {
    setAccessState('checking');
    setAccessAttempt((attempt) => attempt + 1);
  };

  if (!authReady) {
    return <Page title="Checking sign in"><LoadingState label="Restoring your secure session…" /></Page>;
  }

  if (!session) {
    return <AdminSignInScreen notice={restoreError} />;
  }

  if (accessState === 'checking') {
    return <Page title="Checking admin access"><LoadingState label="Verifying your Supabase role…" /></Page>;
  }

  if (accessState === 'denied' || accessStatus === 403) {
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
          onPress={retryAccess}
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

  if (accessState === 'error') {
    return (
      <Page title="Could not verify access">
        <ErrorState message={accessError || 'The admin server could not verify this account.'} onRetry={retryAccess} />
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

  if (adminCheck.isPending) {
    return <Page title="Loading admin dashboard"><LoadingState label="Loading your store data…" /></Page>;
  }

  if (adminCheck.isError) {
    const status = typeof adminCheck.error === 'object' && adminCheck.error !== null && 'status' in adminCheck.error
      ? (adminCheck.error as { status?: unknown }).status
      : null;

    if (status === 401 || status === 403) {
      return (
        <Page title="Admin session needs attention">
          <ErrorState
            message={status === 403
              ? 'This account no longer has the admin role.'
              : 'Your saved session has expired. Please sign in again.'}
            onRetry={status === 403 ? () => void adminCheck.refetch() : undefined}
          />
          <ActionButton label="Sign out" icon="log-out" onPress={() => void signOut()} testID="admin-summary-sign-out" />
        </Page>
      );
    }

    return (
      <Page title="Could not load dashboard">
        <ErrorState message={getErrorMessage(adminCheck.error)} onRetry={() => void adminCheck.refetch()} />
        <ActionButton label="Sign out" icon="log-out" variant="quiet" onPress={() => void signOut()} testID="admin-summary-error-sign-out" />
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
