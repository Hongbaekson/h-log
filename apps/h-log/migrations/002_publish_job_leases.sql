alter table publish_jobs
  add column lease_owner text,
  add column lease_expires_at timestamptz,
  add constraint publish_jobs_lease_pair_check check (
    (lease_owner is null and lease_expires_at is null)
    or (lease_owner is not null and lease_expires_at is not null)
  );

create index publish_jobs_claim_idx
  on publish_jobs (status, lease_expires_at, id);

create table usage_events (
  id text primary key,
  run_id text not null,
  event_type text not null,
  provider text,
  model text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  estimated_cost numeric(12, 6) check (
    estimated_cost is null or estimated_cost >= 0
  ),
  status text not null,
  created_at timestamptz not null
);
