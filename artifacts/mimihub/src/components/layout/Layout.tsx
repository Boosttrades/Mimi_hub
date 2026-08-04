import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pb-20 md:pb-0">
      <Header />
      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
