-- Registros anteriores à regra fixa podem não ter um frete conhecido.
-- O DEFAULT continua preenchendo R$ 10,00 nos novos pedidos.
alter table public.orders
  alter column shipping_fee drop not null;

alter table public.orders
  drop constraint if exists orders_shipping_fee_fixed;
alter table public.orders
  drop constraint if exists orders_shipping_fee_check;
alter table public.orders
  add constraint orders_shipping_fee_fixed
  check (shipping_fee is null or shipping_fee = 10);
