import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/product/ProductCard';
import { Input } from '@/components/ui/input';
import { useListProducts } from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Search as SearchIcon } from 'lucide-react';
import { useLocation } from 'wouter';

export function Search() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query) {
        setLocation(`/search?q=${encodeURIComponent(query)}`);
      } else {
        setLocation('/search');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query, setLocation]);

  const { data: products, isLoading } = useListProducts(
    { search: debouncedQuery, visible: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!debouncedQuery } as any }
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto mb-12">
          <h1 className="font-serif text-3xl md:text-4xl text-center mb-6">Search</h1>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-12 h-14 rounded-full text-lg shadow-sm border-border focus-visible:ring-primary"
            />
          </div>
        </div>

        {debouncedQuery && (
          <div>
            <h2 className="text-lg font-medium text-muted-foreground mb-6">
              Search results for "{debouncedQuery}"
            </h2>
            
            {isLoading ? (
              <LoadingSpinner size="lg" />
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <EmptyState 
                icon={<SearchIcon className="h-12 w-12" />} 
                title="No results found" 
                description={`We couldn't find any products matching "${debouncedQuery}". Try a different keyword.`}
              />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
