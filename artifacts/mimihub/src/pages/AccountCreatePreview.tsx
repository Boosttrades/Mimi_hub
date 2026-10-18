import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { Check, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountPreviewShell } from './AccountPreviewShell';
import { resendVerificationEmail, signUpAccount } from '@/lib/supabase';

export function AccountCreatePreview() {
  const [, setLocation] = useLocation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (password !== confirmPassword) {
      setError('Those passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await signUpAccount({ fullName, phone: phone.trim() ? `+234${phone.trim()}` : undefined, email: email.trim(), password });
      if (result.authenticated) {
        setLocation('/account');
      } else if (result.requiresEmailVerification) {
        setVerificationEmail(email.trim());
        setNotice('Check your inbox for a verification email from Supabase. After verifying, return here and sign in.');
      } else {
        setNotice('Your account is ready. You can sign in now.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await resendVerificationEmail(verificationEmail);
      setNotice('If this email needs verification, Supabase has sent a new message.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not resend the verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountPreviewShell
      eyebrow="Join MimiiHub"
      title="Create your account"
      description="Create your account with your email and password."
    >
      <div
        role="note"
        data-testid="status-signup-security"
        className="mb-6 flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-5 text-foreground"
      >
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p>Your account is stored in Supabase Auth. New accounts start with the <strong className="font-semibold">customer</strong> role.</p>
      </div>

      {error && <p role="alert" className="mb-5 rounded-lg bg-destructive/10 px-4 py-3 text-sm leading-5 text-destructive">{error}</p>}
      {notice && (
        <p
          role="status"
          data-testid="status-signup"
          className="mb-5 rounded-lg bg-secondary px-4 py-3 text-sm leading-5 text-foreground"
        >
          {notice}
        </p>
      )}

      {verificationEmail && (
        <Button type="button" variant="outline" className="mb-5 w-full rounded-full" onClick={handleResend} disabled={loading}>
          Resend verification email
        </Button>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        <div className="space-y-2">
            <Label htmlFor="signup-otp">SMS verification code</Label>
            <Input id="signup-otp" name="otp" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter the code sent to your phone" value={otp} onChange={(event) => setOtp(event.target.value)} required disabled={loading} data-testid="input-phone-otp" className="h-11 rounded-lg bg-background" />
          </div>
          <Button type="submit" disabled={loading} className="h-12 w-full rounded-full text-sm font-semibold">
            {loading ? 'Verifying...' : 'Verify phone number'}
          </Button>
        </form>
      ) : <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        <div className="space-y-2">
          <Label htmlFor="preview-name">Full name</Label>
          <Input id="preview-name" name="name" type="text" autoComplete="name" placeholder="e.g. Ada Okafor" value={fullName} onChange={(event) => setFullName(event.target.value)} required disabled={loading} data-testid="input-name" className="h-11 rounded-lg bg-background" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preview-phone">Phone number <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <div className="flex gap-2">
            <span className="flex h-11 items-center rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground">+234</span>
            <Input id="preview-phone" name="phone" type="tel" autoComplete="tel-national" inputMode="numeric" placeholder="8012345678" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 10))} disabled={loading} data-testid="input-phone" className="h-11 rounded-lg bg-background" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preview-email">Email address</Label>
          <Input id="preview-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} data-testid="input-email" className="h-11 rounded-lg bg-background" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preview-password">Password</Label>
          <Input id="preview-password" name="password" type="password" autoComplete="new-password" placeholder="Choose a password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={loading} data-testid="input-password" className="h-11 rounded-lg bg-background" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preview-confirm-password">Confirm password</Label>
          <Input id="preview-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Enter it once more" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={loading} data-testid="input-confirm-password" className="h-11 rounded-lg bg-background" />
        </div>
        <Button type="submit" disabled={loading} className="mt-2 h-12 w-full rounded-full text-sm font-semibold" data-testid="button-preview-submit">
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/account/login" className="font-semibold text-primary underline-offset-4 hover:underline" data-testid="link-preview-login">
          Sign in
        </Link>
      </p>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
        <LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Supabase manages your password and email verification. MimiiHub does not store your password.
      </p>
      <Link href="/account" className="mt-6 flex min-h-10 items-center justify-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm" data-testid="link-return-account">
        <Check className="h-4 w-4" aria-hidden="true" />
        Return to account
      </Link>
    </AccountPreviewShell>
  );
}
