-- পছন্দ — catalogue, orders and stock
-- Run this in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------- pieces
create table if not exists public.pieces (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  price       integer not null check (price >= 0),   -- whole taka
  shape       text not null default 'mug'
              check (shape in ('mug','bowl','vase','plates','jug','tumbler')),
  description text not null default '',
  size        text not null default '',
  holds       text not null default '',
  glaze       text not null default '',
  care        text not null default '',
  photos      text[] not null default '{}',
  stock       integer not null default 0 check (stock >= 0),
  is_listed   boolean not null default true,         -- hide without deleting
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists pieces_listed_idx on public.pieces (is_listed, sort_order);

-- ---------------------------------------------------------------- orders
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  customer     text not null check (length(trim(customer)) between 1 and 120),
  phone        text not null check (length(trim(phone))    between 5 and 30),
  address      text not null default '' check (length(address) <= 500),
  note         text not null default '' check (length(note)    <= 1000),
  total        integer not null default 0 check (total >= 0),
  status       text not null default 'new'
               check (status in ('new','confirmed','shipped','done','cancelled'))
);

create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  piece_id   uuid not null references public.pieces (id),
  piece_name text not null,                          -- snapshot: name may change later
  unit_price integer not null check (unit_price >= 0),
  quantity   integer not null check (quantity between 1 and 20)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ------------------------------------------------------------ updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pieces_touch_updated_at on public.pieces;
create trigger pieces_touch_updated_at
  before update on public.pieces
  for each row execute function public.touch_updated_at();
