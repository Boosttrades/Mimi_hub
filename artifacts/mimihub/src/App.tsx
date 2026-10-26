import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import {
  getAccountStorageKey,
  readStored,
  removeStored,
  writeStored,
} from '@/lib/localData';
import { getCurrentUser, getUserData, syncUserData, type MimiAccountData, type MimiUser } from '@/lib/supabase';
import type { CartItem } from '@/contexts/CartContext';
import { toast } from 'sonner';

import { Home } from '@/pages/Home';
import { Categories } from '@/pages/Categories';
import { Category } from '@/pages/Category';
import { Product } from '@/pages/Product';
import { Cart } from '@/pages/Cart';
import { Checkout } from '@/pages/Checkout';
import { OrderTracking } from '@/pages/Orders';
import { Account, AccountOrders, AccountWishlist } from '@/pages/Account';
import { AccountCreatePreview } from '@/pages/AccountCreatePreview';
import { AccountLoginPreview } from '@/pages/AccountLoginPreview';
import { Search } from '@/pages/Search';
import { AccountVerify } from '@/pages/AccountVerify';

const queryClient = new QueryClient();

function GlobalThemeSync() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const saved = localStorage.getItem('mimihub_theme');
      const isDark = saved === 'dark' || (saved !== 'light' && media.matches);
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    window.addEventListener('storage', applyTheme);
    window.addEventListener('mimihub:theme-changed', applyTheme);

    return () => {
      media.removeEventListener('change', applyTheme);
      window.removeEventListener('storage', applyTheme);
      window.removeEventListener('mimihub:theme-changed', applyTheme);
    };
  }, []);

  return null;
}

function Router() {
  return (
    <Switch>
      {/* Customer Routes */}
      <Route path="/" component={Home} />
      <Route path="/categories" component={Categories} />
      <Route path="/category/:slug" component={Category} />
      <Route path="/category/:slug/:subSlug" component={Category} />
      <Route path="/product/:id" component={Product} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/orders/:ref" component={OrderTracking} />
      <Route path="/account/create" component={AccountCreatePreview} />
      <Route path="/account/login" component={AccountLoginPreview} />
      <Route path="/account/verify" component={AccountVerify} />
      <Route path="/account" component={Account} />
      <Route path="/account/orders" component={AccountOrders} />
      <Route path="/account/wishlist" component={AccountWishlist} />
      <Route path="/search" component={Search} />

      <Route component={NotFound} />
    </Switch>
  );
}

function AccountDataSync() {
  const cart = useCart();
  const wishlist = useWishlist();
  const [user, setUser] = useState<MimiUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [pendingMerge, setPendingMerge] = useState<{
    user: MimiUser;
    cart: CartItem[];
    wishlist: number[];
    checkout: Record<string, string>;
  } | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const applyAccountData = (
    currentUser: MimiUser,
    accountData: MimiAccountData,
    clearGuestData: boolean,
  ) => {
    cart.switchToAccount(String(currentUser.id), false, accountData.cart);
    wishlist.switchToAccount(String(currentUser.id), false, accountData.wishlist);
    writeStored(getAccountStorageKey('checkout', String(currentUser.id)), accountData.checkout);
    if (clearGuestData) {
      removeStored('mimihub_checkout');
      removeStored('mimihub_cart');
      removeStored('mimihub_wishlist');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const hydrateAccountData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        if (!cancelled) {
          cart.switchToGuest();
          wishlist.switchToGuest();
          setUser(null);
          setHydrated(false);
          setSyncEnabled(false);
          setPendingMerge(null);
        }
        return;
      }

      const guestCart = readStored<CartItem[]>('mimihub_cart', []);
      const guestWishlist = readStored<number[]>('mimihub_wishlist', []);
      const guestCheckout = readStored<Record<string, string>>('mimihub_checkout', {});
      const accountCheckout = readStored<Record<string, string>>(
        getAccountStorageKey('checkout', String(currentUser.id)),
        {},
      );

      setUser(currentUser);
      if (guestCart.length > 0 || guestWishlist.length > 0 || Object.keys(guestCheckout).length > 0) {
        if (!cancelled) {
          setHydrated(false);
          setSyncEnabled(false);
          setPendingMerge({
            user: currentUser,
            cart: guestCart,
            wishlist: guestWishlist,
            checkout: { ...accountCheckout, ...guestCheckout },
          });
        }
        return;
      }

      try {
        const stored = await getUserData();
        if (cancelled) return;

        applyAccountData(currentUser, stored, false);
        setHydrated(true);
        setSyncEnabled(true);
      } catch {
        // Keep guest browsing and checkout available if account data is unavailable.
      }
    };

    const handleSessionChange = () => {
      void hydrateAccountData();
    };

    void hydrateAccountData();
    window.addEventListener('mimihub:user-session-changed', handleSessionChange);
    return () => {
      cancelled = true;
      window.removeEventListener('mimihub:user-session-changed', handleSessionChange);
    };
  }, []);

  const handleMerge = async () => {
    if (!pendingMerge) return;
    setIsMerging(true);
    try {
      const merged = await syncUserData({
        cart: pendingMerge.cart,
        wishlist: pendingMerge.wishlist,
        checkout: pendingMerge.checkout,
      });
      applyAccountData(pendingMerge.user, merged, true);
      setUser(pendingMerge.user);
      setPendingMerge(null);
      setHydrated(true);
      setSyncEnabled(true);
      toast.success('Your MimiiHub data is now linked to your account.');
    } catch {
      toast.error('We could not merge your data. Nothing was moved.');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDecline = () => {
    if (isMerging) return;
    setPendingMerge(null);
    setHydrated(false);
    setSyncEnabled(false);
  };

  useEffect(() => {
    if (!user || !hydrated || !syncEnabled) return;
    const timer = window.setTimeout(() => {
      void syncUserData(
        {
          cart: cart.items,
          wishlist: wishlist.items,
          checkout: readStored<Record<string, string>>(
            getAccountStorageKey('checkout', String(user.id)),
            {},
          ),
        },
        'replace',
      ).catch(() => {
        // A later mutation or the next session hydration will retry the sync.
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [cart.items, wishlist.items, hydrated, syncEnabled, user]);

  useEffect(() => {
    const handleCheckoutChange = () => {
      if (!user || !hydrated || !syncEnabled) return;
      void syncUserData(
        {
          cart: cart.items,
          wishlist: wishlist.items,
          checkout: readStored<Record<string, string>>(
            getAccountStorageKey('checkout', String(user.id)),
            {},
          ),
        },
        'replace',
      ).catch(() => undefined);
    };

    window.addEventListener('mimihub:checkout-changed', handleCheckoutChange);
    return () => window.removeEventListener('mimihub:checkout-changed', handleCheckoutChange);
  }, [cart.items, hydrated, syncEnabled, user, wishlist.items]);

  return (
    <Dialog
      open={pendingMerge !== null}
      onOpenChange={(open) => {
        if (!open) handleDecline();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keep your MimiiHub data?</DialogTitle>
          <DialogDescription>
            Your guest cart, wishlist, and checkout details are currently saved only on this device.
            Merge them into your account so they are available across sessions. You can continue
            without merging.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleDecline} disabled={isMerging}>
            Not now
          </Button>
          <Button type="button" onClick={handleMerge} disabled={isMerging}>
            {isMerging ? 'Merging...' : 'Merge data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalThemeSync />
      <CartProvider>
        <WishlistProvider>
          <TooltipProvider>
            <AccountDataSync />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </WishlistProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
