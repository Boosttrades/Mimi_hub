# MimiiHub

A premium Nigerian lifestyle e-commerce website selling personal care products and home essentials. Luxury cream and gold aesthetic, mobile-first with bottom navigation.

## Run & Operate

- `pnpm --filter @workspace/mimihub run dev` — run the frontend (preview at `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DATABASE_URL` — Supabase project URL, server-only service-role key, and Postgres connection string
- Optional secret: `SUPABASE_ANON_KEY` — available for future browser-side Supabase features; it is not exposed to the server-rendered app
- Optional env: `VITE_FLUTTERWAVE_PUBLIC_KEY` — Flutterwave public key for payments

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter routing, TanStack Query, shadcn/ui components
- API: Express 5 (artifacts/api-server)
- DB: Supabase PostgreSQL + Drizzle ORM
- Validation: Zod v3, drizzle-zod
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)

## Where things live

- `artifacts/mimihub/src/pages/` — all customer-facing pages
- `artifacts/mimihub/src/pages/admin/` — admin dashboard pages
- `artifacts/mimihub/src/contexts/` — CartContext, WishlistContext (localStorage-backed)
- `artifacts/mimihub/src/components/layout/` — Header, BottomNav
- `artifacts/api-server/src/routes/` — categories, products, orders, settings
- `lib/db/src/schema/` — Drizzle table definitions
- `lib/api-spec/openapi.yaml` — single source of truth for API contracts

## Architecture decisions

- Cart and Wishlist are purely client-side (localStorage) — no auth required
- Checkout progress is saved to localStorage so users can resume
- Orders use IDs like MH-000001, generated server-side
- Settings (store, homepage, payment) stored as JSON blobs in a single `settings` table
- Featured products are capped at 8 (enforced in admin UI)
- Orval generates `zod.int()` for integer types but the workspace uses Zod v3; after each codegen run, patch the generated file: `sed -i 's/zod\.int()/zod.number()/g' lib/api-zod/src/generated/api.ts`

## Product

MimiiHub is a premium Nigerian lifestyle store. Customers can:
- Browse products by category and subcategory
- Add to cart, wishlist, and checkout
- Pay via Flutterwave or Pay on Delivery
- Track orders by reference number (MH-000001)

Admins can manage products, categories, orders, homepage content, payment settings, and store settings via `/admin`.

## User preferences

- Cream and gold luxury theme (#FAF6F0 background, #C9A84C gold)
- No newsletter/subscribe sections
- Prices in Nigerian Naira (₦)
- Mobile-first with bottom navigation
- No emojis in the UI

## Gotchas

- After any OpenAPI spec change, run codegen AND then patch: `sed -i 's/zod\.int()/zod.number()/g' lib/api-zod/src/generated/api.ts && pnpm run typecheck:libs`
- The `cn` utility must be in `src/lib/utils.ts` and exported — the design subagent historically overwrites this file without the proper export
- Admin route is at `/admin` — no authentication currently (add admin authentication as a future enhancement)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Product images upload to the public `product-images` Supabase Storage bucket through `POST /api/storage/upload`
- Flutterwave integration is scaffolded but needs VITE_FLUTTERWAVE_PUBLIC_KEY env var and backend webhook handling
