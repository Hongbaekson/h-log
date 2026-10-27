create table blog_automation_policy (
  singleton boolean primary key default true check (singleton),
  generation boolean not null default false,
  publication boolean not null default false,
  jobs boolean not null default false,
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);
insert into blog_automation_policy(singleton) values (true);
alter table blog_draft_requests add column policy_revision integer;
alter table publish_jobs add column policy_revision integer;
alter table posts add column publication_mode text not null default 'automatic'
  check (publication_mode in ('automatic','manual'));
-- Preserve already approved versions when upgrading an existing database.
update posts p set publication_mode='manual' where exists (
  select 1 from post_versions v where v.id=p.current_version_id and v.editorial_review is not null and v.created_by='admin'
);
alter table admin_actions drop constraint admin_actions_action_type_check;
alter table admin_actions add constraint admin_actions_action_type_check
  check (action_type in ('preview','save','publish','retry','unpublish','retract','correct','block_topic','approve_preview','draft_requested','draft_completed','automation_policy_changed','automation_admitted'));
alter table admin_actions drop constraint admin_actions_target_type_check;
alter table admin_actions add constraint admin_actions_target_type_check
  check (target_type in ('post','post_version','publish_job','topic_candidate','brain_note','resume_pdf_version','resume_pdf','draft_request','automation_policy'));
