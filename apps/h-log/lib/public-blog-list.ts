import type { Pool, PoolClient } from "pg";
import { getPublicBlogIndex, type PublicBlogIndex, type PublicBlogIndexOptions, type PublicBlogListItem } from "./blog-public.ts";
import { readPublicBlogContent } from "./blog-postgres-repository.ts";
import { getPublicBlogSeries, getPublicBlogSeriesFromList, publicBlogSeriesSlugs, type PublicBlogSeries } from "./blog-series.ts";
import { verifyBlogThumbnailFiles, verifyPublicBlogThumbnail } from "./blog-thumbnails.ts";
import { blogListArtifact, canonicalJson, fingerprint, projectionContext, PUBLIC_READ_LIMITS, type ProjectionContext } from "./public-read-model.ts";
import { readProjectionSource, sourceSize } from "./public-read-source.ts";
import { withPublicReadSnapshot } from "./public-read-transaction.ts";

export type PublicBlogList = PublicBlogIndex & { series: PublicBlogSeries[] };
type Override = { id: string; result: "ready" | "excluded"; item: PublicBlogListItem | null };
const flights = new Map<string, Promise<Override>>();
let computing = 0;
let readers = 0;

export function publicReadMode(value = process.env.HLOG_PUBLIC_READ_MODEL) {
  if (value === undefined || value === "source") return "source";
  if (value === "shadow" || value === "projected") return value;
  throw new Error("invalid_public_read_mode");
}

const candidates = `with candidates as materialized (
  select p.id,p.slug,coalesce(p.published_at,p.updated_at) listed_at,p.current_version_id,s.metadata_revision,
    s.metadata_revision is null or s.deleted marker_missing,e.result,e.list_payload,
    coalesce($2::boolean and e.source_version=p.current_version_id and e.metadata_revision=s.metadata_revision
      and e.list_hash=public_read_list_hash(e.result,e.list_payload)
      and ((e.result='excluded' and e.list_payload is null) or (e.result='ready'
        and public_read_valid_blog_list(e.list_payload) and e.list_payload->>'slug'=p.slug)),false) usable
  from posts p join post_versions v on v.id=p.current_version_id and v.post_id=p.id
  left join public_read_sources s on s.kind='blog' and s.source_id=p.id
  left join public_read_entries e on e.generation_id=$1 and e.kind='blog' and e.source_id=p.id
  where p.status='published'
)`;

