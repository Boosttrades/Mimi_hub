-- Connect customer profiles to Supabase Auth and make store roles server-enforced.
-- Existing users, orders, carts, and wishlists are preserved.

begin;

alter table public.users
  add column if not exists auth_user_id uuid,
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists role text not null default 'customer';

create unique index if not exists users_auth_user_id_uidx
  on public.users (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists users_email_uidx
  on public.users (lower(email))
  where email is not null;

alter table public.users enable row level security;
alter table public.user_data enable row level security;
alter table public.orders enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;

-- The application server accesses private records through its server-only
-- database connection and Supabase service role. Browser clients may read visible catalog records,
-- but cannot write catalog, order, profile, cart, or settings data directly.
drop policy if exists "MimiiHub public access" on public.categories;
drop policy if exists "MimiiHub public access" on public.subcategories;
drop policy if exists "MimiiHub public access" on public.products;
drop policy if exists "MimiiHub public access" on public.users;
drop policy if exists "MimiiHub public access" on public.user_data;
drop policy if exists "MimiiHub public access" on public.orders;
drop policy if exists "MimiiHub public access" on public.settings;

drop policy if exists "MimiiHub visible catalog read" on public.categories;
create policy "MimiiHub visible catalog read" on public.categories
  for select to anon, authenticated using (visible = true);

drop policy if exists "MimiiHub visible subcategory read" on public.subcategories;
create policy "MimiiHub visible subcategory read" on public.subcategories
  for select to anon, authenticated using (visible = true);

drop policy if exists "MimiiHub visible product read" on public.products;
create policy "MimiiHub visible product read" on public.products
  for select to anon, authenticated using (visible = true);

-- Product photos are public to display in the shop; uploads and changes are
-- performed only by the authenticated application server.
drop policy if exists "MimiiHub product image access" on storage.objects;
drop policy if exists "MimiiHub product image public read" on storage.objects;
create policy "MimiiHub product image public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

commit;
