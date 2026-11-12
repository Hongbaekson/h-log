create table brain_note_reviews (
  note_id text not null,
  revision integer not null check (revision > 0),
  command_revision integer not null check (command_revision > 0),
  command_id uuid not null unique,
  result text not null check (result in ('needs_review', 'confirmed')),
  memo text not null check (char_length(memo) <= 500),
  recorded_at timestamptz not null default now(),
  primary key (note_id, command_revision),
  foreign key (note_id, revision) references brain_note_versions(note_id, revision),
  check (result <> 'needs_review' or memo ~ '[^[:space:]]')
);
create trigger brain_review_immutable before update or delete on brain_note_reviews
  for each row execute function preserve_brain_history();

alter table admin_actions drop constraint admin_actions_action_type_check;
alter table admin_actions add constraint admin_actions_action_type_check
  check (action_type in ('preview','save','publish','retry','unpublish','retract','correct','block_topic','approve_preview','draft_requested','draft_completed','automation_policy_changed','automation_admitted','review'));
