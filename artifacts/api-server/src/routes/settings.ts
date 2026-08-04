import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";

const router: IRouter = Router();

async function getSetting(key: string): Promise<unknown> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function upsertSetting(key: string, value: unknown): Promise<unknown> {
  const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (existing.length > 0) {
    const [row] = await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key)).returning();
    return row.value;
  } else {
    const [row] = await db.insert(settingsTable).values({ key, value }).returning();
    return row.value;
  }
}

const DEFAULT_STORE: unknown = {
  storeName: "MimiiHub",
  logo: null,
  contactPhone: null,
  whatsapp: null,
  email: "hello@mimihub.com",
  socialLinks: { instagram: null, facebook: null, twitter: null, tiktok: null },
  deliverySettings: { freeDeliveryThreshold: null, deliveryFee: 0, deliveryNote: null },
};

const DEFAULT_HOMEPAGE: unknown = {
  heroBanners: [
    {
      id: "banner1",
      title: "Luxury Fragrances",
      subtitle: "Discover our curated collection of premium perfumes and body oils",
      image: "https://placehold.co/800x400/D4B483/FAF6F0?text=Luxury+Fragrances",
      buttonText: "Shop Now",
      buttonLink: "/category/personal-care",
    },
    {
      id: "banner2",
      title: "Home Essentials",
      subtitle: "Transform your living space with our premium home collection",
      image: "https://placehold.co/800x400/C4A47C/FAF6F0?text=Home+Essentials",
      buttonText: "Shop Now",
      buttonLink: "/category/home-essentials",
    },
  ],
  trustItems: [
    { id: "trust1", title: "Premium Quality", subtitle: "Carefully Selected", icon: "star" },
    { id: "trust2", title: "Nationwide Delivery", subtitle: "Available Across Nigeria", icon: "truck" },
    { id: "trust3", title: "Secure Checkout", subtitle: "Safe & Trusted Payments", icon: "shield" },
    { id: "trust4", title: "Customer Support", subtitle: "We're Here to Help", icon: "headphones" },
  ],
  featuredCollections: [
    {
      id: "col1",
      title: "Personal Care",
      description: "Perfumes, body oils, creams, feminine wash, toothpaste, wellness products and more.",
      image: "https://placehold.co/600x300/D4B483/FAF6F0?text=Personal+Care",
      link: "/category/personal-care",
    },
    {
      id: "col2",
      title: "Home Essentials",
      description: "Curtains, poles, rugs, bedsheets, duvets and more for your home.",
      image: "https://placehold.co/600x300/C4A47C/FAF6F0?text=Home+Essentials",
      link: "/category/home-essentials",
    },
  ],
};

const DEFAULT_PAYMENT: unknown = {
  flutterwaveEnabled: false,
  payOnDeliveryEnabled: true,
  flutterwavePublicKey: null,
};

// GET /settings/store
router.get("/settings/store", async (_req, res): Promise<void> => {
  const val = await getSetting("store");
  res.json(val ?? DEFAULT_STORE);
});

// PATCH /settings/store
router.patch("/settings/store", async (req, res): Promise<void> => {
  const existing = (await getSetting("store") as Record<string, unknown>) ?? DEFAULT_STORE as Record<string, unknown>;
  const updated = { ...(existing as object), ...req.body };
  await upsertSetting("store", updated);
  res.json(updated);
});

// GET /settings/homepage
router.get("/settings/homepage", async (_req, res): Promise<void> => {
  const val = await getSetting("homepage");
  res.json(val ?? DEFAULT_HOMEPAGE);
});

// PATCH /settings/homepage
router.patch("/settings/homepage", async (req, res): Promise<void> => {
  const existing = (await getSetting("homepage") as Record<string, unknown>) ?? DEFAULT_HOMEPAGE as Record<string, unknown>;
  const updated = { ...(existing as object), ...req.body };
  await upsertSetting("homepage", updated);
  res.json(updated);
});

// GET /settings/payment
router.get("/settings/payment", async (_req, res): Promise<void> => {
  const val = await getSetting("payment");
  res.json(val ?? DEFAULT_PAYMENT);
});

// PATCH /settings/payment
router.patch("/settings/payment", async (req, res): Promise<void> => {
  const existing = (await getSetting("payment") as Record<string, unknown>) ?? DEFAULT_PAYMENT as Record<string, unknown>;
  const updated = { ...(existing as object), ...req.body };
  await upsertSetting("payment", updated);
  res.json(updated);
});

export default router;
