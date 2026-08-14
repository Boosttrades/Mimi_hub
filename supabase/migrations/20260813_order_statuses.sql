-- Keep fulfilment progress separate from payment state.
-- This migration is safe to run after the original MimiiHub schema migration.

update public.orders
set order_status = case
  when order_status in ('Awaiting Payment', 'Paid') then 'Confirming'
  when order_status in ('Ready for Shipping', 'Shipped') then 'Shipping'
  else order_status
end
where order_status in ('Awaiting Payment', 'Paid', 'Ready for Shipping', 'Shipped');

update public.orders
set payment_status = case
  when lower(payment_method) = 'flutterwave' then 'Paid'
  else 'Payment on delivery'
end
where payment_status = 'Awaiting Payment';

update public.orders
set timeline = (
  select coalesce(
    jsonb_agg(
      case
        when entry->>'status' in ('Awaiting Payment', 'Paid')
          then jsonb_set(entry, '{status}', to_jsonb('Confirming'::text))
        when entry->>'status' in ('Ready for Shipping', 'Shipped')
          then jsonb_set(entry, '{status}', to_jsonb('Shipping'::text))
        else entry
      end
      order by ordinal
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(timeline) with ordinality as items(entry, ordinal)
)
where timeline is not null;

alter table public.orders
  alter column payment_status set default 'Payment on delivery',
  alter column order_status set default 'Confirming';