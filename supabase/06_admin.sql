-- Admin access for পছন্দ. Run after 05_storage.sql.
--
-- The published anon key stays read-only. Admin powers come from a logged-in
-- account listed in public.admins, never from anything shipped in the page.
--
-- Signing up does not make anyone an admin: a new account is merely
-- "authenticated", and every policy below also demands is_admin().

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Security definer so the check itself is not blocked by this table's RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists admins_self_read on public.admins;
create policy admins_self_read
  on public.admins for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.admins to authenticated;

-- ---------------------------------------------------------------- pieces
-- Table privileges are granted to every logged-in user; the policy is what
-- actually restricts writes to admins.
grant select, insert, update, delete on public.pieces to authenticated;

drop policy if exists pieces_admin_write on public.pieces;
create policy pieces_admin_write
  on public.pieces for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- orders
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;

drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read
  on public.orders for select
  to authenticated
  using (public.is_admin());

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists order_items_admin_read on public.order_items;
create policy order_items_admin_read
  on public.order_items for select
  to authenticated
  using (public.is_admin());

-- --------------------------------------------------------------- photos
-- The bucket is public to read. Only an admin may add or remove a file.
drop policy if exists photos_admin_insert on storage.objects;
create policy photos_admin_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and public.is_admin());

drop policy if exists photos_admin_update on storage.objects;
create policy photos_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos' and public.is_admin())
  with check (bucket_id = 'photos' and public.is_admin());

drop policy if exists photos_admin_delete on storage.objects;
create policy photos_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and public.is_admin());
