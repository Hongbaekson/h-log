create table publish_verifications (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  post_version_id text not null references post_versions(id) on delete cascade,
  check_type text not null check (
    check_type in (
      'public_url',
      'md_url',
      'sitemap',
      'feed',
      'llms',
      'search_index',
      'related_posts',
      'content_version_match'
    )
  ),
  status text not null check (status in ('passed', 'failed')),
  response_code integer check (
    response_code is null or response_code between 100 and 599
  ),
  result text not null,
  checked_at timestamptz not null
);

create table admin_actions (
  id text primary key,
  action_type text not null check (
    action_type in (
      'preview',
      'save',
      'publish',
      'retry',
      'unpublish',
      'retract',
      'correct',
      'block_topic',
      'approve_preview'
    )
  ),
  actor_type text not null check (
    actor_type in ('admin', 'system', 'discord', 'cli')
  ),
  actor_id text not null,
  target_type text not null check (
    target_type in ('post', 'post_version', 'publish_job', 'topic_candidate')
  ),
  target_id text not null,
  reason text,
  created_at timestamptz not null
);
