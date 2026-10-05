import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Crown } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';

interface AccountPreviewShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AccountPreviewShell({
  eyebrow,
  title,
  description,
  children,
}: AccountPreviewShellProps) {
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
              <h2 className="mt-2 font-serif text-3xl text-foreground">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>

            {children}
          </section>
        </div>
      </div>
    </Layout>
  );
}
