import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, userDataTable, ordersTable } from "@workspace/db";

const router: IRouter = Router();

const COOKIE_NAME = "mimi_user_id";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

type CartItem = {
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type UserDataPayload = {
  cart: CartItem[];
  wishlist: number[];
  checkout: Record<string, string>;
};

function getSessionUserId(req: Request): number | null {
  const rawId = req.cookies?.[COOKIE_NAME];
  if (!rawId) return null;
  const id = parseInt(rawId, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const productId = Number(record.productId);
    const quantity = Number(record.quantity);
    const unitPrice = Number(record.unitPrice);
    if (
      !Number.isInteger(productId) ||
      productId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      typeof record.productName !== "string"
    ) {
      return [];
    }
    return [{
      productId,
      productName: record.productName.slice(0, 240),
      productImage: typeof record.productImage === "string" ? record.productImage.slice(0, 1000) : "",
      quantity: Math.min(quantity, 999),
      unitPrice,
      totalPrice: unitPrice * Math.min(quantity, 999),
    }];
  });
}

function normalizeWishlist(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0),
  )];
}

function normalizeCheckout(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const allowedKeys = ["fullName", "phone", "state", "city", "address", "paymentMethod"];
  return Object.fromEntries(
    allowedKeys.flatMap((key) => {
      const item = record[key];
      return typeof item === "string" && item.length <= 500 ? [[key, item]] : [];
    }),
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
            quantity: Math.min(item.quantity + incomingItem.quantity, 999),
            totalPrice: item.unitPrice * Math.min(item.quantity + incomingItem.quantity, 999),
          }
        : item,
    );
  }, [...existing]);
}

function parseUserData(value: unknown): UserDataPayload {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    cart: normalizeCart(record.cart),
    wishlist: normalizeWishlist(record.wishlist),
    checkout: normalizeCheckout(record.checkout),
  };
}

function mergeCheckout(existing: Record<string, string>, incoming: Record<string, string>) {
  return { ...existing, ...incoming };
}

// POST /users — create or return existing user by username, set HttpOnly cookie
router.post("/users", async (req, res): Promise<void> => {
  const { username } = req.body;

  if (!username || typeof username !== "string" || !username.trim()) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  const trimmed = username.trim();

  // Return existing user if username already taken (idempotent)
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, trimmed));

  if (existing) {
    res.cookie(COOKIE_NAME, String(existing.id), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    });
    res.json(existing);
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ username: trimmed })
    .returning();

  res.cookie(COOKIE_NAME, String(user.id), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
  });

  res.status(201).json(user);
});

// GET /me — read mimi_user_id cookie and return the user
router.get("/me", async (req, res): Promise<void> => {
  const id = getSessionUserId(req);
  if (id === null) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

// GET /users/data — return the account's merged browser data.
router.get("/users/data", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (userId === null) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [stored] = await db
    .select()
    .from(userDataTable)
    .where(eq(userDataTable.userId, userId));

  res.json(stored ?? {
    userId,
    cart: [],
    wishlist: [],
    checkout: {},
    updatedAt: new Date().toISOString(),
  });
});

// POST /users/data — merge guest browser data into the account.
// Account creation is optional; this endpoint is only used after a username session exists.
router.post("/users/data", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (userId === null) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const incoming = parseUserData(req.body);
  const replace = req.body?.mode === "replace";
  const [existing] = await db
    .select()
    .from(userDataTable)
    .where(eq(userDataTable.userId, userId));
  const current = parseUserData(existing);

  const [merged] = await db
    .insert(userDataTable)
    .values({
      userId,
      cart: replace ? incoming.cart : mergeCartItems(current.cart, incoming.cart),
      wishlist: replace ? incoming.wishlist : [...new Set([...current.wishlist, ...incoming.wishlist])],
      checkout: replace ? incoming.checkout : mergeCheckout(current.checkout, incoming.checkout),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userDataTable.userId,
      set: {
        cart: replace ? incoming.cart : mergeCartItems(current.cart, incoming.cart),
        wishlist: replace ? incoming.wishlist : [...new Set([...current.wishlist, ...incoming.wishlist])],
        checkout: replace ? incoming.checkout : mergeCheckout(current.checkout, incoming.checkout),
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(merged);
});

// GET /users/:id/orders — return orders for the authenticated user only
// The session cookie is the sole authority; the path :id must match it.
router.get("/users/:id/orders", async (req, res): Promise<void> => {
  // Resolve and verify session from cookie
  const sessionUserId = getSessionUserId(req);
  if (sessionUserId === null) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  // Verify path id matches the authenticated session — prevents ID enumeration
  const pathId = parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );

  if (isNaN(pathId) || pathId !== sessionUserId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, sessionUserId))
    .orderBy(ordersTable.createdAt);

  // Newest first
  res.json(orders.reverse());
});

export default router;
