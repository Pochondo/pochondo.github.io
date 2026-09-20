-- Categories for পছন্দ. Run after 07_preorder.sql.
--
-- Free text rather than a lookup table: the range of ceramics here is wide
-- and open-ended, so a fixed list would be wrong within a week. The admin
-- page suggests categories already in use, which keeps spelling consistent
-- without constraining what can be added.
--
-- An empty string means uncategorised; those pieces still appear on the
-- shop, just without a filter chip of their own.

alter table public.pieces
  add column if not exists category text not null default '';

create index if not exists pieces_category_idx
  on public.pieces (category, sort_order);
