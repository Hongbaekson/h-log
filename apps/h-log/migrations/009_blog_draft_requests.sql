create table blog_draft_requests (
  id uuid primary key,
  input_hash text not null unique check (input_hash ~ '^[0-9a-f]{64}$'),
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object' and octet_length(input_snapshot::text) <= 524288),
  status text not null default 'queued' check (status in ('queued','running','result_ready','completed','blocked','needs_review')),
  reason_code text,
  result jsonb check (result is null or (jsonb_typeof(result) = 'object' and octet_length(result::text) <= 2097152)),
  post_id text references posts(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  provider_started_at timestamptz,
  provider_returned_at timestamptz,
  finished_at timestamptz,
  check (status not in ('result_ready','completed') or result is not null),
  check (status <> 'completed' or post_id is not null)
);
create index blog_draft_requests_pending on blog_draft_requests(created_at,id)
  where status in ('queued','result_ready');
alter table admin_actions drop constraint admin_actions_action_type_check;
alter table admin_actions add constraint admin_actions_action_type_check
  check (action_type in ('preview','save','publish','retry','unpublish','retract','correct','block_topic','approve_preview','draft_requested','draft_completed'));
alter table admin_actions drop constraint admin_actions_target_type_check;
alter table admin_actions add constraint admin_actions_target_type_check
  check (target_type in ('post','post_version','publish_job','topic_candidate','brain_note','resume_pdf_version','resume_pdf','draft_request'));
