import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { db, userDataTable, ordersTable } from "@workspace/db";
import { requireAuth, type MimiAuthenticatedRequest } from "../lib/request-auth";
import { serializeAppUser } from "../lib/app-user";

const router: IRouter = Router();

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

function currentUser(req: Request) {
  return (req as MimiAuthenticatedRequest).mimiUser!;
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
      unitPrice < 0 ||
      typeof record.productName !== "string"
    ) {
      return [];
    }
    const safeQuantity = Math.min(quantity, 999);
    return [{
      productId,
      productName: record.productName.slice(0, 240),
      productImage: typeof record.productImage === "string" ? record.productImage.slice(0, 1000) : "",
      quantity: safeQuantity,
      unitPrice,
      totalPrice: unitPrice * safeQuantity,
    }];
  });
}

function normalizeWishlist(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
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

function parseUserData(value: unknown): UserDataPayload {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    cart: normalizeCart(record.cart),
    wishlist: normalizeWishlist(record.wishlist),
    checkout: normalizeCheckout(record.checkout),
  };
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

function mergeData(current: UserDataPayload, incoming: UserDataPayload, replace: boolean) {
  return {
    cart: replace ? incoming.cart : mergeCartItems(current.cart, incoming.cart),
    wishlist: replace ? incoming.wishlist : [...new Set([...current.wishlist, ...incoming.wishlist])],
    checkout: replace ? incoming.checkout : { ...current.checkout, ...incoming.checkout },
  };
}

router.get("/me", requireAuth, (req, res): void => {
  const user = currentUser(req);
  res.json(serializeAppUser(user));
});

router.get("/users/data", requireAuth, async (req, res): Promise<void> => {
  const user = currentUser(req);
  const [stored] = await db
    .select()
    .from(userDataTable)
    .where(eq(userDataTable.userId, user.id));

  res.json(stored ?? {
    userId: user.id,
    cart: [],
    wishlist: [],
    checkout: {},
    updatedAt: new Date().toISOString(),
  });
});

router.post("/users/data", requireAuth, async (req, res): Promise<void> => {
  const user = currentUser(req);
  const incoming = parseUserData(req.body);
  const replace = req.body?.mode === "replace";
  const [existing] = await db
    .select()
    .from(userDataTable)
    .where(eq(userDataTable.userId, user.id));
  const mergedData = mergeData(parseUserData(existing), incoming, replace);

  const [stored] = await db
    .insert(userDataTable)
    .values({
      userId: user.id,
      ...mergedData,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userDataTable.userId,
      set: {
        ...mergedData,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(stored);
});

router.get("/users/:id/orders", requireAuth, async (req, res): Promise<void> => {
  const user = currentUser(req);
  const pathId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (!Number.isInteger(pathId) || pathId !== user.id) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "You can only view your own orders." } });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, user.id))
    .orderBy(ordersTable.createdAt);

  res.json(orders.reverse());
});

export default router;
