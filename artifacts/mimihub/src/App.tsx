import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <WishlistProvider>
          <TooltipProvider>
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
