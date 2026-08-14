-- Track whether an order has already changed product inventory.
-- Inventory is deducted only when an order becomes Delivered.
alter table public.orders
  add column if not exists inventory_adjusted boolean not null default false;