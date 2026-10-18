export interface MimiUser {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  role: 'customer' | 'admin' | string;
  createdAt: string;
}

type AuthResult = {
  authenticated: boolean;
  requiresEmailVerification?: boolean;
  requiresPhoneVerification?: boolean;
  profile?: MimiUser;
};

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
  if (!response.ok) {
    const message = typeof data?.error === 'string'
      ? data.error
      : data?.error?.message || data?.message || `API request failed (${response.status})`;
    throw new Error(message);
  }
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

function verificationRedirectUrl() {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return new URL(`${base}account/verify`, window.location.origin).toString();
}

export async function signUpAccount(input: {
  phone: string;
  email?: string;
  password: string;
  fullName: string;
}): Promise<AuthResult> {
  const result = await request<AuthResult>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ ...input, redirectTo: verificationRedirectUrl() }),
  });
  if (result.authenticated) window.dispatchEvent(new Event('mimihub:user-session-changed'));
  return result;
}

export async function signInAccount(identifier: string, password: string): Promise<MimiUser> {
  const result = await request<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  if (!result.profile) throw new Error('Your account profile could not be loaded.');
  window.dispatchEvent(new Event('mimihub:user-session-changed'));
  return toCamel(result.profile) as MimiUser;
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<MimiUser> {
  const result = await request<AuthResult>('/auth/verify-phone', {
    method: 'POST',
    body: JSON.stringify({ phone, token }),
  });
  if (!result.profile) throw new Error('Phone verified, but your account profile could not be loaded.');
  window.dispatchEvent(new Event('mimihub:user-session-changed'));
  return toCamel(result.profile) as MimiUser;
}

export async function signOutAccount(): Promise<void> {
  await request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
  window.dispatchEvent(new Event('mimihub:user-session-changed'));
}

export async function resendVerificationEmail(email: string): Promise<void> {
  await request('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email, redirectTo: verificationRedirectUrl() }),
  });
}

export async function acceptSupabaseRedirectSession(
  accessToken: string,
  refreshToken: string,
): Promise<MimiUser> {
  const result = await request<AuthResult>('/auth/accept-session', {
    method: 'POST',
    body: JSON.stringify({ accessToken, refreshToken }),
  });
  if (!result.profile) throw new Error('Email verification succeeded, but your account profile was not returned.');
  window.dispatchEvent(new Event('mimihub:user-session-changed'));
  return toCamel(result.profile) as MimiUser;
}

export async function verifyEmailTokenHash(tokenHash: string): Promise<MimiUser | null> {
  const result = await request<AuthResult>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ tokenHash }),
  });
  if (!result.profile) return null;
  window.dispatchEvent(new Event('mimihub:user-session-changed'));
  return toCamel(result.profile) as MimiUser;
}

export async function getCurrentUser(): Promise<MimiUser | null> {
  try {
    const user = await request<Record<string, unknown>>('/me');
    return toCamel(user) as MimiUser;
  } catch {
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

async function uploadImage(file: Blob, filename: string, endpoint: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename);
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(data?.error || 'Supabase Storage upload failed');
  return data.url as string;
}

export function uploadProductImage(file: Blob, filename: string): Promise<string> {
  return uploadImage(file, filename, '/api/storage/upload');
}

export function uploadCategoryImage(file: Blob, filename: string): Promise<string> {
  return uploadImage(file, filename, '/api/storage/upload/category-image');
}