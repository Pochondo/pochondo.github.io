-- place_order(): the only way the public can write an order.
-- Run after 02_security.sql.
--
-- Why a function rather than a plain insert:
--   * prices are read from the pieces table, never taken from the browser
--   * stock is checked and decremented inside one transaction, so two people
--     buying the last mug cannot both succeed
--   * rows are locked in id order, which keeps concurrent orders from deadlocking
--
-- p_items shape: [{"slug": "everyday-mug", "quantity": 2}, ...]

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
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_total    integer := 0;
  v_count    integer;
  v_item     record;
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

  select count(*) into v_count from jsonb_array_elements(p_items);
  if v_count = 0 then
    raise exception 'The basket is empty' using errcode = '22023';
  end if;
  if v_count > 20 then
    raise exception 'Too many different pieces in one order' using errcode = '22023';
  end if;

  create temporary table if not exists _basket (
    piece_id uuid, name text, price integer, quantity integer
  ) on commit drop;

  insert into _basket (piece_id, name, price, quantity)
  select p.id, p.name, p.price, gr.quantity
  from (
    select (e->>'slug')::text as slug,
           greatest(1, least(20, coalesce((e->>'quantity')::integer, 1))) as quantity
    from jsonb_array_elements(p_items) e
  ) gr
  join public.pieces p on p.slug = gr.slug and p.is_listed = true;

  if (select count(*) from _basket) <> v_count then
    raise exception 'One of those pieces is no longer available' using errcode = '22023';
  end if;

  perform 1 from public.pieces
   where id in (select piece_id from _basket)
   order by id
     for update;

  for v_item in select b.*, p.stock
                from _basket b join public.pieces p on p.id = b.piece_id
  loop
    if v_item.stock < v_item.quantity then
      raise exception 'Only % left of %', v_item.stock, v_item.name
        using errcode = '22023';
    end if;
  end loop;

  select sum(price * quantity) into v_total from _basket;

  insert into public.orders (customer, phone, address, note, total)
  values (p_customer, p_phone, left(p_address, 500), left(p_note, 1000), v_total)
  returning id into v_order_id;

  insert into public.order_items (order_id, piece_id, piece_name, unit_price, quantity)
  select v_order_id, piece_id, name, price, quantity from _basket;

  update public.pieces p
     set stock = p.stock - b.quantity
    from _basket b
   where p.id = b.piece_id;

  return jsonb_build_object('order_id', v_order_id, 'total', v_total);
end;
$$;

revoke all on function public.place_order(text, text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, text, jsonb) to anon, authenticated;
