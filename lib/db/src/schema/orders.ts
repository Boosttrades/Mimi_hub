*** Begin Patch
*** Update File: lib/db/src/schema/orders.ts
@@
-import { pgTable, serial, text, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
+import { pgTable, serial, text, timestamp, doublePrecision, jsonb, integer } from "drizzle-orm/pg-core";
@@
   timeline: jsonb("timeline").notNull().default([]),
-  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
+  // nullable userId to associate orders with a lightweight user account (backwards compatible)
+  userId: integer("user_id").references(() => ({ table: "users", column: "id" })),
+  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
 });
*** End Patch
