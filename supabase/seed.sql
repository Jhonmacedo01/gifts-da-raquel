insert into public.price_tiers (min_quantity, max_quantity, unit_price)
values
  (1, 1, 15.00),
  (6, 24, 12.00),
  (25, 25, 10.00),
  (50, 50, 9.00),
  (100, 100, 8.00)
on conflict (min_quantity, max_quantity) do nothing;
