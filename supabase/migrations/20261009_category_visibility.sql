-- Add per-category and per-subcategory storefront visibility controls.
-- Existing rows remain visible; these statements are safe to run repeatedly.
alter table public.categories
  add column if not exists visible boolean not null default true;

alter table public.subcategories
  add column if not exists visible boolean not null default true;
