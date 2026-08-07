export const CATEGORIES = [
  {
    id: 1,
    name: "Home & Living",
    slug: "home-living",
    description: "Luxury home goods and decor",
    image: "https://placehold.co/800x600/D4B483/FAF6F0?text=Home",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    subcategories: [
      { id: 1, categoryId: 1, name: "Bedding", slug: "bedding", createdAt: new Date("2026-01-01T00:00:00.000Z") },
      { id: 2, categoryId: 1, name: "Decor", slug: "decor", createdAt: new Date("2026-01-01T00:00:00.000Z") },
    ],
  },
  {
    id: 2,
    name: "Electronics",
    slug: "electronics",
    description: "Premium electronics and accessories",
    image: "https://placehold.co/800x600/D4B483/FAF6F0?text=Electronics",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    subcategories: [
      { id: 3, categoryId: 2, name: "Audio", slug: "audio", createdAt: new Date("2026-01-02T00:00:00.000Z") },
      { id: 4, categoryId: 2, name: "Accessories", slug: "accessories", createdAt: new Date("2026-01-02T00:00:00.000Z") },
    ],
  },
];
