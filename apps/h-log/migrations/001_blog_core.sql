create extension if not exists vector;

create table posts (
  id text primary key,
  slug text not null unique,
  title text not null,
  description text not null,
  article_mode text not null check (
    article_mode in (
      'experiment',
      'applied_analysis',
      'document_analysis',
      'project_record',
      'ops_incident'
    )
  ),
  status text not null check (
    status in (
      'queued',
      'researching',
      'drafted',
      'gate_failed',
      'ready_to_publish',
      'publishing',
      'verifying',
      'published',
      'correction_pending',
      'corrected',
      'unpublished',
      'retracted',
      'failed_generation',
      'failed_publish',
      'failed_verification'
    )
  ),
  current_version_id text,
  published_at timestamptz,
  unpublished_at timestamptz,
  retracted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table post_versions (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  title text not null,
  description text not null,
  content_markdown text not null,
  content_html text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  persona_version_id text,
  research_pack_id text,
  created_by text not null check (created_by in ('system', 'admin')),
  created_at timestamptz not null,
  unique (post_id, version_no)
);

alter table posts
  add constraint posts_current_version_id_fkey
  foreign key (current_version_id)
  references post_versions(id)
  deferrable initially deferred;

create table post_tags (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null,
  unique (post_id, tag)
);

create table post_sources (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  research_pack_id text,
  url text not null,
  title text not null,
  publisher text not null,
  source_role text not null check (
    source_role in ('official', 'original', 'discovery', 'reaction', 'reference')
  ),
  fetched_at timestamptz not null,
  summary text not null,
  snapshot_hash text not null
);

create table post_assets (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  post_version_id text not null references post_versions(id) on delete cascade,
  type text not null check (type in ('image', 'diagram', 'og')),
  path text not null,
  alt text not null,
  status text not null check (status in ('ready', 'failed')),
  asset_hash text,
  verified_at timestamptz,
  generated_by text not null,
  created_at timestamptz not null
);

create table publish_jobs (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  post_version_id text not null references post_versions(id) on delete cascade,
  type text not null check (
    type in (
      'public_url',
      'md_url',
      'render',
      'privacy_scan',
      'sitemap',
      'content_version_match',
      'embedding',
      'search_index',
      'related_posts',
      'llms',
      'feed',
      'indexnow',
      'discord',
      'og',
      'diagram'
    )
  ),
  importance text not null check (importance in ('required', 'retryable')),
  idempotency_key text not null unique,
  status text not null check (
    status in ('queued', 'running', 'retrying', 'succeeded', 'failed')
  ),
  retry_count integer not null default 0 check (retry_count >= 0),
  error text,
  started_at timestamptz,
  finished_at timestamptz
);
