import { Router, type IRouter } from "express";
import { eq, and, ilike, or } from "drizzle-orm";
import { db, productsTable, categoriesTable, subcategoriesTable } from "@workspace/db";
import { ensureCategoriesSeeded } from "./categories";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

function toBoolean(val: unknown): boolean | undefined {
  if (val === "true" || val === true) return true;
  if (val === "false" || val === false) return false;
  return undefined;
}

async function enrichProduct(product: typeof productsTable.$inferSelect) {
  const discountedPrice = product.discountPct
    ? product.price * (1 - product.discountPct / 100)
    : null;

  let category = null;
  let subcategory = null;

  if (product.categoryId) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId));
    if (cat) category = { ...cat, subcategories: [] };
  }
  if (product.subcategoryId) {
    const [sub] = await db.select().from(subcategoriesTable).where(eq(subcategoriesTable.id, product.subcategoryId));
    if (sub) subcategory = sub;
  }

  return {
    ...product,
    discountedPrice: discountedPrice ? Math.round(discountedPrice) : null,
    coverImage: product.coverImage ?? (product.images[0] ?? null),
    category,
    subcategory,
    specs: product.specs ?? {},
  };
}

// GET /products
router.get("/products", async (req, res): Promise<void> => {
  const { categoryId, subcategoryId, featured, newArrival, bestSeller, search, visible } = req.query;

  let rows = await db.select().from(productsTable).orderBy(productsTable.createdAt);

  if (categoryId !== undefined) rows = rows.filter(p => p.categoryId === parseInt(categoryId as string, 10));
  if (subcategoryId !== undefined) rows = rows.filter(p => p.subcategoryId === parseInt(subcategoryId as string, 10));
  if (featured !== undefined) rows = rows.filter(p => p.featured === (featured === "true"));
  if (newArrival !== undefined) rows = rows.filter(p => p.newArrival === (newArrival === "true"));
  if (bestSeller !== undefined) rows = rows.filter(p => p.bestSeller === (bestSeller === "true"));
  if (visible !== undefined) rows = rows.filter(p => p.visible === (visible === "true"));
  if (search) {
    const q = (search as string).toLowerCase();
    rows = rows.filter(p => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
  }

  const result = await Promise.all(rows.map(enrichProduct));
  res.json(result);
});

// GET /products/summary
router.get("/products/summary", async (_req, res): Promise<void> => {
  const all = await db.select().from(productsTable);
  res.json({
    total: all.length,
    visible: all.filter(p => p.visible).length,
    hidden: all.filter(p => !p.visible).length,
    featured: all.filter(p => p.featured).length,
    newArrivals: all.filter(p => p.newArrival).length,
    bestSellers: all.filter(p => p.bestSeller).length,
    outOfStock: all.filter(p => !p.inStock).length,
  });
});

// POST /products
router.post("/products", async (req, res): Promise<void> => {
  const {
    name, slug, description, price, discountPct, images, coverImage,
    categoryId, subcategoryId, stockQty, inStock, visible,
    featured, newArrival, bestSeller, specs
  } = req.body;

  if (!name || !slug || price === undefined || !images) {
    res.status(400).json({ error: "name, slug, price, and images are required" });
    return;
  }

  await ensureCategoriesSeeded();

  const [product] = await db.insert(productsTable).values({
    name, slug, description, price: Number(price),
    discountPct: discountPct !== undefined ? Number(discountPct) : null,
    images: Array.isArray(images) ? images : [images],
    coverImage: coverImage ?? null,
    categoryId: categoryId ? Number(categoryId) : null,
    subcategoryId: subcategoryId ? Number(subcategoryId) : null,
    stockQty: stockQty !== undefined ? Number(stockQty) : 0,
    inStock: inStock !== undefined ? Boolean(inStock) : true,
    visible: visible !== undefined ? Boolean(visible) : true,
    featured: featured !== undefined ? Boolean(featured) : false,
    newArrival: newArrival !== undefined ? Boolean(newArrival) : false,
    bestSeller: bestSeller !== undefined ? Boolean(bestSeller) : false,
    specs: specs ?? {},
  }).returning();

  res.status(201).json(await enrichProduct(product));
});

// GET /products/:id
router.get("/products/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(await enrichProduct(product));
});

// PATCH /products/:id
router.patch("/products/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const body = req.body;

  const updates: Record<string, unknown> = {};
  const fields = [
    "name", "slug", "description", "price", "discountPct", "images",
    "coverImage", "categoryId", "subcategoryId", "stockQty", "inStock",
    "visible", "featured", "newArrival", "bestSeller", "specs"
  ];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  // Ensure numeric fields are numbers
  if (updates.price !== undefined) updates.price = Number(updates.price);
  if (updates.discountPct !== undefined) updates.discountPct = updates.discountPct === null ? null : Number(updates.discountPct);
  if (updates.stockQty !== undefined) updates.stockQty = Number(updates.stockQty);
  if (updates.categoryId !== undefined) updates.categoryId = updates.categoryId === null ? null : Number(updates.categoryId);
  if (updates.subcategoryId !== undefined) updates.subcategoryId = updates.subcategoryId === null ? null : Number(updates.subcategoryId);

  const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(await enrichProduct(product));
});

// DELETE /products/:id
router.delete("/products/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const [product] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.sendStatus(204);
});

// GET /products/:id/related
router.get("/products/:id/related", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  let related = await db.select().from(productsTable).where(
    and(eq(productsTable.visible, true))
  );
  related = related.filter(p => p.id !== id);
  if (product.categoryId) {
    const sameCat = related.filter(p => p.categoryId === product.categoryId);
    if (sameCat.length >= 4) related = sameCat;
  }
  related = related.slice(0, 8);
  const result = await Promise.all(related.map(enrichProduct));
  res.json(result);
});

export default router;
