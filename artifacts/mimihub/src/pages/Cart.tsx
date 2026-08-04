import { Link } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils/format';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export function Cart() {
  const { items, updateQuantity, removeFromCart, subtotal, totalItems } = useCart();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-8 text-center md:text-left">Your Cart</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-border rounded-2xl bg-card">
            <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h2 className="font-serif text-2xl text-foreground mb-4">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-md">Looks like you haven't added anything to your cart yet. Explore our collections and find something you love.</p>
            <Link href="/">
              <Button size="lg" className="rounded-full px-8">Continue Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Cart Items */}
            <div className="flex-1 flex flex-col gap-6">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-4 p-4 border border-border rounded-2xl bg-card">
                  <Link href={`/product/${item.productId}`}>
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-secondary flex-shrink-0 cursor-pointer">
                      <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                    </div>
                  </Link>
                  <div className="flex flex-col flex-1 py-1">
                    <div className="flex justify-between items-start gap-4">
                      <Link href={`/product/${item.productId}`}>
                        <h3 className="font-medium text-foreground text-sm sm:text-base cursor-pointer hover:text-primary transition-colors line-clamp-2">
                          {item.productName}
                        </h3>
                      </Link>
                      <button 
                        onClick={() => removeFromCart(item.productId)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                    <div className="mt-1 font-semibold text-primary">
                      {formatNaira(item.unitPrice)}
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center border border-border rounded-full h-9 bg-background">
                        <button 
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-9 h-full flex items-center justify-center text-foreground hover:text-primary transition-colors"
                        >
                          <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-9 h-full flex items-center justify-center text-foreground hover:text-primary transition-colors"
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                      <div className="font-medium text-sm sm:text-base hidden sm:block">
                        Total: {formatNaira(item.totalPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="w-full lg:w-96 flex-shrink-0">
              <div className="bg-card border border-border rounded-2xl p-6 sticky top-24">
                <h2 className="font-serif text-xl text-foreground mb-6">Order Summary</h2>
                
                <div className="flex flex-col gap-4 mb-6 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal ({totalItems} items)</span>
                    <span className="text-foreground">{formatNaira(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span className="text-foreground">Calculated at checkout</span>
                  </div>
                </div>
                
                <div className="h-px w-full bg-border mb-6" />
                
                <div className="flex justify-between items-end mb-8">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-sans font-bold text-2xl text-primary">{formatNaira(subtotal)}</span>
                </div>

                <Link href="/checkout">
                  <Button className="w-full h-12 rounded-full text-base gap-2 group">
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>

                <div className="mt-6 text-center">
                  <Link href="/">
                    <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer inline-block">
                      Continue Shopping
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
