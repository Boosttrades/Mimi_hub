import type { CustomFetchOptions } from "./custom-fetch";

type SupabaseConfig = {
  url: string;
  anonKey: string;
};

declare global {
  // Injected by the MimiiHub Vite config. The anon key is intentionally public;
  // Supabase RLS policies are the security boundary for browser requests.
  var __MIMIHUB_SUPABASE__: SupabaseConfig | undefined;
}

const PRODUCT_SELECT = "*,category:categories(*),subcategory:subcategories(*)";

const DEFAULT_STORE = {
  storeName: "MimiiHub",
  logo: null,
  contactPhone: null,
  whatsapp: null,
  email: "hello@mimihub.com",
  socialLinks: { instagram: null, facebook: null, twitter: null, tiktok: null },
  deliverySettings: { freeDeliveryThreshold: null, deliveryFee: 0, deliveryNote: null },
};

const DEFAULT_HOMEPAGE = {
  heroBanners: [],
  trustItems: [],
  featuredCollections: [],
};

const DEFAULT_PAYMENT = {
  flutterwaveEnabled: false,
  payOnDeliveryEnabled: true,
  flutterwavePublicKey: null,
};

function getConfig(): SupabaseConfig {
  const config = globalThis.__MIMIHUB_SUPABASE__;
  if (!config?.url || !config.anonKey) {
    throw new Error(
      "Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to the project secrets.",
    );
  }
  return config;
}

function camelizeKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function camelize<T>(value: T): T {
  if (Array.isArray(value)) return value.map(camelize) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      camelizeKey(key),
      camelize(item),
    ]),
  ) as T;
}

function snakeizeKey(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(snakeize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      snakeizeKey(key),
      snakeize(item),
    ]),
  );
}

function enrichProduct<T extends Record<string, any>>(product: T) {
  const camel = camelize(product) as T & {
    price: number;
    discountPct?: number | null;
    images?: string[];
    coverImage?: string | null;
    specs?: Record<string, unknown> | null;
  };
  const discountedPrice = camel.discountPct
    ? Math.round(camel.price * (1 - camel.discountPct / 100))
    : null;
  return {
    ...camel,
    discountedPrice,
    coverImage: camel.coverImage ?? camel.images?.[0] ?? null,
    specs: camel.specs ?? {},
  };
}

