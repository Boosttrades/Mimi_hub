import type { Order } from '@workspace/api-client-react';

export type LocalOrder = Order;

const GUEST_ORDERS_KEY = 'mimihub_guest_orders';

function accountKey(type: string, username: string) {
  const normalized = encodeURIComponent(username.trim().toLowerCase());
  return `mimihub_account_${type}_${normalized}`;
}

export function readStored<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeStored(key: string) {
  localStorage.removeItem(key);
}

export function getAccountStorageKey(type: 'cart' | 'wishlist' | 'orders', username: string) {
  return accountKey(type, username);
}

export function getGuestDataSummary() {
  const cart = readStored<unknown[]>('mimihub_cart', []);
  const wishlist = readStored<unknown[]>('mimihub_wishlist', []);
  const orders = readStored<LocalOrder[]>(GUEST_ORDERS_KEY, []);

  return {
    cartCount: cart.length,
    wishlistCount: wishlist.length,
    orderCount: orders.length,
    hasData: cart.length > 0 || wishlist.length > 0 || orders.length > 0,
  };
}

export function getStoredOrders(scope: 'guest' | string): LocalOrder[] {
  const key = scope === 'guest' ? GUEST_ORDERS_KEY : getAccountStorageKey('orders', scope);
  return readStored<LocalOrder[]>(key, []);
}

export function saveGuestOrder(order: LocalOrder) {
  writeStored(GUEST_ORDERS_KEY, [...getStoredOrders('guest'), order]);
}

export function switchOrdersToAccount(username: string, mergeGuest: boolean) {
  const guestOrders = getStoredOrders('guest');
  const accountKeyForOrders = getAccountStorageKey('orders', username);
  const accountOrders = readStored<LocalOrder[]>(accountKeyForOrders, []);
  const nextOrders = mergeGuest ? [...accountOrders, ...guestOrders] : accountOrders;

  writeStored(accountKeyForOrders, nextOrders);
  if (mergeGuest) removeStored(GUEST_ORDERS_KEY);

  return nextOrders;
}

export function getGuestOrder(orderRef: string) {
  return getStoredOrders('guest').find((order) => order.orderRef === orderRef);
}
