import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { ProductCard } from '@/components/product/ProductCard';
import { useListProducts } from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Heart, PackageSearch, Package, X,
  User, ShoppingBag, Sun, Moon, Monitor, ChevronRight,
} from 'lucide-react';
import { formatNaira } from '@/lib/utils';
import { createOrGetUser, getCurrentUser, listUserOrders, type MimiUser } from '@/lib/supabase';

// ─── theme ────────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'system';

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'dark') {
    root.classList.add('dark');
  } else if (t === 'light') {
    root.classList.remove('dark');
  } else {
    root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
}

function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('mimihub_theme') as Theme) || 'system';
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('mimihub_theme', t);
    applyTheme(t);
  };

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) =>
      document.documentElement.classList.toggle('dark', e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme };
}

// ─── types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  name: string;
  quantity: number;
  totalPrice: number;
}

interface UserOrder {
  id: number;
  orderRef: string;
  orderStatus: string;
  paymentStatus: string;
  subtotal: number;
  items: OrderItem[];
  createdAt: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'Awaiting Payment': 'bg-amber-100 text-amber-800',
  'Preparing':        'bg-blue-100 text-blue-800',
  'Shipped':          'bg-indigo-100 text-indigo-800',
  'Delivered':        'bg-green-100 text-green-800',
  'Cancelled':        'bg-red-100 text-red-800',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{status}</span>
  );
}

// ─── username modal ────────────────────────────────────────────────────────────

