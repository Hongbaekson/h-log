-- Run with writers stopped during rollout/reset. Never reuse a protocol-0 epoch.
lock table posts, post_versions, post_tags, post_sources, post_assets, brain_notes in share row exclusive mode;
update public_read_state set source_epoch=gen_random_uuid(), source_revision=0, active_generation=null, writer_protocol=1 where id=1;
update public_read_generations set status='retired';
delete from public_read_sources;
insert into public_read_sources(kind,source_id,metadata_revision)
select 'blog',id,0 from posts union all select 'brain',id,0 from brain_notes;

-- All application writers acquire this BEFORE audit/policy/job/source row locks.
-- Statement triggers also cover direct DML; privileged DDL/TRUNCATE must take this
-- lock explicitly before relation locks when concurrent writers are possible.
create or replace function public_read_lock() returns void language plpgsql as $$
declare protocol integer;
begin
  perform set_config('lock_timeout','250ms',true);
  select writer_protocol into protocol from public_read_state where id=1 for update;
  if protocol is distinct from 1 then raise exception 'unsupported_writer_protocol'; end if;
end $$;

create or replace function public_read_mark(source_kind text, source_key text) returns void language plpgsql as $$
declare revision bigint; gone boolean;
begin
  update public_read_state set source_revision=source_revision+1 where id=1 and writer_protocol=1 returning source_revision into revision;
  if revision is null then raise exception 'unsupported_writer_protocol'; end if;
  if source_kind='blog' then gone := not exists(select 1 from posts where id=source_key);
  else gone := not exists(select 1 from brain_notes where id=source_key); end if;
  insert into public_read_sources(kind,source_id,metadata_revision,deleted) values(source_kind,source_key,revision,gone)
  on conflict(kind,source_id) do update set metadata_revision=excluded.metadata_revision,deleted=excluded.deleted;
end $$;

create or replace function public_read_before_write() returns trigger language plpgsql as $$
begin
  perform public_read_lock();
  return null;
end $$;

create or replace function public_read_after_write() returns trigger language plpgsql as $$
declare old_key text; new_key text; source_kind text;
begin
  if TG_OP='UPDATE' and OLD is not distinct from NEW then return null; end if;
  if TG_TABLE_NAME='brain_notes' then
    if TG_OP='UPDATE' and OLD.public_node is not distinct from NEW.public_node
      and OLD.published_revision is not distinct from NEW.published_revision and OLD.id=NEW.id then return null; end if;
    source_kind := 'brain';
  else source_kind := 'blog'; end if;
  if TG_TABLE_NAME in ('posts','brain_notes') then
    if TG_OP<>'INSERT' then old_key := OLD.id; end if;
    if TG_OP<>'DELETE' then new_key := NEW.id; end if;
  else
    if TG_OP<>'INSERT' then old_key := OLD.post_id; end if;
    if TG_OP<>'DELETE' then new_key := NEW.post_id; end if;
    if TG_TABLE_NAME='post_versions' then
      if old_key is not null and not exists(select 1 from posts where id=old_key and current_version_id=OLD.id) then old_key := null; end if;
      if new_key is not null and not exists(select 1 from posts where id=new_key and current_version_id=NEW.id) then new_key := null; end if;
    end if;
  end if;
  if old_key is not null then perform public_read_mark(source_kind,old_key); end if;
  if new_key is not null and new_key is distinct from old_key then perform public_read_mark(source_kind,new_key); end if;
  return null;
end $$;

create or replace function public_read_after_truncate() returns trigger language plpgsql as $$
declare source_kind text; source_key text;
begin
  source_kind := case when TG_TABLE_NAME='brain_notes' then 'brain' else 'blog' end;
  for source_key in select source_id from public_read_sources where kind=source_kind
    union select id from posts where source_kind='blog'
    union select id from brain_notes where source_kind='brain'
  loop perform public_read_mark(source_kind,source_key); end loop;
  return null;
end $$;

do $$ declare source_table text;
begin
  foreach source_table in array array['posts','post_versions','post_tags','post_sources','post_assets','brain_notes'] loop
    execute format('drop trigger if exists public_read_lock_before on %I',source_table);
    execute format('drop trigger if exists public_read_mark_after on %I',source_table);
    execute format('drop trigger if exists public_read_truncate_after on %I',source_table);
    execute format('create trigger public_read_lock_before before insert or update or delete or truncate on %I for each statement execute function public_read_before_write()',source_table);
    execute format('create trigger public_read_mark_after after insert or update or delete on %I for each row execute function public_read_after_write()',source_table);
    execute format('create trigger public_read_truncate_after after truncate on %I for each statement execute function public_read_after_truncate()',source_table);
  end loop;
end $$;
