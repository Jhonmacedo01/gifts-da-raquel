create type public.order_status as enum (
  'received', 'awaiting_approval', 'awaiting_payment', 'approved',
  'in_production', 'ready', 'delivered', 'cancelled'
);
create type public.payment_method as enum ('pix', 'online', 'cash', 'other');
create type public.payment_status as enum ('pending', 'partial', 'paid', 'refunded');
create type public.delivery_method as enum ('pickup', 'shipping');
create type public.stock_movement_type as enum ('in', 'out', 'adjustment', 'reservation', 'release');

create table public.admin_users (
  owner_slot smallint primary key default 1 check (owner_slot = 1),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
comment on table public.admin_users is 'Conta administrativa única da loja; nesta fase, somente Raquel.';

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text not null check (char_length(phone) between 8 and 24),
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status public.order_status not null default 'received',
  quantity integer not null check (quantity between 1 and 500),
  total_amount numeric(10, 2) check (total_amount is null or total_amount >= 0),
  shipping_fee numeric(10, 2) not null default 10 constraint orders_shipping_fee_fixed check (shipping_fee = 10),
  payment_status public.payment_status not null default 'pending',
  payment_method public.payment_method,
  delivery_method public.delivery_method,
  approved_at timestamptz,
  paid_at timestamptz,
  production_due_date date,
  delivery_due_date date,
  customer_message text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (production_due_date is null or (approved_at is not null and paid_at is not null))
);

create table public.order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  object_path text not null unique,
  original_name text not null check (char_length(original_name) <= 255),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic')),
  byte_size bigint not null check (byte_size between 1 and 15728640),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount numeric(10, 2) not null check (amount > 0),
  provider_reference text,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  method public.delivery_method not null,
  recipient_name text,
  address jsonb,
  tracking_code text,
  scheduled_for date,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  check (method <> 'shipping' or address is not null)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 2 and 120),
  unit text not null check (char_length(unit) between 1 and 24),
  quantity_on_hand numeric(12, 3) not null default 0 check (quantity_on_hand >= 0),
  minimum_quantity numeric(12, 3) not null default 0 check (minimum_quantity >= 0),
  updated_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  movement_type public.stock_movement_type not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  reason text not null check (char_length(trim(reason)) between 2 and 240),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.price_tiers (
  id uuid primary key default gen_random_uuid(),
  min_quantity integer not null check (min_quantity between 1 and 500),
  max_quantity integer check (max_quantity is null or max_quantity between min_quantity and 500),
  unit_price numeric(10, 2) not null check (unit_price > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint price_tiers_range_unique unique (min_quantity, max_quantity),
  constraint price_tiers_no_overlap exclude using gist (
    int4range(min_quantity, max_quantity, '[]') with &&
  ) where (is_active)
);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status,
  note text not null check (char_length(trim(note)) between 2 and 500),
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index orders_customer_idx on public.orders(customer_id, created_at desc);
create index orders_status_due_idx on public.orders(status, delivery_due_date);
create index order_photos_order_idx on public.order_photos(order_id);
create index payments_order_idx on public.payments(order_id, created_at desc);
create index stock_movements_material_idx on public.stock_movements(material_id, created_at desc);
create index order_events_order_idx on public.order_events(order_id, created_at desc);

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger materials_set_updated_at before update on public.materials
  for each row execute function public.set_updated_at();

create function public.is_store_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users au where au.user_id = (select auth.uid()));
$$;
revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_photos enable row level security;
alter table public.payments enable row level security;
alter table public.deliveries enable row level security;
alter table public.materials enable row level security;
alter table public.stock_movements enable row level security;
alter table public.price_tiers enable row level security;
alter table public.order_events enable row level security;

-- Administradores podem consultar apenas a própria associação. A lista é bootstrapada
-- pelo SQL Editor usando uma sessão de banco confiável; a aplicação nunca a altera.
create policy "Administrators can read their own membership" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Store admins manage customers" on public.customers for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy "Store admins manage orders" on public.orders for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy "Store admins manage photos" on public.order_photos for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy "Store admins manage payments" on public.payments for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy "Store admins manage deliveries" on public.deliveries for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy "Store admins manage materials" on public.materials for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy "Store admins read stock movements" on public.stock_movements for select to authenticated
  using (public.is_store_admin());
create policy "Store admins record stock movements" on public.stock_movements for insert to authenticated
  with check (public.is_store_admin());
create policy "Store admins manage price tiers" on public.price_tiers for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy "Store admins read order events" on public.order_events for select to authenticated
  using (public.is_store_admin());
create policy "Store admins record order events" on public.order_events for insert to authenticated
  with check (public.is_store_admin());

-- RLS limita linhas; GRANT limita operações disponíveis via Data API.
revoke all on public.admin_users, public.customers, public.orders, public.order_photos,
  public.payments, public.deliveries, public.materials, public.stock_movements,
  public.price_tiers, public.order_events from anon, authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.customers, public.orders, public.order_photos,
  public.payments, public.deliveries, public.materials, public.price_tiers to authenticated;
grant select, insert on public.stock_movements, public.order_events to authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage, select on all sequences in schema public to authenticated;

create function public.create_order_for_admin(
  p_full_name text, p_phone text, p_quantity integer, p_total_amount numeric default null
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_customer_id uuid;
  new_order_number bigint;
begin
  if not public.is_store_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  insert into public.customers (full_name, phone)
  values (trim(p_full_name), trim(p_phone))
  returning id into new_customer_id;

  insert into public.orders (customer_id, quantity, total_amount, status)
  values (new_customer_id, p_quantity, p_total_amount, 'received')
  returning order_number into new_order_number;

  insert into public.order_events (order_id, to_status, note, changed_by)
  select id, 'received', 'Pedido criado pelo painel administrativo.', (select auth.uid())
  from public.orders where order_number = new_order_number;

  return new_order_number;
end;
$$;
revoke all on function public.create_order_for_admin(text, text, integer, numeric) from public, anon;
grant execute on function public.create_order_for_admin(text, text, integer, numeric) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-photos', 'order-photos', false, 15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Store admins manage private order photos" on storage.objects for all to authenticated
  using (bucket_id = 'order-photos' and public.is_store_admin())
  with check (bucket_id = 'order-photos' and public.is_store_admin());