async function supabaseRequest<T>(
  tablePath: string,
  options: RequestInit & { query?: Record<string, string | number | boolean | undefined> } = {},
): Promise<T> {
  const { url, anonKey } = getConfig();
  const { query, ...requestOptions } = options;
  const endpoint = new URL(`${url.replace(/\/$/, "")}/rest/v1/${tablePath}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) endpoint.searchParams.set(key, String(value));
  });

  const headers = new Headers(requestOptions.headers);
  headers.set("apikey", anonKey);
  headers.set("Authorization", `Bearer ${anonKey}`);
  headers.set("Accept", "application/json");
  if (requestOptions.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, { ...requestOptions, headers });
  const raw = await response.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : `Supabase request failed (${response.status})`;
    throw new Error(message);
  }
  return camelize(data as T);
}

async function listProducts(params: Record<string, string | number | boolean | undefined>) {
  const query: Record<string, string> = {
    select: PRODUCT_SELECT,
    order: "created_at.asc",
  };
  if (params.categoryId !== undefined) query.category_id = `eq.${params.categoryId}`;
  if (params.subcategoryId !== undefined) query.subcategory_id = `eq.${params.subcategoryId}`;
  if (params.featured !== undefined) query.featured = `eq.${params.featured}`;
  if (params.newArrival !== undefined) query.new_arrival = `eq.${params.newArrival}`;
  if (params.bestSeller !== undefined) query.best_seller = `eq.${params.bestSeller}`;
  if (params.visible !== undefined) query.visible = `eq.${params.visible}`;
  if (params.search) {
    const escaped = String(params.search).replace(/[*(),]/g, "");
    query.or = `(name.ilike.*${escaped}*,description.ilike.*${escaped}*)`;
  }
  const products = await supabaseRequest<Record<string, unknown>[]>("products", { query });
  return products.map(enrichProduct);
}

function productPayload(body: unknown) {
  const payload = snakeize(body) as Record<string, unknown>;
  delete payload.discounted_price;
  delete payload.category;
  delete payload.subcategory;
  return payload;
}

async function listCategories() {
  const categories = await supabaseRequest<Record<string, unknown>[]>("categories", {
    query: { select: "*,subcategories(*)", order: "created_at.asc" },
  });
  return categories;
}

async function getSetting(key: string, fallback: unknown) {
  const rows = await supabaseRequest<{ value: unknown }[]>("settings", {
    query: { select: "value", key: `eq.${key}`, limit: 1 },
  });
  return rows[0]?.value ?? fallback;
}

async function upsertSetting(key: string, body: unknown) {
  const current = await getSetting(
    key,
    key === "store" ? DEFAULT_STORE : key === "homepage" ? DEFAULT_HOMEPAGE : DEFAULT_PAYMENT,
  );
  const value = { ...(current as Record<string, unknown>), ...(body as Record<string, unknown>) };
  const rows = await supabaseRequest<unknown[]>("settings", {
    method: "POST",
    query: { on_conflict: "key" },
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ key, value }),
  });
  return Array.isArray(rows) && rows[0] && typeof rows[0] === "object" && "value" in rows[0]
    ? (rows[0] as { value: unknown }).value
    : value;
}

function orderPayload(body: unknown) {
  const payload = snakeize(body) as Record<string, any>;
  const items = Array.isArray(payload.items) ? payload.items : [];
  delete payload.id;
  delete payload.created_at;
  payload.subtotal = items.reduce(
    (sum: number, item: { total_price?: number }) => sum + Number(item.total_price ?? 0),
    0,
  );
  payload.payment_status = payload.payment_method === "flutterwave" ? "Paid" : "Payment on delivery";
  payload.order_status = "Confirming";
  payload.timeline = [{ status: "Confirming", timestamp: new Date().toISOString(), note: null }];
  const storedUserId = typeof localStorage !== "undefined" ? localStorage.getItem("mimi_user_id") : null;
  if (storedUserId) payload.user_id = Number(storedUserId);
  return payload;
}

async function getNextOrderRef() {
  const latest = await supabaseRequest<{ id: number }[]>("orders", {
    query: { select: "id", order: "id.desc", limit: 1 },
  });
  const nextNumber = (latest[0]?.id ?? 0) + 1;
  return `MH-${String(nextNumber).padStart(6, "0")}`;
}

async function getAdminSummary() {
  const [orders, products] = await Promise.all([
    supabaseRequest<Record<string, any>[]>("orders", { query: { select: "*" } }),
    supabaseRequest<Record<string, any>[]>("products", { query: { select: "*" } }),
  ]);
  const normalizedOrders = orders.map(camelize) as Array<Record<string, any>>;
  const normalizedProducts = products.map(camelize) as Array<Record<string, any>>;
  const paid = normalizedOrders.filter((order) => order.paymentStatus === "Paid");
  const now = new Date();
  const thisMonth = (date: string) => {
    const parsed = new Date(date);
    return parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth();
  };
  const customerMap = new Map<string, any>();
  for (const order of normalizedOrders) {
    const key = order.phone;
    const existing = customerMap.get(key);
    const date = new Date(order.createdAt);
    if (!existing) {
      customerMap.set(key, {
        id: key,
        name: order.fullName,
        phone: order.phone,
        location: `${order.city}, ${order.state}`,
        orders: 1,
        spend: order.paymentStatus === "Paid" || order.orderStatus === "Delivered" ? order.subtotal : 0,
        firstOrderAt: order.createdAt,
        lastOrderAt: order.createdAt,
        returning: false,
      });
    } else {
      existing.orders += 1;
      existing.spend += order.paymentStatus === "Paid" || order.orderStatus === "Delivered"
        ? order.subtotal
        : 0;
      if (date < new Date(existing.firstOrderAt)) existing.firstOrderAt = order.createdAt;
      if (date > new Date(existing.lastOrderAt)) existing.lastOrderAt = order.createdAt;
      existing.returning = existing.orders > 1;
    }
  }
  return {
    totalRevenue: paid.reduce((sum, order) => sum + Number(order.subtotal), 0),
    thisMonthRevenue: paid.filter((order) => thisMonth(order.createdAt)).reduce((sum, order) => sum + Number(order.subtotal), 0),
    totalOrders: normalizedOrders.length,
    thisMonthOrders: normalizedOrders.filter((order) => thisMonth(order.createdAt)).length,
    pendingOrders: normalizedOrders.filter((order) => !["Delivered", "Cancelled"].includes(order.orderStatus)).length,
    paidOrders: paid.length,
    preparingOrders: normalizedOrders.filter((order) => order.orderStatus === "Preparing").length,
    deliveredOrders: normalizedOrders.filter((order) => order.orderStatus === "Delivered").length,
    cancelledOrders: normalizedOrders.filter((order) => order.orderStatus === "Cancelled").length,
    totalProducts: normalizedProducts.length,
    visibleProducts: normalizedProducts.filter((product) => product.visible).length,
    hiddenProducts: normalizedProducts.filter((product) => !product.visible).length,
    lowStockProducts: normalizedProducts.filter((product) => product.inStock && (product.stockQty ?? 0) < 10).length,
    outOfStockProducts: normalizedProducts.filter((product) => !product.inStock || (product.stockQty ?? 0) <= 0).length,
    totalCustomers: customerMap.size,
    returningCustomers: [...customerMap.values()].filter((customer) => customer.returning).length,
    customers: [...customerMap.values()],
  };
}

async function routeSupabaseApi(pathname: string, options: CustomFetchOptions): Promise<unknown> {
  const url = new URL(pathname, "http://mimihub.local");
  const method = (options.method ?? "GET").toUpperCase();
  const body = typeof options.body === "string" ? JSON.parse(options.body) : undefined;
  const segments = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const resource = segments[0];

  if (resource === "categories") {
    if (method === "GET" && !segments[1]) return listCategories();
    if (method === "POST" && !segments[1]) {
      return supabaseRequest("categories", {
        method,
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(snakeize(body)),
      }).then((rows: unknown) => Array.isArray(rows) ? rows[0] : rows);
    }
    if (segments[1] && segments[2] === "subcategories") {
      const categoryId = Number(segments[1]);
      if (method === "POST") {
        return supabaseRequest("subcategories", {
          method,
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ ...(snakeize(body) as Record<string, unknown>), category_id: categoryId }),
        }).then((rows: unknown) => Array.isArray(rows) ? rows[0] : rows);
      }
    }
    if (segments[1] && method === "GET") {
      const rows = await supabaseRequest<Record<string, unknown>[]>("categories", {
        query: { select: "*,subcategories(*)", id: `eq.${segments[1]}`, limit: 1 },
      });
      return rows[0];
    }
    if (segments[1] && method === "PATCH") {
      const rows = await supabaseRequest<Record<string, unknown>[]>("categories", {
        method,
        query: { id: `eq.${segments[1]}` },
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(snakeize(body)),
      });
      return rows[0];
    }
    if (segments[1] && method === "DELETE") {
      await supabaseRequest(`categories`, { method, query: { id: `eq.${segments[1]}` } });
      return null;
    }
  }

  if (resource === "subcategories" && segments[1]) {
    const table = "subcategories";
    if (method === "PATCH") {
      const rows = await supabaseRequest<Record<string, unknown>[]>(table, {
        method,
        query: { id: `eq.${segments[1]}` },
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(snakeize(body)),
      });
      return rows[0];
    }
    if (method === "DELETE") {
      await supabaseRequest(table, { method, query: { id: `eq.${segments[1]}` } });
      return null;
    }
  }

  if (resource === "products") {
    if (method === "GET" && !segments[1]) {
      const params: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return listProducts(params);
    }
    if (method === "GET" && segments[1] === "summary") {
      const products = await supabaseRequest<Record<string, any>[]>("products", { query: { select: "*" } });
      return {
        total: products.length,
        visible: products.filter((product) => product.visible).length,
        hidden: products.filter((product) => !product.visible).length,
        featured: products.filter((product) => product.featured).length,
        newArrivals: products.filter((product) => product.new_arrival).length,
        bestSellers: products.filter((product) => product.best_seller).length,
        outOfStock: products.filter((product) => !product.in_stock).length,
      };
    }
    if (method === "POST" && !segments[1]) {
      const rows = await supabaseRequest<Record<string, unknown>[]>("products", {
        method,
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(productPayload(body)),
      });
      return rows[0] ? enrichProduct(rows[0]) : rows[0];
    }
    if (segments[1] && segments[2] === "related" && method === "GET") {
      const products = await listProducts({ visible: true });
      const product = products.find((item) => item.id === Number(segments[1]));
      return product ? products.filter((item) => item.id !== product.id && item.categoryId === product.categoryId) : [];
    }
    if (segments[1] && method === "GET") {
      const rows = await supabaseRequest<Record<string, unknown>[]>("products", {
        query: { select: PRODUCT_SELECT, id: `eq.${segments[1]}`, limit: 1 },
      });
      return rows[0] ? enrichProduct(rows[0]) : null;
    }
    if (segments[1] && method === "PATCH") {
      const rows = await supabaseRequest<Record<string, unknown>[]>("products", {
        method,
        query: { select: PRODUCT_SELECT, id: `eq.${segments[1]}` },
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(productPayload(body)),
      });
      return rows[0] ? enrichProduct(rows[0]) : rows[0];
    }
    if (segments[1] && method === "DELETE") {
      await supabaseRequest("products", { method, query: { id: `eq.${segments[1]}` } });
      return null;
    }
  }

  if (resource === "orders") {
    if (method === "GET" && segments[1] === "stats") {
      const orders = await supabaseRequest<Record<string, any>[]>("orders", { query: { select: "*" } });
      const realized = orders.filter(
        (order) => order.payment_status === "Paid" || order.order_status === "Delivered",
      );
      return {
        totalOrders: orders.length,
        pendingOrders: orders.filter((order) => !["Delivered", "Cancelled"].includes(order.order_status)).length,
        paidOrders: orders.filter((order) => order.payment_status === "Paid").length,
        preparingOrders: orders.filter((order) => order.order_status === "Preparing").length,
        deliveredOrders: orders.filter((order) => order.order_status === "Delivered").length,
        cancelledOrders: orders.filter((order) => order.order_status === "Cancelled").length,
        totalRevenue: realized.reduce((sum, order) => sum + Number(order.subtotal), 0),
      };
    }
    if (method === "GET" && segments[1] === "ref" && segments[2]) {
      const rows = await supabaseRequest<Record<string, unknown>[]>("orders", {
        query: { select: "*", order_ref: `eq.${segments[2]}`, limit: 1 },
      });
      return rows[0] ? camelize(rows[0]) : null;
    }
    if (method === "GET" && !segments[1]) {
      const query: Record<string, string> = { select: "*", order: "created_at.asc" };
      const status = url.searchParams.get("status");
      if (status) query.order_status = `eq.${status}`;
      return supabaseRequest("orders", { query });
    }
    if (method === "POST" && !segments[1]) {
      const payload = orderPayload(body);
      payload.order_ref = await getNextOrderRef();
      const rows = await supabaseRequest<Record<string, unknown>[]>("orders", {
        method,
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload),
      });
      return rows[0] ? camelize(rows[0]) : rows[0];
    }
    if (segments[1] && method === "PATCH") {
      const current = await supabaseRequest<Record<string, any>[]>("orders", {
        query: { select: "*", id: `eq.${segments[1]}`, limit: 1 },
      });
      if (!current[0]) return null;
       const update = snakeize(body) as Record<string, unknown>;
      const timeline = Array.isArray(current[0].timeline) ? [...current[0].timeline] : [];
       if (update.order_status) {
         timeline.push({ status: update.order_status, timestamp: new Date().toISOString(), note: update.note ?? null });
       }
      delete update.note;
      update.timeline = timeline;
      const rows = await supabaseRequest<Record<string, unknown>[]>("orders", {
        method,
        query: { id: `eq.${segments[1]}` },
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(update),
      });
      return rows[0] ? camelize(rows[0]) : rows[0];
    }
  }

  if (resource === "settings" && segments[1]) {
    const key = segments[1];
    const fallback = key === "store" ? DEFAULT_STORE : key === "homepage" ? DEFAULT_HOMEPAGE : DEFAULT_PAYMENT;
    return method === "GET" ? getSetting(key, fallback) : upsertSetting(key, body);
  }

  if (resource === "admin" && segments[1] === "summary" && method === "GET") {
    return getAdminSummary();
  }

  if (resource === "healthz" && method === "GET") return { status: "ok" };

  throw new Error(`Unsupported Supabase API route: ${method} ${url.pathname}`);
}

export async function supabaseFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  const pathname = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
  return routeSupabaseApi(pathname, options) as Promise<T>;
}