import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { Check, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountPreviewShell } from './AccountPreviewShell';

export function AccountCreatePreview() {
  const [noticeVisible, setNoticeVisible] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.reset();
    setNoticeVisible(true);
  };

  return (
    <AccountPreviewShell
      eyebrow="Join MimiiHub"
      title="Create your account"
      description="Set up your little corner of MimiiHub."
    >
      <div
        role="status"
        data-testid="status-preview-notice"
        className="mb-6 flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-5 text-foreground"
      >
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p><strong className="font-semibold">Design preview only.</strong> No account will be created, and anything you enter will not be saved or sent.</p>
      </div>

      {noticeVisible && (
        <p
          role="status"
          data-testid="status-submit-preview"
          className="mb-5 rounded-lg bg-secondary px-4 py-3 text-sm leading-5 text-foreground"
        >
          This is a design preview. No account was created and your information was not saved.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <div className="space-y-2">
          <Label htmlFor="preview-name">Full name</Label>
          <Input id="preview-name" name="name" type="text" autoComplete="off" placeholder="e.g. Ada Okafor" data-testid="input-name" className="h-11 rounded-lg bg-background" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preview-email">Email address</Label>
          <Input id="preview-email" name="email" type="email" autoComplete="off" placeholder="you@example.com" data-testid="input-email" className="h-11 rounded-lg bg-background" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preview-password">Password</Label>
          <Input id="preview-password" name="password" type="password" autoComplete="off" placeholder="Choose a password" data-testid="input-password" className="h-11 rounded-lg bg-background" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preview-confirm-password">Confirm password</Label>
          <Input id="preview-confirm-password" name="confirmPassword" type="password" autoComplete="off" placeholder="Enter it once more" data-testid="input-confirm-password" className="h-11 rounded-lg bg-background" />
        </div>
        <Button type="submit" className="mt-2 h-12 w-full rounded-full text-sm font-semibold" data-testid="button-preview-submit">
          Preview sign-up
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/account/login" className="font-semibold text-primary underline-offset-4 hover:underline" data-testid="link-preview-login">
          Preview login
        </Link>
      </p>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
        <LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Your entries stay in this page and are cleared when you submit.
      </p>
      <Link href="/account" className="mt-6 flex min-h-10 items-center justify-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm" data-testid="link-return-account">
        <Check className="h-4 w-4" aria-hidden="true" />
        Return to account
      </Link>
    </AccountPreviewShell>
  );
}
