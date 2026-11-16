-- Derived data only. Protocol 0 is deliberately restricted to isolated rebuilds.
create table public_read_generations (
  id uuid primary key,
  source_epoch uuid not null,
  status text not null check (status in ('building','paused','validating','active','retired','failed')),
  version_manifest jsonb not null check (jsonb_typeof(version_manifest) = 'object'),
  policy_fingerprint text not null check (policy_fingerprint ~ '^[a-f0-9]{64}$'),
  base_revision bigint not null check (base_revision >= 0),
  checked_revision bigint,
  catchup_revision bigint not null check (catchup_revision >= 0),
  scan_cursor jsonb not null default '["",""]' check (jsonb_typeof(scan_cursor) = 'array' and jsonb_array_length(scan_cursor) = 2),
  scan_complete boolean not null default false,
  run_token uuid not null,
  kind_scope text not null check (kind_scope in ('blog','brain','all')),
  counts jsonb not null default '{"ready":0,"excluded":0}',
  manifest_hash text check (manifest_hash ~ '^[a-f0-9]{64}$'),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public_read_state (
  id integer primary key check (id = 1),
  source_epoch uuid not null,
  source_revision bigint not null default 0 check (source_revision >= 0),
  active_generation uuid references public_read_generations(id),
  writer_protocol integer not null default 0 check (writer_protocol >= 0)
);
insert into public_read_state(id, source_epoch) values(1, gen_random_uuid());
create table public_read_sources (
  kind text not null check (kind in ('blog','brain')),
  source_id text not null,
  metadata_revision bigint not null check (metadata_revision >= 0),
  deleted boolean not null default false,
  primary key(kind, source_id)
);
create index public_read_sources_revision on public_read_sources(metadata_revision, kind, source_id);
create table public_read_entries (
  generation_id uuid not null references public_read_generations(id) on delete cascade,
  kind text not null check (kind in ('blog','brain')),
  source_id text not null,
  source_version text,
  metadata_revision bigint not null check (metadata_revision >= 0),
  input_fingerprint text not null check (input_fingerprint ~ '^[a-f0-9]{64}$'),
  content_hash text check (content_hash ~ '^[a-f0-9]{64}$'),
  result text not null check (result in ('ready','excluded')),
  payload jsonb,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  primary key(generation_id, kind, source_id),
  check ((result = 'excluded' and payload is null) or (result = 'ready' and payload is not null and jsonb_typeof(payload) = 'object')),
  check (payload is null or octet_length(payload::text) <= 2097152)
);
