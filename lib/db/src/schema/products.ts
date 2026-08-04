import { pgTable, serial, text, timestamp, boolean, doublePrecision, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable, subcategoriesTable } from "./categories";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  discountPct: doublePrecision("discount_pct"),
  images: text("images").array().notNull().default([]),
  coverImage: text("cover_image"),
  categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  subcategoryId: integer("subcategory_id").references(() => subcategoriesTable.id, { onDelete: "set null" }),
  stockQty: integer("stock_qty").notNull().default(0),
  inStock: boolean("in_stock").notNull().default(true),
  visible: boolean("visible").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  newArrival: boolean("new_arrival").notNull().default(false),
  bestSeller: boolean("best_seller").notNull().default(false),
  specs: jsonb("specs").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
