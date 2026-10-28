-- Separate command identity from legacy text IDs, which may contain private paths.
alter table publish_jobs add column admin_id uuid not null default gen_random_uuid() unique;
