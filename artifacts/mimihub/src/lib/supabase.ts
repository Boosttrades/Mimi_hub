type SupabaseConfig = {
  url: string;
  anonKey: string;
};

declare global {
  var __MIMIHUB_SUPABASE__: SupabaseConfig | undefined;
}

export interface MimiUser {
  id: number;
  username: string;
  createdAt: string;
}

function getConfig() {
  const config = globalThis.__MIMIHUB_SUPABASE__;
  if (!config?.url || !config.anonKey) throw new Error('Supabase is not configured.');
  return config;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { url, anonKey } = getConfig();
  const endpoint = new URL(`${url.replace(/\/$/, '')}/rest/v1/${path}`);
  const headers = new Headers(options.headers);
  headers.set('apikey', anonKey);
  headers.set('Authorization', `Bearer ${anonKey}`);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(endpoint, { ...options, headers });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(data?.message || `Supabase request failed (${response.status})`);
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
  const existing = await request<Record<string, unknown>[]>(`users?select=*&username=eq.${encodeURIComponent(username)}&limit=1`);
  if (existing[0]) {
    const user = toCamel(existing[0]) as MimiUser;
    localStorage.setItem('mimi_user_id', String(user.id));
    return user;
  }

  const created = await request<Record<string, unknown>[]>('users', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ username }),
  });
  const user = toCamel(created[0]) as MimiUser;
  localStorage.setItem('mimi_user_id', String(user.id));
  return user;
}

export async function getCurrentUser(): Promise<MimiUser | null> {
  const id = localStorage.getItem('mimi_user_id');
  if (!id) return null;
  const rows = await request<Record<string, unknown>[]>(`users?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] ? (toCamel(rows[0]) as MimiUser) : null;
}

export async function listUserOrders(userId: number) {
  const rows = await request<Record<string, unknown>[]>(`orders?select=*&user_id=eq.${userId}&order=created_at.desc`);
  return rows.map(toCamel);
}

export async function uploadProductImage(file: Blob, filename: string): Promise<string> {
  const { url, anonKey } = getConfig();
  const extension = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '.jpg';
  const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`;
  const response = await fetch(
    `${url.replace(/\/$/, '')}/storage/v1/object/product-images/${objectPath}`,
    {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': file.type || 'image/jpeg',
        'x-upsert': 'false',
      },
      body: file,
    },
  );
  if (!response.ok) throw new Error('Supabase Storage upload failed');
  return `${url.replace(/\/$/, '')}/storage/v1/object/public/product-images/${objectPath}`;
}