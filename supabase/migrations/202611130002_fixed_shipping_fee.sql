-- Frete fixo para pedidos novos. Registros antigos mantêm valor NULL porque
-- não há como inferir se frete foi cobrado antes desta regra comercial.
alter table public.orders add column if not exists shipping_fee numeric(10, 2);
alter table public.orders alter column shipping_fee set default 10;
alter table public.orders alter column shipping_fee drop not null;

alter table public.orders
  drop constraint if exists orders_shipping_fee_fixed;
alter table public.orders
  drop constraint if exists orders_shipping_fee_check;
alter table public.orders
  add constraint orders_shipping_fee_fixed
  check (shipping_fee is null or shipping_fee = 10);
