import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

async function generateOrderRef(): Promise<string> {
  const orders = await db.select().from(ordersTable).orderBy(ordersTable.id);
  const nextNum = orders.length + 1;
  return `MH-${String(nextNum).padStart(6, "0")}`;
}

// GET /orders
router.get("/orders", async (req, res): Promise<void> => {
  const { status } = req.query;
  let rows = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  if (status) rows = rows.filter(o => o.orderStatus === status);
  res.json(rows);
});

// GET /orders/stats
router.get("/orders/stats", async (_req, res): Promise<void> => {
  const all = await db.select().from(ordersTable);
  const paid = all.filter(o => o.paymentStatus === "Paid");
  res.json({
    totalOrders: all.length,
    pendingOrders: all.filter(o => o.orderStatus === "Awaiting Payment").length,
    paidOrders: all.filter(o => o.paymentStatus === "Paid").length,
    preparingOrders: all.filter(o => o.orderStatus === "Preparing").length,
    deliveredOrders: all.filter(o => o.orderStatus === "Delivered").length,
    cancelledOrders: all.filter(o => o.orderStatus === "Cancelled").length,
    totalRevenue: paid.reduce((sum, o) => sum + o.subtotal, 0),
  });
});

// POST /orders
router.post("/orders", async (req, res): Promise<void> => {
  const { fullName, phone, state, city, address, items, paymentMethod, flutterwaveRef } = req.body;
  if (!fullName || !phone || !state || !city || !address || !items || !paymentMethod) {
    res.status(400).json({ error: "Missing required fields" });
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
  const timeline = [{ status: "Awaiting Payment", timestamp: new Date().toISOString(), note: null }];

  const [order] = await db.insert(ordersTable).values({
    orderRef,
    fullName, phone, state, city, address,
    items,
    subtotal,
    paymentMethod,
    paymentStatus: "Awaiting Payment",
    orderStatus: "Awaiting Payment",
    flutterwaveRef: flutterwaveRef ?? null,
    timeline,
    ...(userId !== null ? { userId } : {}),
  }).returning();

  res.status(201).json(order);
});

// GET /orders/ref/:orderRef
router.get("/orders/ref/:orderRef", async (req, res): Promise<void> => {
  const orderRef = Array.isArray(req.params.orderRef) ? req.params.orderRef[0] : req.params.orderRef;
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderRef, orderRef));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(order);
});

// GET /orders/:id
router.get("/orders/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(order);
});

// PATCH /orders/:id
router.patch("/orders/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const { orderStatus, paymentStatus, note } = req.body;

  if (!orderStatus) {
    res.status(400).json({ error: "orderStatus is required" });
    return;
  }

  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

  const timeline = Array.isArray(existing.timeline) ? [...existing.timeline as object[]] : [];
  timeline.push({ status: orderStatus, timestamp: new Date().toISOString(), note: note ?? null });

  const updates: Record<string, unknown> = { orderStatus, timeline };
  if (paymentStatus !== undefined) updates.paymentStatus = paymentStatus;

  const [order] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning();
  res.json(order);
});

export default router;
