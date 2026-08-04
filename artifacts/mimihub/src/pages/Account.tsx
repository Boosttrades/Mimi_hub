import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { useWishlist } from '@/contexts/WishlistContext';
import { ProductCard } from '@/components/product/ProductCard';
import { useListProducts } from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Heart, PackageSearch, Package, X } from 'lucide-react';
import { formatNaira } from '@/lib/utils';

// ─── types ────────────────────────────────────────────────────────────────────

interface MimiUser {
  id: number;
  username: string;
  createdAt: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  totalPrice: number;
}

interface UserOrder {
  id: number;
  orderRef: string;
  fullName: string;
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
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {status}
    </span>
  );
}

// ─── username modal ────────────────────────────────────────────────────────────

interface UsernameModalProps {
  onSuccess: (user: MimiUser) => void;
  onClose: () => void;
}

function UsernameModal({ onSuccess, onClose }: UsernameModalProps) {
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
      // POST /api/users — server sets HttpOnly cookie
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      // GET /api/me to confirm session and get user id
      const meRes = await fetch('/api/me', { credentials: 'include' });
      if (!meRes.ok) {
        setError('Session could not be confirmed. Please try again.');
        return;
      }

      const user: MimiUser = await meRes.json();
      onSuccess(user);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="h-14 w-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <PackageSearch className="w-7 h-7" />
        </div>

        <h2 className="font-serif text-xl text-foreground text-center mb-1">View Your Orders</h2>
        <p className="text-muted-foreground text-sm text-center mb-6">
          Enter a username to see your order history. We will remember you on this device.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            autoFocus
            required
            disabled={loading}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full rounded-full" disabled={loading || !username.trim()}>
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── orders list ──────────────────────────────────────────────────────────────

interface OrdersListProps {
  user: MimiUser;
  onTrackRef: (ref: string) => void;
}

function OrdersList({ user, onTrackRef }: OrdersListProps) {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderRef, setOrderRef] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${user.id}/orders`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load orders');
      const data: UserOrder[] = await res.json();
      setOrders(data);
    } catch {
      setError('Could not load your orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderRef.trim()) onTrackRef(orderRef.trim());
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      {/* Track by ref */}
      <div className="max-w-sm">
        <p className="text-xs text-muted-foreground mb-2">Track any order by reference number</p>
        <form onSubmit={handleTrack} className="flex gap-2">
          <Input
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="e.g. MH-000001"
            className="font-mono text-sm"
          />
          <Button type="submit" size="sm" variant="outline" className="shrink-0">
            <Search className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {orders.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title="No orders yet"
          description="Your orders will appear here once you complete a checkout."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {orders.length} order{orders.length !== 1 ? 's' : ''} for <span className="font-medium text-foreground">{user.username}</span>
          </p>
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => onTrackRef(order.orderRef)}
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
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StatusBadge status={order.orderStatus} />
                  <span className="text-sm font-semibold text-foreground">
                    {formatNaira(order.subtotal)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export function Account() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get('tab') === 'orders' ? 'orders' : 'wishlist';
  const [activeTab, setActiveTab] = useState<'wishlist' | 'orders'>(initialTab);

  const { items: wishlistIds } = useWishlist();
  const { data: allProducts, isLoading } = useListProducts({ visible: true });
  const wishlistProducts = allProducts?.filter(p => wishlistIds.includes(p.id)) ?? [];

  // session state
  const [user, setUser] = useState<MimiUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((u: MimiUser | null) => { setUser(u); setSessionChecked(true); })
      .catch(() => setSessionChecked(true));
  }, []);

  const handleOrdersTabClick = () => {
    setActiveTab('orders');
    if (!user) setShowModal(true);
  };

  const handleModalSuccess = (u: MimiUser) => {
    setUser(u);
    setShowModal(false);
  };

  const handleTrackRef = (ref: string) => {
    setLocation(`/orders/${ref}`);
  };

  return (
    <Layout>
      {showModal && (
        <UsernameModal
          onSuccess={handleModalSuccess}
          onClose={() => { setShowModal(false); setActiveTab('wishlist'); }}
        />
      )}

      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-8 text-center md:text-left">My Account</h1>

        <div className="relative mb-8">
          <div
            className="absolute left-4 md:left-8 top-0 z-20 flex items-center gap-6"
            style={{ transform: 'translateY(-30%)' }}
          >
            <button
              aria-pressed={activeTab === 'wishlist'}
              onClick={() => setActiveTab('wishlist')}
              className={`rounded-full flex items-center justify-center shadow-lg transition-transform focus:outline-none`
                + ` ${activeTab === 'wishlist' ? 'bg-amber-400' : 'bg-white'}`}
              style={{ width: 48, height: 48, transform: 'scale(0.8)' }}
            >
              <Heart className={`${activeTab === 'wishlist' ? 'text-[#f5ecd8]' : 'text-white'} w-5 h-5`} />
            </button>

            <button
              aria-pressed={activeTab === 'orders'}
              onClick={handleOrdersTabClick}
              className={`rounded-full flex items-center justify-center shadow-lg transition-transform focus:outline-none`
                + ` ${activeTab === 'orders' ? 'bg-amber-400' : 'bg-white'}`}
              style={{ width: 48, height: 48, transform: 'scale(0.8)' }}
            >
              <PackageSearch className={`${activeTab === 'orders' ? 'text-[#f5ecd8]' : 'text-white'} w-5 h-5`} />
            </button>
          </div>

          <div className="pt-8">
            {activeTab === 'wishlist' && (
              <div>
                {isLoading ? (
                  <LoadingSpinner size="lg" />
                ) : wishlistProducts.length > 0 ? (
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
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                {!sessionChecked ? (
                  <LoadingSpinner size="lg" />
                ) : user ? (
                  <OrdersList user={user} onTrackRef={handleTrackRef} />
                ) : (
                  /* No session yet — show fallback track-by-ref until modal completes */
                  <div className="max-w-md mx-auto py-12 px-4 bg-card border border-border rounded-2xl text-center">
                    <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                      <PackageSearch className="w-8 h-8" />
                    </div>
                    <h2 className="font-serif text-2xl text-foreground mb-2">Track an Order</h2>
                    <p className="text-muted-foreground mb-8 text-sm">
                      Enter your order reference number (e.g. MH-123456) to check its status.
                    </p>
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleTrackRef((e.currentTarget.elements.namedItem('ref') as HTMLInputElement).value.trim()); }}
                      className="flex flex-col gap-4"
                    >
                      <Input name="ref" placeholder="Order Reference Number" className="text-center font-mono" required />
                      <Button type="submit" className="w-full rounded-full gap-2">
                        <Search className="w-4 h-4" /> Track Order
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
