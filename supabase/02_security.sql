-- Row level security. Run after 01_schema.sql.
--
-- Shape of the rules:
--   pieces       public may read listed rows, nothing else
--   orders       no public access at all, not even insert
--   order_items  no public access at all
--
-- Orders are written ONLY through place_order() below, which runs as the
-- table owner. That is deliberate: if the browser could insert rows itself
-- it could invent its own prices and stock levels.

alter table public.pieces      enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- pieces: read-only, and only what is listed
drop policy if exists pieces_public_read on public.pieces;
create policy pieces_public_read
  on public.pieces for select
  to anon, authenticated
  using (is_listed = true);

-- orders / order_items: no policies at all, so RLS denies everything.
-- Your own access goes through the dashboard, which uses the service key.

revoke all on public.orders      from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.pieces      from anon, authenticated;
grant select on public.pieces    to anon, authenticated;
