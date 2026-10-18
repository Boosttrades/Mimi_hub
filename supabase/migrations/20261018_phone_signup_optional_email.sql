-- Email remains required for authentication; phone is optional profile information.
begin;

alter table public.users
  add column if not exists phone text;

create index if not exists users_phone_idx
  on public.users (phone)
  where phone is not null;

commit;
