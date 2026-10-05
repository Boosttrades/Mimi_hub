import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountPreviewShell } from './AccountPreviewShell';

export function AccountLoginPreview() {
  const [notice, setNotice] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.reset();
    setNotice('Preview only. No one was signed in and your information was not saved.');
  };

  return (
    <AccountPreviewShell
      eyebrow="Welcome back"
      title="Sign in to MimiiHub"
      description="Pick up where you left off."
    >
      <div
        role="status"
        data-testid="status-login-preview-notice"
        className="mb-6 flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-5 text-foreground"
      >
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p><strong className="font-semibold">Design preview only.</strong> Sign-in is not connected. Anything you enter will not be saved or sent.</p>
      </div>

      {notice && (
        <p
          role="status"
          data-testid="status-login-preview-submit"
          className="mb-5 rounded-lg bg-secondary px-4 py-3 text-sm leading-5 text-foreground"
        >
          {notice}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <div className="space-y-2">
          <Label htmlFor="preview-login-email">Email address</Label>
          <Input
            id="preview-login-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="you@example.com"
            data-testid="input-login-email"
            className="h-11 rounded-lg bg-background"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="preview-login-password">Password</Label>
            <button
              type="button"
              onClick={() => setNotice('Password reset is not included in this preview. No email was sent.')}
              className="text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              data-testid="button-preview-forgot-password"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="preview-login-password"
            name="password"
            type="password"
            autoComplete="off"
            placeholder="Enter your password"
            data-testid="input-login-password"
            className="h-11 rounded-lg bg-background"
          />
        </div>
        <Button type="submit" className="mt-2 h-12 w-full rounded-full text-sm font-semibold" data-testid="button-preview-login">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Preview sign-in
        </Button>
      </form>

      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
        <LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Your entries stay in this page and are cleared when you submit.
      </p>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        New to MimiiHub?{' '}
        <Link href="/account/create" className="font-semibold text-primary underline-offset-4 hover:underline" data-testid="link-preview-signup">
          Preview sign-up
        </Link>
      </p>
      <Link
        href="/account"
        className="mt-6 flex min-h-10 items-center justify-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        data-testid="link-return-account"
      >
        Return to account
      </Link>
    </AccountPreviewShell>
  );
}
