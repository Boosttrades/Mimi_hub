import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
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
import { getCurrentUser, syncUserData, type MimiUser } from '@/lib/supabase';
import type { CartItem } from '@/contexts/CartContext';

import { Home } from '@/pages/Home';
import { Categories } from '@/pages/Categories';
import { Category } from '@/pages/Category';
import { Product } from '@/pages/Product';
import { Cart } from '@/pages/Cart';
import { Checkout } from '@/pages/Checkout';
import { OrderTracking } from '@/pages/Orders';
import { Account, AccountOrders, AccountWishlist } from '@/pages/Account';
import { Search } from '@/pages/Search';

import { Dashboard } from '@/pages/admin/Dashboard';
import { AdminProducts } from '@/pages/admin/Products';
import { AdminProductForm } from '@/pages/admin/ProductForm';
import { AdminCategories } from '@/pages/admin/Categories';
import { AdminOrders } from '@/pages/admin/OrdersAdmin';
import { AdminHomepage } from '@/pages/admin/Homepage';
import { AdminSettings } from '@/pages/admin/Settings';
import { AdminCustomers } from '@/pages/admin/Customers';

const queryClient = new QueryClient();

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
      <Route path="/account" component={Account} />
      <Route path="/account/orders" component={AccountOrders} />
      <Route path="/account/wishlist" component={AccountWishlist} />
      <Route path="/search" component={Search} />

      {/* Admin Routes */}
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/products/new" component={AdminProductForm} />
      <Route path="/admin/products/:id/edit" component={AdminProductForm} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/homepage" component={AdminHomepage} />
      <Route path="/admin/settings" component={AdminSettings} />

      <Route component={NotFound} />
    </Switch>
  );
}

function AccountDataSync() {
  const cart = useCart();
  const wishlist = useWishlist();
  const [user, setUser] = useState<MimiUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateAccountData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        if (!cancelled) {
          setUser(null);
          setHydrated(false);
        }
        return;
      }

      const guestCart = readStored<CartItem[]>('mimihub_cart', []);
      const guestWishlist = readStored<number[]>('mimihub_wishlist', []);
      const guestCheckout = readStored<Record<string, string>>('mimihub_checkout', {});
      const accountCheckout = readStored<Record<string, string>>(
        getAccountStorageKey('checkout', currentUser.username),
        {},
      );

      try {
        const merged = await syncUserData({
          cart: guestCart,
          wishlist: guestWishlist,
          checkout: { ...accountCheckout, ...guestCheckout },
        });
        if (cancelled) return;

        cart.switchToAccount(currentUser.username, false, merged.cart);
        wishlist.switchToAccount(currentUser.username, false, merged.wishlist);
        writeStored(getAccountStorageKey('checkout', currentUser.username), merged.checkout);
        removeStored('mimihub_checkout');
        removeStored('mimihub_cart');
        removeStored('mimihub_wishlist');
        setUser(currentUser);
        setHydrated(true);
      } catch {
        // Keep guest browsing and checkout available if account sync is temporarily unavailable.
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

  useEffect(() => {
    if (!user || !hydrated) return;
    const timer = window.setTimeout(() => {
      void syncUserData(
        {
          cart: cart.items,
          wishlist: wishlist.items,
          checkout: readStored<Record<string, string>>(
            getAccountStorageKey('checkout', user.username),
            {},
          ),
        },
        'replace',
      ).catch(() => {
        // A later mutation or the next session hydration will retry the sync.
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [cart.items, wishlist.items, hydrated, user]);

  useEffect(() => {
    const handleCheckoutChange = () => {
      if (!user || !hydrated) return;
      void syncUserData(
        {
          cart: cart.items,
          wishlist: wishlist.items,
          checkout: readStored<Record<string, string>>(
            getAccountStorageKey('checkout', user.username),
            {},
          ),
        },
        'replace',
      ).catch(() => undefined);
    };

    window.addEventListener('mimihub:checkout-changed', handleCheckoutChange);
    return () => window.removeEventListener('mimihub:checkout-changed', handleCheckoutChange);
  }, [cart.items, hydrated, user, wishlist.items]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
