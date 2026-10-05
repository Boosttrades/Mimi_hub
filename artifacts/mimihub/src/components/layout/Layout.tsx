import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  hideBottomNav?: boolean;
}

export function Layout({ children, hideBottomNav = false }: LayoutProps) {
  return (
    <div className={`min-h-[100dvh] flex flex-col bg-background text-foreground ${hideBottomNav ? '' : 'pb-20 md:pb-0'}`}>
      <Header />
      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto">
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
