import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, ordersTable } from "@workspace/db";

const router: IRouter = Router();

const COOKIE_NAME = "mimi_user_id";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

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
  const rawId = req.cookies?.[COOKIE_NAME];

  if (!rawId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(401).json({ error: "Invalid session" });
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

// GET /users/:id/orders — return orders for the authenticated user only
// The session cookie is the sole authority; the path :id must match it.
router.get("/users/:id/orders", async (req, res): Promise<void> => {
  // Resolve and verify session from cookie
  const rawCookieId = req.cookies?.[COOKIE_NAME];
  if (!rawCookieId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const sessionUserId = parseInt(rawCookieId, 10);
  if (isNaN(sessionUserId)) {
    res.status(401).json({ error: "Invalid session" });
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