function UsernameModal({ onSuccess, onClose }: { onSuccess: (u: MimiUser) => void; onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      onSuccess(await createOrGetUser(trimmed));
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <div className="h-14 w-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-xl text-foreground text-center mb-1">Set a Username</h2>
        <p className="text-muted-foreground text-sm text-center mb-6">
          We will remember you on this device to track your orders.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" autoFocus required disabled={loading} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full rounded-full" disabled={loading || !username.trim()}>
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── profile view ──────────────────────────────────────────────────────────────

function ProfileView() {
  const [, setLocation] = useLocation();
  const { totalItems } = useCart();
  const { items: wishlistIds } = useWishlist();
  const { theme, setTheme } = useTheme();

  const [user, setUser] = useState<MimiUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((u) => { setUser(u); setSessionChecked(true); })
      .catch(() => setSessionChecked(true));
  }, []);

  const THEME_OPTIONS: { value: Theme; label: string; Icon: React.ElementType }[] = [
    { value: 'light',  label: 'Light',  Icon: Sun },
    { value: 'dark',   label: 'Dark',   Icon: Moon },
    { value: 'system', label: 'System', Icon: Monitor },
  ];

  if (!sessionChecked) return <LoadingSpinner size="lg" />;

  return (
    <div className="max-w-md mx-auto space-y-4">
      {showModal && (
        <UsernameModal
          onSuccess={u => { setUser(u); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Username card */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {user ? (
              <>
                <p className="font-serif text-lg text-foreground truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground">
                  Member since {new Date(user.createdAt).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">No username set</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs text-primary font-medium underline underline-offset-2 mt-0.5"
                >
                  Set a username to track orders
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Orders + Cart quick links */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setLocation('/account/orders')}
          className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/50 transition-colors group"
        >
          <Package className="w-5 h-5 text-primary mb-3" />
          <p className="text-xs text-muted-foreground">Orders</p>
          <p className="font-serif text-base text-foreground group-hover:text-primary transition-colors">View all</p>
        </button>
        <button
          onClick={() => setLocation('/cart')}
          className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/50 transition-colors group"
        >
          <ShoppingBag className="w-5 h-5 text-primary mb-3" />
          <p className="text-xs text-muted-foreground">Cart</p>
          <p className="font-serif text-base text-foreground group-hover:text-primary transition-colors">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </p>
        </button>
      </div>

      {/* Wishlist link */}
      <button
        onClick={() => setLocation('/account/wishlist')}
        className="w-full bg-card border border-border rounded-2xl p-4 hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">Wishlist</span>
            {wishlistIds.length > 0 && (
              <span className="text-xs text-muted-foreground">({wishlistIds.length})</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>

      {/* Theme toggle */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Appearance</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all ${
                theme === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── orders view ──────────────────────────────────────────────────────────────

function OrdersView() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<MimiUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [orderRef, setOrderRef] = useState('');

  useEffect(() => {
    getCurrentUser()
      .then((u) => { setUser(u); setSessionChecked(true); })
      .catch(() => setSessionChecked(true));
  }, []);

  const fetchOrders = useCallback(async (u: MimiUser) => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      setOrders(await listUserOrders(u.id));
    } catch {
      setOrdersError('Could not load orders. Please try again.');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchOrders(user); }, [user, fetchOrders]);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderRef.trim()) setLocation(`/orders/${orderRef.trim()}`);
  };

  if (!sessionChecked) return <LoadingSpinner size="lg" />;

  if (!user) {
    return (
      <>
        {showModal && (
          <UsernameModal
            onSuccess={u => { setUser(u); setShowModal(false); }}
            onClose={() => setShowModal(false)}
          />
        )}
        <div className="max-w-md mx-auto py-12 px-4 bg-card border border-border rounded-2xl text-center">
          <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <PackageSearch className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-2">Track an Order</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Enter your order reference, or set a username to see your full history.
          </p>
          <form onSubmit={handleTrack} className="flex flex-col gap-4 mb-4">
            <Input
              value={orderRef}
              onChange={e => setOrderRef(e.target.value)}
              placeholder="Order Reference (e.g. MH-000001)"
              className="text-center font-mono"
              required
            />
            <Button type="submit" className="w-full rounded-full gap-2">
              <Search className="w-4 h-4" /> Track Order
            </Button>
          </form>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-primary font-medium underline underline-offset-2"
          >
            Sign in with a username to see all orders
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Track by ref */}
      <div className="max-w-sm">
        <p className="text-xs text-muted-foreground mb-2">Track any order by reference number</p>
        <form onSubmit={handleTrack} className="flex gap-2">
          <Input
            value={orderRef}
            onChange={e => setOrderRef(e.target.value)}
            placeholder="e.g. MH-000001"
            className="font-mono text-sm"
          />
          <Button type="submit" size="sm" variant="outline" className="shrink-0">
            <Search className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {ordersError && <p className="text-sm text-red-600">{ordersError}</p>}

      {ordersLoading ? (
        <LoadingSpinner size="lg" />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title="No orders yet"
          description="Your orders will appear here once you complete a checkout."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {orders.length} order{orders.length !== 1 ? 's' : ''} for{' '}
            <span className="font-medium text-foreground">{user.username}</span>
          </p>
          {orders.map(order => (
            <button
              key={order.id}
              onClick={() => setLocation(`/orders/${order.orderRef}`)}
              className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-foreground">{order.orderRef}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StatusBadge status={order.orderStatus} />
                  <span className="text-sm font-semibold text-foreground">{formatNaira(order.subtotal)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── wishlist view ─────────────────────────────────────────────────────────────

function WishlistView() {
  const { items: wishlistIds } = useWishlist();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allProducts, isLoading } = useListProducts({ visible: true } as any);
  const wishlistProducts = allProducts?.filter(p => wishlistIds.includes(p.id)) ?? [];

  if (isLoading) return <LoadingSpinner size="lg" />;

  return wishlistProducts.length > 0 ? (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {wishlistProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  ) : (
    <EmptyState
      icon={<Heart className="w-12 h-12" />}
      title="Your wishlist is empty"
      description="Save items you love by clicking the heart icon on any product."
    />
  );
}

// ─── page exports ──────────────────────────────────────────────────────────────

export function Account() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-8 text-center md:text-left">
          My Profile
        </h1>
        <ProfileView />
      </div>
    </Layout>
  );
}

export function AccountOrders() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-8 text-center md:text-left">
          My Orders
        </h1>
        <OrdersView />
      </div>
    </Layout>
  );
}

export function AccountWishlist() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-8 text-center md:text-left">
          My Wishlist
        </h1>
        <WishlistView />
      </div>
    </Layout>
  );
}