async function projected(client: PoolClient, options: PublicBlogIndexOptions, context: ProjectionContext, deadline: number): Promise<PublicBlogList> {
  const state = (await client.query(`select st.*,g.source_epoch generation_epoch,g.status,g.version_manifest,g.policy_fingerprint,
    exists(select 1 from schema_migrations where version='016_public_blog_lists') migrated
    from public_read_state st left join public_read_generations g on g.id=st.active_generation where st.id=1`)).rows[0];
  if (!state || state.writer_protocol !== 1 || !state.migrated) throw new Error("projection_unavailable");
  const compatible = state.status === "active" && state.source_epoch === state.generation_epoch
    && canonicalJson(state.version_manifest) === canonicalJson(context.manifest) && state.policy_fingerprint === context.policyFingerprint;
  const args = [state.active_generation, compatible];
  const misses = (await client.query(candidates+` select id,metadata_revision,current_version_id,marker_missing from candidates
    where not usable or marker_missing order by id limit 11`,args)).rows;
  if (misses.some(row => row.marker_missing)) throw new Error("projection_marker_missing");
  if (misses.length > 10) throw new Error("projection_fallback_limit");
  const overrides: Override[] = [];
  let bytes = 0;
  for (const row of misses) {
    if (performance.now() >= deadline) throw new Error("projection_deadline");
    const key = {kind:"blog" as const, source_id:row.id};
    const size = await sourceSize(client,key);
    bytes += size;
    if (size > PUBLIC_READ_LIMITS.input || bytes > PUBLIC_READ_LIMITS.batchBytes) throw new Error("projection_fallback_limit");
    const flightKey = fingerprint([state.source_epoch,key,row.metadata_revision,row.current_version_id,context.manifest,context.policyFingerprint]);
    let flight = flights.get(flightKey);
    if (!flight) {
      if (flights.size >= 64 || computing >= 2) throw new Error("projection_busy");
      computing++;
      flight = (async () => {
        // A separate instance must not compute the same input concurrently.
        const locked = (await client.query("select pg_try_advisory_xact_lock(hashtextextended($1,710493709)) locked",[flightKey])).rows[0].locked;
        if (!locked) throw new Error("projection_busy");
        const value = await readProjectionSource(client,key,context,size);
        return {id:row.id,result:value.result,item:blogListArtifact(value)};
      })().finally(() => { computing--; });
      flights.set(flightKey,flight);
    }
    overrides.push(await flight);
  }
  if (performance.now() >= deadline) throw new Error("projection_deadline");
  const normalized = getPublicBlogIndex({posts:[],versions:[],tags:[],sources:[],assets:[]},options);
  const pageSize = normalized.pagination.pageSize;
  const page = Number.isInteger(options.page) && options.page! > 0 ? Math.min(options.page!,2147483647) : 1;
  const result = (await client.query(candidates+`, replacements as (
    select * from jsonb_to_recordset($3::jsonb) as r(id text,result text,item jsonb)
  ), visible as materialized (
    select c.id,c.listed_at,case when r.id is not null then r.item else c.list_payload end item
    from candidates c left join replacements r using(id)
    where case when r.id is not null then r.result else c.result end='ready'
  ), filtered as materialized (select * from visible where $4::text is null or item->'tags' ? $4),
  totals as (select count(*)::int total from filtered), paging as (
    select total,greatest(1,ceil(total::numeric/$5)::int) pages,least($6,greatest(1,ceil(total::numeric/$5)::int)) page from totals
  ) select total,pages,page,
    coalesce((select jsonb_agg(item order by listed_at desc,id) from
      (select * from filtered order by listed_at desc,id limit $5 offset (select (page-1)*$5 from paging)) shown),'[]') posts,
    coalesce((select jsonb_agg(jsonb_build_object('tag',tag,'count',n)) from
      (select tag,count(*)::int n from visible cross join lateral jsonb_array_elements_text(item->'tags') tag group by tag) tags),'[]') tags,
    coalesce((select jsonb_agg(jsonb_build_object('slug',item->>'slug','href',item->>'href','title',item->>'title'))
      from visible where item->>'slug'=any($7::text[])),'[]') series
    from paging`,[...args,JSON.stringify(overrides),normalized.selectedTag,pageSize,page,publicBlogSeriesSlugs])).rows[0];
  const posts: PublicBlogListItem[] = await Promise.all(result.posts.map(async (item: PublicBlogListItem) => ({...item,thumbnail:await verifyPublicBlogThumbnail(item.thumbnail)})));
  return {posts,selectedTag:normalized.selectedTag,pagination:{currentPage:result.page,pageSize,totalItems:result.total,totalPages:result.pages},
    tagCounts:result.tags.sort((a:{count:number;tag:string},b:{count:number;tag:string})=>b.count-a.count||a.tag.localeCompare(b.tag,"ko")),series:getPublicBlogSeriesFromList(result.series)};
}

export async function readPublicBlogList(pool: Pool, options: PublicBlogIndexOptions = {}, context = projectionContext(), mode = publicReadMode()): Promise<PublicBlogList> {
  const deadline = performance.now()+2000;
  readers++;
  try {
    return await withPublicReadSnapshot(pool,async client => {
      if (mode === "source") {
        const store = await verifyBlogThumbnailFiles(await readPublicBlogContent(client,{privacyScanPolicy:context.policy}));
        return {...getPublicBlogIndex(store,options),series:getPublicBlogSeries(store)};
      }
      const result = await projected(client,options,context,deadline);
      if (mode === "projected") return result;
      const store = await verifyBlogThumbnailFiles(await readPublicBlogContent(client,{privacyScanPolicy:context.policy}));
      const original = {...getPublicBlogIndex(store,options),series:getPublicBlogSeries(store)};
      if (canonicalJson(result) !== canonicalJson(original)) console.error("public_blog_list_shadow_mismatch");
      return original;
    });
  } finally {
    // ponytail: at most 64 input-bound results live until overlapping readers drain.
    // Requests stay read-only; explicit repair/rebuild persists the artifacts.
    if (--readers === 0) flights.clear();
  }
}
