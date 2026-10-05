import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Check, Crown, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AccountCreatePreview() {
  const [noticeVisible, setNoticeVisible] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.reset();
    setNoticeVisible(true);
  };

  return (
    <Layout hideBottomNav>
      <div className="w-full flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-primary/20 bg-card shadow-[0_24px_80px_-42px_hsl(var(--foreground)/0.28)] md:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative flex min-h-56 flex-col justify-between overflow-hidden bg-secondary/80 p-7 sm:p-10 md:min-h-[680px]">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full border border-primary/20" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-8 h-52 w-52 rounded-full border border-primary/20" />
            <div className="relative z-10">
              <div className="mb-10 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-background text-primary shadow-sm">
                <Crown className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">MimiiHub / Preview</p>
              <h1 className="max-w-sm font-serif text-4xl leading-[1.08] text-foreground sm:text-5xl">
                A little more lovely, all in one place.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
                Your home for considered beauty finds and everyday comforts, selected with care.
              </p>
            </div>
            <div className="relative z-10 mt-12 border-t border-primary/20 pt-5">
              <p className="text-sm font-medium text-foreground">Good things, thoughtfully gathered.</p>
              <p className="mt-1 text-xs text-muted-foreground">A warm welcome to the MimiiHub community.</p>
            </div>
          </aside>

          <section className="p-6 sm:p-10 md:px-12 md:py-11">
            <Link
              href="/account"
              className="mb-8 inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="link-back-account"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to account
            </Link>

            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Join MimiiHub</p>
              <h2 className="mt-2 font-serif text-3xl text-foreground">Create your account</h2>
              <p className="mt-2 text-sm text-muted-foreground">Set up your little corner of MimiiHub.</p>
            </div>

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

            <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
              <LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Your entries stay in this page and are cleared when you submit.
            </p>
            <Link href="/account" className="mt-6 flex min-h-10 items-center justify-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm" data-testid="link-return-account">
              <Check className="h-4 w-4" aria-hidden="true" />
              Return to account
            </Link>
          </section>
        </div>
      </div>
    </Layout>
  );
}
