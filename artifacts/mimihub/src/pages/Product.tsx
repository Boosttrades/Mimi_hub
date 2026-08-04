import { useRoute } from 'wouter';
import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/product/ProductCard';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { useGetProduct, useGetRelatedProducts } from '@workspace/api-client-react';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { Heart, ShoppingBag, Minus, Plus, ChevronRight } from 'lucide-react';
import { formatNaira } from '@/lib/utils/format';
import { toast } from 'sonner';

export function Product() {
  const [, params] = useRoute('/product/:id');
  const id = parseInt(params?.id || '0', 10);

  const { data: product, isLoading, isError } = useGetProduct(id, { query: { enabled: !!id } });
  const { data: relatedProducts } = useGetRelatedProducts(id, { query: { enabled: !!id } });

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isWishlisted = isInWishlist(id);

  const allImages = useMemo(() => {
    if (!product) return [];
    const images = [];
    if (product.coverImage) images.push(product.coverImage);
    if (product.images && product.images.length > 0) {
      product.images.forEach(img => {
        if (img !== product.coverImage) images.push(img);
      });
    }
    if (images.length === 0) images.push('https://placehold.co/600x600/D4B483/FAF6F0?text=Product');
    return images;
  }, [product]);

  if (isLoading) return <LoadingPage />;
  if (isError || !product) {
    return (
      <Layout>
        <ErrorState title="Product Not Found" message="The product you are looking for does not exist or has been removed." />
      </Layout>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, quantity);
    toast.success(`${quantity}x ${product.name} added to cart`);
  };

  const hasSpecs = product.specs && Object.values(product.specs).some(val => val !== null && val !== '');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-12">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <a href="/" className="hover:text-primary transition-colors">Home</a>
          <ChevronRight className="h-3 w-3" />
          {product.category && (
            <>
              <a href={`/category/${product.category.slug}`} className="hover:text-primary transition-colors">{product.category.name}</a>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-foreground truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-16">
          {/* Image Gallery */}
          <div className="flex flex-col gap-4">
            <div className="aspect-square rounded-2xl overflow-hidden bg-secondary relative border border-border">
              <img 
                src={allImages[activeImageIndex]} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
              {product.discountPct && product.discountPct > 0 && (
                <span className="absolute top-4 left-4 px-3 py-1 bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider rounded-sm">
                  -{product.discountPct}% OFF
                </span>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${activeImageIndex === idx ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2 leading-tight">
              {product.name}
            </h1>
            
            <div className="flex items-end gap-3 mb-6">
              <span className="font-sans font-bold text-2xl md:text-3xl text-primary">
                {formatNaira(product.discountedPrice || product.price)}
              </span>
              {product.discountedPrice && product.discountedPrice < product.price && (
                <span className="font-sans text-lg text-muted-foreground line-through mb-1">
                  {formatNaira(product.price)}
                </span>
              )}
            </div>

            <div className="h-px w-full bg-border mb-6" />

            <div className="prose prose-sm md:prose-base text-muted-foreground mb-8">
              {product.description ? (
                <p className="whitespace-pre-wrap">{product.description}</p>
              ) : (
                <p>No description available.</p>
              )}
            </div>

            {hasSpecs && (
              <div className="mb-8">
                <h3 className="font-serif text-lg text-foreground mb-4">Specifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                  {Object.entries(product.specs!).map(([key, value]) => {
                    if (!value) return null;
                    return (
                      <div key={key} className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground capitalize">{key}</span>
                        <span className="font-medium text-foreground text-right">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-auto pt-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-full h-12 bg-background">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-full flex items-center justify-center text-foreground hover:text-primary transition-colors disabled:opacity-50"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-full flex items-center justify-center text-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <Button 
                  onClick={handleAddToCart}
                  className="flex-1 h-12 rounded-full text-base gap-2"
                  disabled={!product.inStock}
                >
                  <ShoppingBag className="h-5 w-5" />
                  {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => toggleWishlist(product.id)}
                  className={`h-12 w-12 rounded-full border-border flex-shrink-0 ${isWishlisted ? 'bg-primary/5 border-primary text-primary' : 'text-foreground'}`}
                >
                  <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-primary' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="mt-16 pt-12 border-t border-border">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-8 text-center">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.slice(0, 4).map(related => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
