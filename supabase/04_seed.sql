-- Seeds the six pieces from the site template.
-- Run after 03_place_order.sql. Safe to re-run: matching slugs are left alone.
--
-- NOTE: every row starts with price 0, stock 0 and is_listed = false, so
-- nothing appears on the site until you set real prices in the Table Editor.
-- Set is_listed = true on a row to publish it.

insert into public.pieces
  (slug, name, price, shape, description, size, holds, glaze, care, stock, is_listed, sort_order)
values
  ('everyday-mug', 'Everyday mug', 0, 'mug',
   'A mug with a comfortable handle and a rim that feels good to drink from.',
   '', '', '', '', 0, false, 1),

  ('breakfast-bowl', 'Breakfast bowl', 0, 'bowl',
   'A generous bowl for cereal, soup or noodles, with a foot that keeps it steady.',
   '', '', '', '', 0, false, 2),

  ('round-vase', 'Round vase', 0, 'vase',
   'A rounded vase with a narrow neck that holds a few stems upright.',
   '', '', '', '', 0, false, 3),

  ('dinner-plates', 'Dinner plates', 0, 'plates',
   'Flat, stackable plates with a gently raised rim.',
   '', '', '', '', 0, false, 4),

  ('pouring-jug', 'Pouring jug', 0, 'jug',
   'A jug with a clean pouring lip and a handle sized for a full hand.',
   '', '', '', '', 0, false, 5),

  ('tumbler', 'Tumbler', 0, 'tumbler',
   'A cup without a handle for water, tea or juice, banded with glaze.',
   '', '', '', '', 0, false, 6)

on conflict (slug) do nothing;
