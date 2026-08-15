export interface MimiUser {
  id: number;
  username: string;
  createdAt: string;
}

export interface MimiAccountData {
  userId: number;
  cart: Array<{
    productId: number;
    productName: string;
    productImage: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  wishlist: number[];
  checkout: Record<string, string>;
  updatedAt: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(data?.error || data?.message || `API request failed (${response.status})`);
  return data as T;
}

function toCamel(value: unknown): any {
  if (Array.isArray(value)) return value.map(toCamel);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      toCamel(item),
    ]),
  );
}

export async function createOrGetUser(username: string): Promise<MimiUser> {
  const user = await request<Record<string, unknown>>('/users', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  const normalized = toCamel(user) as MimiUser;
  localStorage.setItem('mimi_user_id', String(normalized.id));
  window.dispatchEvent(new Event('mimihub:user-session-changed'));
  return normalized;
}

export async function getCurrentUser(): Promise<MimiUser | null> {
  if (!localStorage.getItem('mimi_user_id')) return null;
  try {
    const user = await request<Record<string, unknown>>('/me');
    return toCamel(user) as MimiUser;
  } catch {
    localStorage.removeItem('mimi_user_id');
    return null;
  }
}

export async function listUserOrders(userId: number) {
  const rows = await request<Record<string, unknown>[]>(`/users/${encodeURIComponent(userId)}/orders`);
  return rows.map(toCamel);
}

export async function syncUserData(
  data: Pick<MimiAccountData, 'cart' | 'wishlist' | 'checkout'>,
  mode: 'merge' | 'replace' = 'merge',
): Promise<MimiAccountData> {
  const stored = await request<Record<string, unknown>>('/users/data', {
    method: 'POST',
    body: JSON.stringify({ ...data, mode }),
  });
  return toCamel(stored) as MimiAccountData;
}

export async function getUserData(): Promise<MimiAccountData> {
  const stored = await request<Record<string, unknown>>('/users/data');
  return toCamel(stored) as MimiAccountData;
}

export async function uploadProductImage(file: Blob, filename: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename);
  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(data?.error || 'Supabase Storage upload failed');
  return data.url as string;
}