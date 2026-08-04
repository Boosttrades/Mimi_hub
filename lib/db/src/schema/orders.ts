import { pgTable, serial, text, timestamp, doublePrecision, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderRef: text("order_ref").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  state: text("state").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  items: jsonb("items").notNull().default([]),
  subtotal: doublePrecision("subtotal").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull().default("Awaiting Payment"),
  orderStatus: text("order_status").notNull().default("Awaiting Payment"),
  flutterwaveRef: text("flutterwave_ref"),
  timeline: jsonb("timeline").notNull().default([]),
  // nullable userId to associate orders with a lightweight user account (backwards compatible)
  userId: integer("user_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
