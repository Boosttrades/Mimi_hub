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

        <div className="flex border-b border-border mb-8 overflow-x-auto hide-scrollbar">
          <button
            className={`px-6 py-3 font-medium text-sm md:text-base border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'wishlist' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('wishlist')}
          >
            My Wishlist ({wishlistIds.length})
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm md:text-base border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'orders' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('orders')}
          >
            Track Orders
          </button>
        </div>

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
    </Layout>
  );
}
