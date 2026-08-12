import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable, subcategoriesTable } from "@workspace/db";

// Static categories (hardcoded) — permanent source of truth when present
import { CATEGORIES } from "../static/categories";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

export async function ensureCategoriesSeeded() {
  const existing = await db.select().from(categoriesTable).limit(1);
  if (existing.length) return;

  await db.transaction(async (tx) => {
    for (const category of CATEGORIES) {
      const [insertedCategory] = await tx
        .insert(categoriesTable)
        .values({
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
          createdAt: category.createdAt,
        })
        .onConflictDoNothing({ target: categoriesTable.slug })
        .returning();

      const categoryRow =
        insertedCategory ??
        (await tx
          .select()
          .from(categoriesTable)
          .where(eq(categoriesTable.slug, category.slug))
          .limit(1))[0];

      if (!categoryRow) continue;

      for (const subcategory of category.subcategories) {
        await tx.insert(subcategoriesTable).values({
          categoryId: categoryRow.id,
          name: subcategory.name,
          slug: subcategory.slug,
          createdAt: subcategory.createdAt,
        });
      }
    }
  });
}

async function getCategoryWithSubsFromDb(id: number) {
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!cat) return null;
  const subs = await db.select().from(subcategoriesTable).where(eq(subcategoriesTable.categoryId, id));
  return { ...cat, subcategories: subs };
}

function getCategoryWithSubsFromStatic(id: number) {
  const cat = CATEGORIES.find(c => c.id === id);
  return cat ?? null;
}

// GET /categories
router.get("/categories", async (_req, res): Promise<void> => {
  await ensureCategoriesSeeded();

  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.createdAt);
  const result = await Promise.all(cats.map(async (cat) => {
    const subs = await db.select().from(subcategoriesTable).where(eq(subcategoriesTable.categoryId, cat.id));
    return { ...cat, subcategories: subs };
  }));
  res.json(result);
});

// POST /categories
router.post("/categories", async (req, res): Promise<void> => {
  const { name, slug, description, image } = req.body;
  if (!name || !slug) {
    res.status(400).json({ error: "name and slug are required" });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values({ name, slug, description, image }).returning();
  res.status(201).json({ ...cat, subcategories: [] });
});

// GET /categories/:id
router.get("/categories/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  await ensureCategoriesSeeded();

  const cat = await getCategoryWithSubsFromDb(id);
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  res.json(cat);
});

// PATCH /categories/:id
router.patch("/categories/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const { name, slug, description, image } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (description !== undefined) updates.description = description;
  if (image !== undefined) updates.image = image;
  const [cat] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  const result = await getCategoryWithSubsFromDb(id);
  res.json(result);
});

// DELETE /categories/:id
router.delete("/categories/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const [cat] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  res.sendStatus(204);
});

// POST /categories/:categoryId/subcategories
router.post("/categories/:categoryId/subcategories", async (req, res): Promise<void> => {
  const categoryId = parseId(req.params.categoryId);
  const { name, slug } = req.body;
  if (!name || !slug) {
    res.status(400).json({ error: "name and slug are required" });
    return;
  }
  const [sub] = await db.insert(subcategoriesTable).values({ categoryId, name, slug }).returning();
  res.status(201).json(sub);
});

// PATCH /subcategories/:id
router.patch("/subcategories/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const { name, slug } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  const [sub] = await db.update(subcategoriesTable).set(updates).where(eq(subcategoriesTable.id, id)).returning();
  if (!sub) { res.status(404).json({ error: "Subcategory not found" }); return; }
  res.json(sub);
});

// DELETE /subcategories/:id
router.delete("/subcategories/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const [sub] = await db.delete(subcategoriesTable).where(eq(subcategoriesTable.id, id)).returning();
  if (!sub) { res.status(404).json({ error: "Subcategory not found" }); return; }
  res.sendStatus(204);
});

// DEBUG endpoint: GET /_debug/categories
// Returns whether static mode is active and what the server is serving
router.get("/_debug/categories", async (_req, res): Promise<void> => {
  await ensureCategoriesSeeded();
  const cats = await db.select().from(categoriesTable);
  res.json({ staticMode: false, dbCount: cats.length });
});

export default router;
