export const CATEGORIES = [
  {
    id: 1,
    name: "Personal Care",
    slug: "personal-care",
    description: "Premium personal care and wellness products",
    image: "https://placehold.co/800x600/D4B483/FAF6F0?text=Personal+Care",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    subcategories: [
      { id: 1, categoryId: 1, name: "Perfumes", slug: "perfumes", createdAt: new Date("2026-01-01T00:00:00.000Z") },
      { id: 2, categoryId: 1, name: "Feminine Wash", slug: "feminine-wash", createdAt: new Date("2026-01-01T00:00:00.000Z") },
      { id: 3, categoryId: 1, name: "Creams", slug: "creams", createdAt: new Date("2026-01-01T00:00:00.000Z") },
      { id: 4, categoryId: 1, name: "Wellness Products", slug: "wellness-products", createdAt: new Date("2026-01-01T00:00:00.000Z") },
      { id: 5, categoryId: 1, name: "Toothpaste", slug: "toothpaste", createdAt: new Date("2026-01-01T00:00:00.000Z") },
      { id: 6, categoryId: 1, name: "Body Oils", slug: "body-oils", createdAt: new Date("2026-01-01T00:00:00.000Z") },
    ],
  },
  {
    id: 2,
    name: "Home Essentials",
    slug: "home-essentials",
    description: "Premium essentials for a beautiful and comfortable home",
    image: "https://placehold.co/800x600/C4A47C/FAF6F0?text=Home+Essentials",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    subcategories: [
      { id: 7, categoryId: 2, name: "Curtains", slug: "curtains", createdAt: new Date("2026-01-02T00:00:00.000Z") },
      { id: 8, categoryId: 2, name: "Bedsheets and Duvets", slug: "bedsheets-and-duvets", createdAt: new Date("2026-01-02T00:00:00.000Z") },
      { id: 9, categoryId: 2, name: "Rugs", slug: "rugs", createdAt: new Date("2026-01-02T00:00:00.000Z") },
      { id: 10, categoryId: 2, name: "Poles and Hanger", slug: "poles-and-hanger", createdAt: new Date("2026-01-02T00:00:00.000Z") },
    ],
  },
];
