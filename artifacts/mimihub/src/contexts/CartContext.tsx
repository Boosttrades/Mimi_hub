import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Product } from '@workspace/api-client-react';
import { getAccountStorageKey, readStored, removeStored, writeStored } from '@/lib/localData';

export interface CartItem {
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  switchToAccount: (username: string, mergeGuest: boolean, accountItems?: CartItem[]) => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [storageScope, setStorageScope] = useState<'guest' | string>('guest');
  const [items, setItems] = useState<CartItem[]>(() => {
    return readStored<CartItem[]>('mimihub_cart', []);
  });

  useEffect(() => {
    writeStored(
      storageScope === 'guest' ? 'mimihub_cart' : getAccountStorageKey('cart', storageScope),
      items,
    );
  }, [items, storageScope]);

  const addToCart = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      const price = product.discountedPrice ?? product.price;
      
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity, totalPrice: (item.quantity + quantity) * price }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productImage: product.coverImage || product.images?.[0] || 'https://placehold.co/400x400/D4B483/FAF6F0?text=Product',
          quantity,
          unitPrice: price,
          totalPrice: price * quantity,
        },
      ];
    });
  };

  const removeFromCart = (productId: number) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
          : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const switchToAccount = (username: string, mergeGuest: boolean, accountItems?: CartItem[]) => {
    const accountKey = getAccountStorageKey('cart', username);
    const storedAccountItems = accountItems ?? readStored<CartItem[]>(accountKey, []);
    const nextItems = mergeGuest ? mergeCartItems(storedAccountItems, items) : storedAccountItems;

    writeStored(accountKey, nextItems);
    if (mergeGuest) removeStored('mimihub_cart');
    setItems(nextItems);
    setStorageScope(username);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, switchToAccount, totalItems, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

function mergeCartItems(existing: CartItem[], incoming: CartItem[]) {
  return incoming.reduce<CartItem[]>((merged, incomingItem) => {
    const existingItem = merged.find((item) => item.productId === incomingItem.productId);
    if (!existingItem) return [...merged, incomingItem];

    return merged.map((item) =>
      item.productId === incomingItem.productId
        ? {
            ...item,
            quantity: item.quantity + incomingItem.quantity,
            totalPrice: item.unitPrice * (item.quantity + incomingItem.quantity),
          }
        : item,
    );
  }, [...existing]);
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
