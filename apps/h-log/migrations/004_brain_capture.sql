create table brain_notes (
  id text primary key check (id ~ '^note-[0-9a-f-]{36}$'),
  current_revision integer not null default 0 check (current_revision >= 0),
  published_revision integer,
  public_node jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((published_revision is null) = (public_node is null)),
  check (published_revision > 0 and published_revision <= current_revision),
  check (jsonb_typeof(public_node) = 'object' and public_node->>'id' = id)
);

create table brain_note_versions (
  note_id text not null references brain_notes(id),
  revision integer not null check (revision > 0),
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  created_at timestamptz not null default now(),
  primary key (note_id, revision)
);

alter table brain_notes add foreign key (id, current_revision)
  references brain_note_versions(note_id, revision) deferrable initially deferred;
alter table brain_notes add foreign key (id, published_revision)
  references brain_note_versions(note_id, revision) deferrable initially deferred;

create function preserve_brain_history() returns trigger language plpgsql as $$
begin
  raise exception 'brain_history_is_immutable';
end;
$$;
create trigger brain_history_immutable before update or delete on brain_note_versions
  for each row execute function preserve_brain_history();
