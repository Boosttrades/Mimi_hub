import { Router, type IRouter } from "express";
import { db, ordersTable, productsTable } from "@workspace/db";

const router: IRouter = Router();
const LOW_STOCK_THRESHOLD = 10;

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function startOfCurrentMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// GET /admin/summary
// This is intentionally an aggregation of the same catalog and order data
// used by the storefront. It does not seed or invent dashboard records.
router.get("/admin/summary", async (_req, res): Promise<void> => {
  const [orders, products] = await Promise.all([
    db.select().from(ordersTable),
    db.select().from(productsTable),
  ]);

  const now = new Date();
  const monthStart = startOfCurrentMonth(now);
  const paidOrders = orders.filter((order) => order.paymentStatus === "Paid");
  const currentMonthOrders = orders.filter((order) => asDate(order.createdAt) >= monthStart);
  const currentMonthPaidOrders = currentMonthOrders.filter((order) => order.paymentStatus === "Paid");

  const customerMap = new Map<string, {
    id: string;
    name: string;
    phone: string;
    location: string;
    orders: number;
    spend: number;
    firstOrderAt: Date;
    lastOrderAt: Date;
  }>();

  for (const order of orders) {
    const key = order.userId !== null
      ? `user:${order.userId}`
      : `phone:${order.phone.trim().replace(/\s+/g, "").toLowerCase()}`;
    const orderDate = asDate(order.createdAt);
    const existing = customerMap.get(key);
    const paidSpend = order.paymentStatus === "Paid" ? order.subtotal : 0;

    if (!existing) {
      customerMap.set(key, {
        id: key,
        name: order.fullName,
        phone: order.phone,
        location: `${order.city}, ${order.state}`,
        orders: 1,
        spend: paidSpend,
        firstOrderAt: orderDate,
        lastOrderAt: orderDate,
      });
      continue;
    }

    existing.orders += 1;
    existing.spend += paidSpend;
    if (orderDate < existing.firstOrderAt) existing.firstOrderAt = orderDate;
    if (orderDate > existing.lastOrderAt) {
      existing.lastOrderAt = orderDate;
      existing.name = order.fullName;
      existing.phone = order.phone;
      existing.location = `${order.city}, ${order.state}`;
    }
  }

  const customers = [...customerMap.values()]
    .sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime())
    .map((customer) => ({
      ...customer,
      returning: customer.orders > 1,
    }));

  res.json({
    totalRevenue: paidOrders.reduce((sum, order) => sum + order.subtotal, 0),
    thisMonthRevenue: currentMonthPaidOrders.reduce((sum, order) => sum + order.subtotal, 0),
    totalOrders: orders.length,
    thisMonthOrders: currentMonthOrders.length,
    pendingOrders: orders.filter((order) => !["Delivered", "Cancelled"].includes(order.orderStatus)).length,
    paidOrders: paidOrders.length,
    preparingOrders: orders.filter((order) => order.orderStatus === "Preparing").length,
    deliveredOrders: orders.filter((order) => order.orderStatus === "Delivered").length,
    cancelledOrders: orders.filter((order) => order.orderStatus === "Cancelled").length,
    totalProducts: products.length,
    visibleProducts: products.filter((product) => product.visible).length,
    hiddenProducts: products.filter((product) => !product.visible).length,
    lowStockProducts: products.filter((product) => product.inStock && (product.stockQty ?? 0) < LOW_STOCK_THRESHOLD).length,
    outOfStockProducts: products.filter((product) => !product.inStock || (product.stockQty ?? 0) <= 0).length,
    totalCustomers: customers.length,
    returningCustomers: customers.filter((customer) => customer.returning).length,
    customers,
  });
});

export default router;