import type { Pool, PoolClient } from "pg";
import type { PublicBlogPost, PublicBlogListItem } from "./blog-public.ts";
import { blogListArtifact, canonicalJson, fingerprint, PUBLIC_READ_LIMITS, type ProjectionContext } from "./public-read-model.ts";
import { readProjectionSource, sourceSize } from "./public-read-source.ts";
import { findCurrentProjection, withPublicReadSnapshot } from "./public-read-transaction.ts";

type Override = { id: string; result: "ready" | "excluded"; item: PublicBlogListItem | null; detail: Omit<PublicBlogPost, "markdown" | "contentHtml"> | null };
const flights = new Map<string, Promise<Override>>();
let computing = 0;
let readers = 0;

export function publicReadMode(value = process.env.HLOG_PUBLIC_READ_MODEL) {
  if (value === undefined || value === "source") return "source";
  if (value === "shadow" || value === "projected") return value;
  throw new Error("invalid_public_read_mode");
}

const candidates = `with candidates as materialized (
  select p.id,p.slug,p.published_at,coalesce(p.published_at,p.updated_at) listed_at,p.current_version_id,s.metadata_revision,
    s.metadata_revision is null or s.deleted marker_missing,e.result,e.list_payload,
    coalesce($2::boolean and e.source_version=p.current_version_id and e.metadata_revision=s.metadata_revision
      and e.list_hash=public_read_list_hash(e.result,e.list_payload)
      and ((e.result='excluded' and e.list_payload is null) or (e.result='ready'
        and public_read_valid_blog_list(e.list_payload) and e.list_payload->>'slug'=p.slug)),false) usable
  from posts p join post_versions v on v.id=p.current_version_id and v.post_id=p.id
  left join public_read_sources s on s.kind='blog' and s.source_id=p.id
  left join public_read_entries e on e.generation_id=$1 and e.kind='blog' and e.source_id=p.id
  where p.status='published' and ($3::text[] is null or p.slug=any($3))
)`;

type CurrentBlogRow = { id: string; metadata_revision: string; current_version_id: string };

export async function prepareBlogProjection(client: PoolClient, context: ProjectionContext) {
  const deadline = performance.now() + 2000;
  const state = (await client.query(`select st.*,g.source_epoch generation_epoch,g.status,g.version_manifest,g.policy_fingerprint,
    exists(select 1 from schema_migrations where version='016_public_blog_lists') migrated
    from public_read_state st left join public_read_generations g on g.id=st.active_generation where st.id=1`)).rows[0];
  if (!state || state.writer_protocol !== 1 || !state.migrated) throw new Error("projection_unavailable");
  const compatible = state.status === "active" && state.source_epoch === state.generation_epoch
    && canonicalJson(state.version_manifest) === canonicalJson(context.manifest) && state.policy_fingerprint === context.policyFingerprint;
  const recovered = new Map<string, Override>();
  let bytes = 0;
  async function recover(row: CurrentBlogRow) {
    const previous = recovered.get(row.id);
    if (previous) return previous;
    if (performance.now() >= deadline) throw new Error("projection_deadline");
    if (recovered.size >= 10) throw new Error("projection_fallback_limit");
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
        return { id: row.id, result: value.result, item: blogListArtifact(value),
          detail: value.payload && "detail" in value.payload ? value.payload.detail : null };
      })().finally(() => { computing--; });
      flights.set(flightKey,flight);
    }
    const value = await flight;
    recovered.set(row.id, value);
    if (performance.now() >= deadline) throw new Error("projection_deadline");
    return value;
  }

  async function visible(slugs: readonly string[] | null = null) {
    const args = [state.active_generation, compatible, slugs];
    const misses = (await client.query<CurrentBlogRow & { marker_missing: boolean }>(candidates + ` select id,metadata_revision,current_version_id,marker_missing
      from candidates where not usable or marker_missing order by id limit 11`, args)).rows;
    if (misses.some(row => row.marker_missing)) throw new Error("projection_marker_missing");
    if (misses.length > 10) throw new Error("projection_fallback_limit");
    for (const row of misses) await recover(row);
    if (performance.now() >= deadline) throw new Error("projection_deadline");
    const replacements = [...recovered.values()].map(({ id, result, item }) => ({ id, result, item }));
    return { revision: compatible && !misses.length ? [state.source_epoch, state.active_generation, state.source_revision] : null,
      sql: visibleSql, args: [...args, JSON.stringify(replacements)] };
  }
  async function detail(slug: string) {
    const { rows: [row] } = await client.query<CurrentBlogRow & {
      published_at: Date | null; usable: boolean; marker_missing: boolean; result: string | null;
    }>(candidates + " select * from candidates", [state.active_generation, compatible, [slug]]);
    if (!row) return;
    if (row.marker_missing) throw new Error("projection_marker_missing");
    if (row.usable && row.result === "excluded") return;
    const payload = row.usable && await findCurrentProjection(client, { kind: "blog", source_id: row.id }, context);
    const post = payload && "detail" in payload && payload.detail?.slug === slug
      && Array.isArray(payload.detail.contentBlocks) && Array.isArray(payload.detail.tableOfContents)
      ? payload.detail : (await recover(row)).detail;
    if (!post) return;
    return { post: { ...post, editorial: post.editorial ?? undefined, thumbnail: undefined },
      publicationDate: row.published_at?.toISOString() ?? null };
  }

  return { visible, detail };
}

const visibleSql = candidates + `, replacements as (
    select * from jsonb_to_recordset($4::jsonb) as r(id text,result text,item jsonb)
  ), visible as materialized (
    select c.id,c.slug,c.current_version_id,c.listed_at,case when r.id is not null then r.item else c.list_payload end item
    from candidates c left join replacements r using(id)
    where case when r.id is not null then r.result else c.result end='ready'
  )`;

export async function withBlogReadSnapshot<T>(pool: Pool, read: (client: PoolClient) => Promise<T>) {
  readers++;
  try {
    return await withPublicReadSnapshot(pool, read);
  } finally {
    if (--readers === 0) flights.clear();
  }
}
