-- Preorders for পছন্দ. Run after 06_admin.sql.
--
-- Most pieces here are brought in from abroad after a customer commits, so
-- refusing an order because stock is zero is backwards. A piece marked
-- is_preorder sells without a stock limit and its stock is left alone;
-- anything actually held on a shelf keeps the oversell protection.

alter table public.pieces
  add column if not exists is_preorder boolean not null default false;

create or replace function public.place_order(
  p_customer text,
  p_phone    text,
  p_address  text default '',
  p_note     text default '',
  p_items    jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_basket   jsonb;
  v_total    integer;
  v_wanted   integer;
  v_short    text;
begin
  p_customer := trim(coalesce(p_customer, ''));
  p_phone    := trim(coalesce(p_phone, ''));
  p_address  := trim(coalesce(p_address, ''));
  p_note     := trim(coalesce(p_note, ''));

  if length(p_customer) = 0 then
    raise exception 'A name is required' using errcode = '22023';
  end if;
  if length(p_phone) < 5 then
    raise exception 'A usable phone number is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Items must be a list' using errcode = '22023';
  end if;

  with req as (
    select trim(e->>'slug') as slug,
           greatest(1, least(20, coalesce((e->>'quantity')::integer, 1))) as quantity
    from jsonb_array_elements(p_items) e
    where coalesce(trim(e->>'slug'), '') <> ''
  ),
  grouped as (
    select slug, least(20, sum(quantity))::integer as quantity
    from req group by slug
  )
  select count(*)::integer,
         jsonb_agg(jsonb_build_object(
           'piece_id', p.id, 'name', p.name,
           'price', p.price, 'quantity', g.quantity))
    into v_wanted, v_basket
  from grouped g
  join public.pieces p on p.slug = g.slug and p.is_listed = true;

  if coalesce(v_wanted, 0) = 0 then
    raise exception 'The basket is empty' using errcode = '22023';
  end if;
  if v_wanted > 20 then
    raise exception 'Too many different pieces in one order' using errcode = '22023';
  end if;

  perform 1
  from public.pieces
  where id in (select (e->>'piece_id')::uuid from jsonb_array_elements(v_basket) e)
  order by id
  for update;

  -- Stock only constrains pieces that are not preorders.
  select string_agg(p.name || ' (' || p.stock || ' left)', ', ')
    into v_short
  from jsonb_array_elements(v_basket) e
  join public.pieces p on p.id = (e->>'piece_id')::uuid
  where p.is_preorder = false
    and p.stock < (e->>'quantity')::integer;

  if v_short is not null then
    raise exception 'Not enough stock: %', v_short using errcode = '22023';
  end if;

  select sum((e->>'price')::integer * (e->>'quantity')::integer)
    into v_total
  from jsonb_array_elements(v_basket) e;

  insert into public.orders (customer, phone, address, note, total)
  values (p_customer, p_phone, left(p_address, 500), left(p_note, 1000), v_total)
  returning id into v_order_id;

  insert into public.order_items (order_id, piece_id, piece_name, unit_price, quantity)
  select v_order_id,
         (e->>'piece_id')::uuid,
         e->>'name',
         (e->>'price')::integer,
         (e->>'quantity')::integer
  from jsonb_array_elements(v_basket) e;

  -- Preorder pieces are brought in per order, so their stock is untouched.
  update public.pieces p
     set stock = p.stock - b.quantity
    from (
      select (e->>'piece_id')::uuid as piece_id,
             (e->>'quantity')::integer as quantity
      from jsonb_array_elements(v_basket) e
    ) b
   where p.id = b.piece_id
     and p.is_preorder = false;

  return jsonb_build_object('order_id', v_order_id, 'total', v_total);
end;
$$;

revoke all on function public.place_order(text, text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, text, jsonb) to anon, authenticated;
