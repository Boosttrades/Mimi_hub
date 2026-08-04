import { Link } from 'wouter';
import { Heart } from 'lucide-react';
import { Product } from '@workspace/api-client-react';
import { formatNaira } from '@/lib/utils/format';
import { useWishlist } from '@/contexts/WishlistContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  
  const coverImage = product.coverImage || product.images?.[0] || 'https://placehold.co/400x400/D4B483/FAF6F0?text=Product';

  return (
    <div className="group relative flex flex-col bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-300" data-testid={`card-product-${product.id}`}>
      <div className="relative aspect-square overflow-hidden bg-secondary/30">
        <Link href={`/product/${product.id}`}>
          <img
            src={coverImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
            loading="lazy"
          />
        </Link>
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.newArrival && (
            <span className="px-2 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-sm">
              New
            </span>
          )}
          {product.discountPct && product.discountPct > 0 && (
            <span className="px-2 py-1 bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider rounded-sm">
              -{product.discountPct}%
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur shadow-sm hover:bg-background"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          data-testid={`button-wishlist-${product.id}`}
        >
          <Heart className={cn("h-4 w-4 transition-colors", isWishlisted ? "fill-primary text-primary" : "text-foreground")} />
        </Button>
      </div>

      <Link href={`/product/${product.id}`}>
        <div className="p-3 sm:p-4 flex flex-col flex-1 cursor-pointer">
          <h3 className="font-medium text-xs sm:text-sm text-foreground line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="mt-auto flex items-end gap-2 flex-wrap">
            <span className="font-semibold text-primary">
              {formatNaira(product.discountedPrice || product.price)}
            </span>
            {product.discountedPrice && product.discountedPrice < product.price && (
              <span className="text-xs text-muted-foreground line-through decoration-muted-foreground/50">
                {formatNaira(product.price)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
