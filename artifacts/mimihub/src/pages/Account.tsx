import { useState } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { useWishlist } from '@/contexts/WishlistContext';
import { ProductCard } from '@/components/product/ProductCard';
import { useListProducts } from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Heart, PackageSearch } from 'lucide-react';

export function Account() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get('tab') === 'orders' ? 'orders' : 'wishlist';
  const [activeTab, setActiveTab] = useState<'wishlist' | 'orders'>(initialTab);

  const { items: wishlistIds } = useWishlist();
  
  // Quick fetch all visible products to filter wishlist locally (simplification)
  const { data: allProducts, isLoading } = useListProducts({ visible: true });
  
  const wishlistProducts = allProducts?.filter(p => wishlistIds.includes(p.id)) || [];

  const [orderRef, setOrderRef] = useState('');

  const handleTrackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderRef.trim()) {
      setLocation(`/orders/${orderRef.trim()}`);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-8 text-center md:text-left">My Account</h1>

        {/* Circular tabs overlaying content */}
        <div className="relative mb-8">
          {/* The circular tabs are positioned to overlap the page content (dropped on top). */}
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
              <Heart className={`${activeTab === 'wishlist' ? 'text-[#f5ecd8]' : 'text-white' } w-5 h-5`} />
            </button>

            <button
              aria-pressed={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
              className={`rounded-full flex items-center justify-center shadow-lg transition-transform focus:outline-none`
                + ` ${activeTab === 'orders' ? 'bg-amber-400' : 'bg-white'}`}
              style={{ width: 48, height: 48, transform: 'scale(0.8)' }}
            >
              <PackageSearch className={`${activeTab === 'orders' ? 'text-[#f5ecd8]' : 'text-white'} w-5 h-5`} />
            </button>
          </div>

          {/* Provide a little top padding so content shows beneath the circular tabs */}
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
              <div className="max-w-md mx-auto py-12 px-4 bg-card border border-border rounded-2xl text-center">
                <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <PackageSearch className="w-8 h-8" />
                </div>
                <h2 className="font-serif text-2xl text-foreground mb-2">Track an Order</h2>
                <p className="text-muted-foreground mb-8 text-sm">Enter your order reference number (e.g. MH-123456) to check its status.</p>
                
                <form onSubmit={handleTrackOrder} className="flex flex-col gap-4">
                  <Input 
                    value={orderRef}
                    onChange={(e) => setOrderRef(e.target.value)}
                    placeholder="Order Reference Number"
                    className="text-center font-mono"
                    required
                  />
                  <Button type="submit" className="w-full rounded-full gap-2">
                    <Search className="w-4 h-4" /> Track Order
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
