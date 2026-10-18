-- Email remains the required login; phone is optional contact information.
begin;

alter table public.users
  alter column email drop not null,
  add column if not exists phone text;

create index if not exists users_phone_idx
  on public.users (phone)
  where phone is not null;

commit;
