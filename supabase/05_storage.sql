-- Photo storage for পছন্দ. Run after 04_seed.sql.
--
-- A public bucket: anyone can read a photo by its URL (that is the point —
-- they appear on the shop), but only the dashboard, which holds the service
-- key, can upload, replace or remove one. No public write policy is created.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;
