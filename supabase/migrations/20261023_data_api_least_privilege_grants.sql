-- Tighten direct Supabase Data API grants for the existing MimiHub schema.
-- The application server performs database operations; direct browser Data API
-- access is only needed for reading the visible product catalogue.
--
-- Apply only after confirming the application server remains the sole path for
-- private records and after testing the app's catalogue reads. This migration
-- does not change Supabase Data API exposed-schema/table settings.

begin;

revoke all privileges on table
  public.categories,
  public.subcategories,
  public.products,
  public.users,
  public.user_data,
  public.orders,
  public.settings
from anon, authenticated;

grant select on table
  public.categories,
  public.subcategories,
  public.products
to anon, authenticated;

revoke all privileges on all sequences in schema public
from anon, authenticated;

commit;
