import { Router, type IRouter } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, ordersTable, productsTable } from "@workspace/db";

const router: IRouter = Router();

const ORDER_STATUSES = ["Confirming", "Preparing", "Shipping", "Delivered", "Cancelled"] as const;
const PAYMENT_STATUSES = ["Paid", "Payment on delivery"] as const;
type OrderStatus = typeof ORDER_STATUSES[number];
type PaymentStatus = typeof PAYMENT_STATUSES[number];
type OrderTimelineEntry = {
  status: string;
  timestamp: string;
  note: string | null;
};
type OrderItem = {
  productId: number;
  quantity: number;
};

class InventoryError extends Error {
  statusCode = 409;
}

const LEGACY_ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  "Awaiting Payment": "Confirming",
  Paid: "Confirming",
  "Ready for Shipping": "Shipping",
  Shipped: "Shipping",
};

function normalizeOrderStatus(status: unknown): string {
  if (typeof status !== "string") return "Confirming";
  return LEGACY_ORDER_STATUS_MAP[status] ?? status;
}

function normalizePaymentStatus(status: unknown, paymentMethod: unknown): string {
  if (status === "Paid" || status === "Payment on delivery") return status;
  if (status === "Awaiting Payment") {
    return paymentMethod === "flutterwave" ? "Paid" : "Payment on delivery";
  }
  return typeof status === "string" ? status : "Payment on delivery";
}

function normalizeTimeline(value: unknown): OrderTimelineEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
    .map((entry) => ({
      status: normalizeOrderStatus(entry.status),
      timestamp: typeof entry.timestamp === "string" ? entry.timestamp : new Date().toISOString(),
      note: typeof entry.note === "string" ? entry.note : null,
    }));
}

function normalizeOrder(order: typeof ordersTable.$inferSelect) {
  const { inventoryAdjusted: _inventoryAdjusted, ...publicOrder } = order;
  return {
    ...publicOrder,
    orderStatus: normalizeOrderStatus(order.orderStatus),
    paymentStatus: normalizePaymentStatus(order.paymentStatus, order.paymentMethod),
    timeline: normalizeTimeline(order.timeline),
  };
}

function isRevenueRealized(order: { orderStatus: string; paymentStatus: string }) {
  return order.paymentStatus === "Paid" || order.orderStatus === "Delivered";
}

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

function parseOrderItems(value: unknown): OrderItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const items: OrderItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const productId = Number(record.productId);
    const quantity = Number(record.quantity);
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      return null;
    }
    items.push({ productId, quantity });
  }
  return items;
}

async function adjustInventory(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  items: unknown,
  direction: -1 | 1,
) {
  const parsedItems = parseOrderItems(items);
  if (!parsedItems) {
    throw new InventoryError("This order has invalid product quantities and cannot update inventory.");
  }

  const quantities = new Map<number, number>();
  for (const item of parsedItems) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  for (const [productId, quantity] of quantities) {
    const delta = direction * quantity;
    const [product] = await tx
      .update(productsTable)
      .set({
        stockQty: sql`${productsTable.stockQty} + ${delta}`,
        inStock: sql<boolean>`${productsTable.stockQty} + ${delta} > 0`,
      })
      .where(
        direction === -1
          ? and(eq(productsTable.id, productId), gte(productsTable.stockQty, quantity))
          : eq(productsTable.id, productId),
      )
      .returning({ id: productsTable.id });

    if (!product) {
      throw new InventoryError(
        direction === -1
          ? "Not enough stock is available to mark this order as delivered."
          : "A product from this order no longer exists, so its stock could not be restored.",
      );
    }
  }
}

async function generateOrderRef(): Promise<string> {
  const orders = await db.select().from(ordersTable).orderBy(ordersTable.id);
  const nextNum = orders.length + 1;
  return `MH-${String(nextNum).padStart(6, "0")}`;
}

// GET /orders
router.get("/orders", async (req, res): Promise<void> => {
  const { status } = req.query;
  let rows = (await db.select().from(ordersTable).orderBy(ordersTable.createdAt)).map(normalizeOrder);
  if (status) rows = rows.filter(o => o.orderStatus === status);
  res.json(rows);
});

// GET /orders/stats
router.get("/orders/stats", async (_req, res): Promise<void> => {
  const all = await db.select().from(ordersTable);
  const normalized = all.map(normalizeOrder);
  const realized = normalized.filter(isRevenueRealized);
  res.json({
    totalOrders: normalized.length,
    pendingOrders: normalized.filter(o => !["Delivered", "Cancelled"].includes(o.orderStatus)).length,
    paidOrders: normalized.filter(o => o.paymentStatus === "Paid").length,
    preparingOrders: normalized.filter(o => o.orderStatus === "Preparing").length,
    deliveredOrders: normalized.filter(o => o.orderStatus === "Delivered").length,
    cancelledOrders: normalized.filter(o => o.orderStatus === "Cancelled").length,
    totalRevenue: realized.reduce((sum, o) => sum + o.subtotal, 0),
  });
});

