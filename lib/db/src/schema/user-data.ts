import { jsonb, integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userDataTable = pgTable("user_data", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  cart: jsonb("cart").notNull().default([]),
  wishlist: jsonb("wishlist").notNull().default([]),
  checkout: jsonb("checkout").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserData = typeof userDataTable.$inferSelect;