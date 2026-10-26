create table resume_pdf_versions (
  id uuid primary key,
  bytes bytea not null,
  sha256 text not null unique check (sha256 ~ '^[0-9a-f]{64}$'),
  byte_size integer not null check (byte_size between 1 and 5242880 and octet_length(bytes) = byte_size),
  page_count integer not null check (page_count between 1 and 10),
  inspection jsonb not null check (jsonb_typeof(inspection) = 'object' and octet_length(inspection::text) <= 524288),
  validation_policy text not null,
  tool_versions jsonb not null check (jsonb_typeof(tool_versions) = 'object'),
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (id, sha256),
  check ((inspection->>'policy' = validation_policy and (inspection->>'pages')::integer = page_count
    and inspection->'tools' = tool_versions) is true)
);

create function preserve_resume_pdf_version() returns trigger language plpgsql as $$
begin
  if (new.id, new.bytes, new.sha256, new.byte_size, new.page_count, new.inspection,
      new.validation_policy, new.tool_versions, new.created_at)
    is distinct from (old.id, old.bytes, old.sha256, old.byte_size, old.page_count, old.inspection,
      old.validation_policy, old.tool_versions, old.created_at) then
    raise exception 'resume PDF version is immutable';
  end if;
  return new;
end $$;
create trigger preserve_resume_pdf_version before update on resume_pdf_versions
  for each row execute function preserve_resume_pdf_version();

create table resume_pdf_state (
  id integer primary key check (id = 1),
  revision integer not null default 0 check (revision >= 0),
  public_version_id uuid,
  public_sha256 text,
  publication_epoch uuid,
  reviewed_at timestamptz,
  reviewed_by text,
  review_checklist jsonb,
  updated_at timestamptz not null default now(),
  foreign key (public_version_id, public_sha256) references resume_pdf_versions(id, sha256),
  check (
    (public_version_id is null and public_sha256 is null and publication_epoch is null and reviewed_at is null and reviewed_by is null and review_checklist is null)
    or (public_version_id is not null and public_sha256 is not null and publication_epoch is not null and reviewed_at is not null
      and reviewed_by is not null and review_checklist is not null and jsonb_typeof(review_checklist) = 'object'
      and review_checklist @> '{"allPages":true,"metadataAndLinks":true,"privacyAndOrganizations":true,"hiddenContentAndSource":true}'::jsonb)
  )
);
insert into resume_pdf_state(id) values (1);

alter table admin_actions drop constraint admin_actions_target_type_check;
alter table admin_actions add constraint admin_actions_target_type_check
  check (target_type in ('post', 'post_version', 'publish_job', 'topic_candidate', 'brain_note', 'resume_pdf_version', 'resume_pdf'));