// POST /orders
router.post("/orders", async (req, res): Promise<void> => {
  const { fullName, phone, state, city, address, items, paymentMethod, flutterwaveRef } = req.body;
  if (!fullName || !phone || !state || !city || !address || !items || !paymentMethod) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (!parseOrderItems(items)) {
    res.status(400).json({ error: "Order items must include valid product IDs and quantities" });
    return;
  }
  if (paymentMethod !== "flutterwave" && paymentMethod !== "pay_on_delivery") {
    res.status(400).json({ error: "Invalid payment method" });
    return;
  }

  // Attach userId from HttpOnly cookie if present (preferred over body for security)
  let userId: number | null = null;
  const rawCookieId = req.cookies?.["mimi_user_id"];
  if (rawCookieId) {
    const parsed = parseInt(rawCookieId, 10);
    if (!isNaN(parsed)) userId = parsed;
  }

  const orderRef = await generateOrderRef();
  const subtotal = (items as { totalPrice: number }[]).reduce((sum, item) => sum + item.totalPrice, 0);
  const orderStatus: OrderStatus = "Confirming";
  const paymentStatus: PaymentStatus = paymentMethod === "flutterwave" ? "Paid" : "Payment on delivery";
  const timeline = [{ status: orderStatus, timestamp: new Date().toISOString(), note: null }];

  const [order] = await db.insert(ordersTable).values({
    orderRef,
    fullName, phone, state, city, address,
    items,
    subtotal,
    paymentMethod,
    paymentStatus,
    orderStatus,
    flutterwaveRef: flutterwaveRef ?? null,
    timeline,
    ...(userId !== null ? { userId } : {}),
  }).returning();

  res.status(201).json(normalizeOrder(order));
});

// GET /orders/ref/:orderRef
router.get("/orders/ref/:orderRef", async (req, res): Promise<void> => {
  const orderRef = Array.isArray(req.params.orderRef) ? req.params.orderRef[0] : req.params.orderRef;
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderRef, orderRef));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(normalizeOrder(order));
});

// GET /orders/:id
router.get("/orders/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(normalizeOrder(order));
});

// PATCH /orders/:id
router.patch("/orders/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const { orderStatus, paymentStatus, note } = req.body;

  if (!orderStatus && paymentStatus === undefined) {
    res.status(400).json({ error: "orderStatus or paymentStatus is required" });
    return;
  }
  if (orderStatus && !ORDER_STATUSES.includes(normalizeOrderStatus(orderStatus) as OrderStatus)) {
    res.status(400).json({ error: "Invalid order status" });
    return;
  }
  if (paymentStatus !== undefined && !PAYMENT_STATUSES.includes(normalizePaymentStatus(paymentStatus, "pay_on_delivery") as PaymentStatus)) {
    res.status(400).json({ error: "Invalid payment status" });
    return;
  }

  try {
    const order = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(ordersTable).where(eq(ordersTable.id, id));
      if (!existing) return null;

      const existingOrder = normalizeOrder(existing);
      const timeline = [...existingOrder.timeline];
      const nextOrderStatus = orderStatus ? normalizeOrderStatus(orderStatus) : existingOrder.orderStatus;
      if (orderStatus) {
        timeline.push({ status: nextOrderStatus, timestamp: new Date().toISOString(), note: note ?? null });
      }

      let inventoryAdjusted = existing.inventoryAdjusted;
      if (nextOrderStatus === "Delivered" && !inventoryAdjusted) {
        await adjustInventory(tx, existing.items, -1);
        inventoryAdjusted = true;
      } else if (nextOrderStatus !== "Delivered" && inventoryAdjusted) {
        await adjustInventory(tx, existing.items, 1);
        inventoryAdjusted = false;
      }

      const updates: Record<string, unknown> = { timeline, inventoryAdjusted };
      if (orderStatus) updates.orderStatus = nextOrderStatus;
      if (paymentStatus !== undefined) updates.paymentStatus = normalizePaymentStatus(paymentStatus, existing.paymentMethod);

      const [updated] = await tx.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning();
      return updated;
    });

    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(normalizeOrder(order));
  } catch (error) {
    if (error instanceof InventoryError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    throw error;
  }
});

export default router;
