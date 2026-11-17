-- Compact list artifacts avoid reading toasted detail/search payloads.
-- Existing generations stay empty here; rebuild with schema manifest 2.
alter table public_read_entries add column list_payload jsonb;
alter table public_read_entries add column list_hash text check (list_hash ~ '^[a-f0-9]{64}$');

create function public_read_list_hash(result text, item jsonb) returns text language sql immutable as $$
  select encode(sha256(convert_to('h-log/public-read-list/v1:' || jsonb_build_object('result',result,'list',item)::text,'UTF8')),'hex')
$$;

create function public_read_valid_blog_list(item jsonb) returns boolean language sql immutable as $$
  select coalesce(jsonb_typeof(item)='object'
    and item ?& array['articleMode','description','href','publishedAt','slug','tags','title','updatedAt']
    and item-array['articleMode','description','href','publishedAt','slug','tags','title','thumbnail','updatedAt']='{}'::jsonb
    and item->>'articleMode' in ('experiment','applied_analysis','document_analysis','project_record','ops_incident')
    and jsonb_typeof(item->'description')='string' and jsonb_typeof(item->'title')='string'
    and jsonb_typeof(item->'slug')='string' and item->>'slug' ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and item->>'href'='/blog/'||(item->>'slug')
    and item->>'publishedAt' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
    and item->>'updatedAt' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
    and jsonb_typeof(item->'tags')='array'
    and not jsonb_path_exists(item,'$.tags[*] ? (@.type() != "string")')
    and (item->'thumbnail' is null or item->'thumbnail'='null'::jsonb or (
      jsonb_typeof(item->'thumbnail')='object' and (item->'thumbnail')-array['src','alt']='{}'::jsonb
      and item->'thumbnail'->>'src' ~ '^/blog-assets/thumbnails/[a-f0-9]{64}\.(png|webp)$'
      and jsonb_typeof(item->'thumbnail'->'alt')='string')),false)
$$;
