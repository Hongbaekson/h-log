alter table brain_notes add column command_revision integer not null default 0
  check (command_revision >= 0);

alter table admin_actions drop constraint admin_actions_target_type_check;
alter table admin_actions add constraint admin_actions_target_type_check
  check (target_type in ('post', 'post_version', 'publish_job', 'topic_candidate', 'brain_note'));
alter table admin_actions
  add column command_id uuid,
  add column request_fingerprint text,
  add column command_receipt jsonb,
  add constraint admin_actions_command_check check (
    (command_id is null and request_fingerprint is null and command_receipt is null)
    or (command_id is not null and request_fingerprint is not null
      and request_fingerprint ~ '^[0-9a-f]{64}$' and command_receipt is not null
      and jsonb_typeof(command_receipt) = 'object')
  );
create unique index admin_actions_command_key on admin_actions (actor_type, actor_id, command_id)
  where command_id is not null;
create index admin_actions_brain_history on admin_actions (target_id, created_at desc)
  where target_type = 'brain_note';
