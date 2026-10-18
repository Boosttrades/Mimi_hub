-- Support phone-first customer accounts with optional email contact details.
begin;

alter table public.users
  alter column email drop not null,
  add column if not exists phone text;

create unique index if not exists users_phone_uidx
  on public.users (phone)
  where phone is not null;

commit;
