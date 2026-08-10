import { Link } from 'wouter';
import { Menu, Search, ShoppingBag, Crown, LayoutDashboard } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { useScrollVisibility } from '@/hooks/useScrollVisibility';

export function Header() {
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isVisible = useScrollVisibility();

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-primary/20 bg-background/95 backdrop-blur transition-transform duration-300 ease-out supports-[backdrop-filter]:bg-background/80 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <button className="p-2 -ml-2 text-foreground hover:text-primary transition-colors" data-testid="button-menu">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] border-r-primary/20 bg-background">
            <SheetHeader>
              <SheetTitle className="text-left font-serif text-2xl tracking-widest text-primary flex items-center gap-2">
                <Crown className="h-6 w-6" /> MIMIHUB
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-8 flex flex-col gap-4">
              <Link href="/" onClick={() => setIsMenuOpen(false)}>
                <span className="block px-2 py-3 text-lg hover:text-primary hover:bg-primary/5 rounded-md transition-colors cursor-pointer">
                  Home
                </span>
              </Link>
              <Link href="/categories" onClick={() => setIsMenuOpen(false)}>
                <span className="block px-2 py-3 text-lg hover:text-primary hover:bg-primary/5 rounded-md transition-colors cursor-pointer">
                  Shop Categories
                </span>
              </Link>
              <Link href="/account" onClick={() => setIsMenuOpen(false)}>
                <span className="block px-2 py-3 text-lg hover:text-primary hover:bg-primary/5 rounded-md transition-colors cursor-pointer">
                  My Account
                </span>
              </Link>
              <Link href="/orders/lookup" onClick={() => setIsMenuOpen(false)}>
                <span className="block px-2 py-3 text-lg hover:text-primary hover:bg-primary/5 rounded-md transition-colors cursor-pointer">
                  Track Order
                </span>
              </Link>
              <div className="my-2 border-t border-primary/10" />
              <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                <span className="flex items-center gap-3 rounded-md px-2 py-3 text-lg font-medium text-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <LayoutDashboard className="h-5 w-5" />
                  Admin Panel
                </span>
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/">
          <div className="flex flex-col items-center justify-center cursor-pointer group" data-testid="link-home-logo">
            <Crown className="h-6 w-6 text-primary mb-0.5 group-hover:scale-110 transition-transform" />
            <span className="font-serif font-bold text-xl tracking-[0.15em] text-foreground group-hover:text-primary transition-colors">
              MIMIHUB
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/search">
            <button className="p-2 text-foreground hover:text-primary transition-colors" data-testid="button-search">
              <Search className="h-6 w-6" />
            </button>
          </Link>
          <Link href="/cart">
            <button className="p-2 -mr-2 relative text-foreground hover:text-primary transition-colors" data-testid="button-cart">
              <ShoppingBag className="h-6 w-6" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
