import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAccountStorageKey, readStored, removeStored, writeStored } from '@/lib/localData';

interface WishlistContextType {
  items: number[]; // Array of product IDs
  addToWishlist: (productId: number) => void;
  removeFromWishlist: (productId: number) => void;
  toggleWishlist: (productId: number) => void;
  isInWishlist: (productId: number) => boolean;
  switchToAccount: (username: string, mergeGuest: boolean, accountItems?: number[]) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [storageScope, setStorageScope] = useState<'guest' | string>('guest');
  const [items, setItems] = useState<number[]>(() => {
    return readStored<number[]>('mimihub_wishlist', []);
  });

  useEffect(() => {
    writeStored(
      storageScope === 'guest' ? 'mimihub_wishlist' : getAccountStorageKey('wishlist', storageScope),
      items,
    );
  }, [items, storageScope]);

  const addToWishlist = (productId: number) => {
    setItems((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
  };

  const removeFromWishlist = (productId: number) => {
    setItems((prev) => prev.filter((id) => id !== productId));
  };

  const toggleWishlist = (productId: number) => {
    setItems((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const isInWishlist = (productId: number) => items.includes(productId);

  const switchToAccount = (username: string, mergeGuest: boolean, accountItems?: number[]) => {
    const accountKey = getAccountStorageKey('wishlist', username);
    const storedAccountItems = accountItems ?? readStored<number[]>(accountKey, []);
    const nextItems = mergeGuest
      ? [...storedAccountItems, ...items.filter((id) => !storedAccountItems.includes(id))]
      : storedAccountItems;

    writeStored(accountKey, nextItems);
    if (mergeGuest) removeStored('mimihub_wishlist');
    setItems(nextItems);
    setStorageScope(username);
  };

  return (
    <WishlistContext.Provider
      value={{ items, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist, switchToAccount }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
