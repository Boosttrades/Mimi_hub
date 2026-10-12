import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccountPreviewShell } from './AccountPreviewShell';
import { acceptSupabaseRedirectSession, verifyEmailTokenHash } from '@/lib/supabase';

type VerificationState =
  | { status: 'working' }
  | { status: 'signed-in' }
  | { status: 'verified' }
  | { status: 'error'; message: string };

export function AccountVerify() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<VerificationState>({ status: 'working' });

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const currentUrl = new URL(window.location.href);
      const fragment = new URLSearchParams(currentUrl.hash.replace(/^#/, ''));
      const query = currentUrl.searchParams;
      const providerError =
        fragment.get('error_description') ||
        query.get('error_description') ||
        query.get('error');
      const accessToken = fragment.get('access_token');
      const refreshToken = fragment.get('refresh_token');
      const tokenHash = query.get('token_hash');

      // Remove one-time auth material from the address bar before exchanging it.
      window.history.replaceState({}, document.title, currentUrl.pathname);

      if (providerError) {
        if (!cancelled) setState({ status: 'error', message: providerError });
        return;
      }

      try {
        if (accessToken && refreshToken) {
          await acceptSupabaseRedirectSession(accessToken, refreshToken);
          if (!cancelled) setState({ status: 'signed-in' });
          return;
        }
        if (tokenHash) {
          const user = await verifyEmailTokenHash(tokenHash);
          if (!cancelled) setState(user ? { status: 'signed-in' } : { status: 'verified' });
          return;
        }
        if (!cancelled) {
          setState({
            status: 'error',
            message: 'This verification link is incomplete or has already expired. Request a new email and try again.',
          });
        }
      } catch (reason) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: reason instanceof Error ? reason.message : 'Email verification could not be completed.',
          });
        }
      }
    };

    void verify();
    return () => { cancelled = true; };
  }, []);

  const signedIn = state.status === 'signed-in';
  const verified = state.status === 'verified';
  const heading =
    signedIn ? 'Your email is verified' :
    verified ? 'Email verified' :
    state.status === 'error' ? 'Verification needs attention' :
    'Verifying your email';

  return (
    <AccountPreviewShell
      eyebrow="MimiiHub / Account"
      title={heading}
      description="Supabase securely confirms your email before your account is activated."
    >
      <div className="mb-6 flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-5 text-foreground">
        {state.status === 'working'
          ? <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
          : signedIn || verified
            ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            : <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
        <p role={state.status === 'error' ? 'alert' : 'status'}>
          {state.status === 'working' ? 'Please wait while Supabase confirms your account.' :
            state.status === 'error' ? state.message :
            signedIn ? 'Your account is active. Your cart, wishlist, and orders can now sync to your Supabase profile.' :
            'Your email has been confirmed. Sign in to start using your account.'}
        </p>
      </div>
      {signedIn ? (
        <Button type="button" onClick={() => setLocation('/account')} className="h-12 w-full rounded-full" data-testid="button-verified-account">
          Continue to account
        </Button>
      ) : verified ? (
        <Link href="/account/login" className="flex h-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" data-testid="link-verified-signin">
          Sign in
        </Link>
      ) : state.status === 'error' ? (
        <Link href="/account/create" className="flex h-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" data-testid="link-restart-signup">
          Return to sign-up
        </Link>
      ) : null}
    </AccountPreviewShell>
  );
}
