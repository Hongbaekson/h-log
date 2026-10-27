alter table posts add column command_revision integer not null default 0 check (command_revision >= 0);
alter table post_versions add column editorial_review jsonb,
  add constraint post_versions_editorial_review_object check (editorial_review is null or jsonb_typeof(editorial_review) = 'object');
