import type { PoolClient, QueryResultRow } from "pg";
import { mapBlogContentRows } from "./blog-postgres-repository.ts";
import { verifyBlogThumbnailFiles } from "./blog-thumbnails.ts";
import { projectBlog, projectBrain, PUBLIC_READ_LIMITS, type ProjectionContext, type Projection } from "./public-read-model.ts";

export type SourceKey = { kind: "blog" | "brain"; source_id: string };
export const SOURCE_TABLES = "posts, post_versions, post_tags, post_sources, post_assets, brain_notes";
export async function sourcePage(client: PoolClient, cursor: string[], limit: number): Promise<SourceKey[]> {
  return (await client.query<SourceKey>(`select * from (
    select 'blog'::text kind, id source_id from posts union all select 'brain', id from brain_notes
  ) s where (kind collate "C",source_id collate "C") > ($1 collate "C",$2 collate "C")
  order by kind collate "C",source_id collate "C" limit $3`, [...cursor, limit])).rows;
}

// Size-only preflight precedes transferring bodies/relations, in the caller's repeatable-read snapshot.
export async function sourceSize(client: PoolClient, key: SourceKey): Promise<number> {
  if (key.kind === "brain") {
    const result = await client.query("select coalesce(octet_length(public_node::text),4)+128 bytes from brain_notes where id=$1", [key.source_id]);
    if (!result.rowCount) throw new Error("source_missing");
    return Number(result.rows[0].bytes);
  }
  const result = await client.query(`select octet_length(to_jsonb(p)::text) + 256 +
    coalesce((select octet_length((to_jsonb(v)-'editorial_review')::text) from post_versions v where p.status='published' and v.id=p.current_version_id and v.post_id=p.id),0) +
    coalesce((select sum(octet_length(to_jsonb(t)::text)+2) from post_tags t where t.post_id=p.id and p.status='published'),0) +
    coalesce((select sum(octet_length(to_jsonb(s)::text)+2) from post_sources s where s.post_id=p.id and p.status='published'),0) +
    coalesce((select sum(octet_length(to_jsonb(a)::text)+2) from post_assets a where a.post_id=p.id and a.post_version_id=p.current_version_id and p.status='published'),0) bytes
    from posts p where id=$1`, [key.source_id]);
  if (!result.rowCount) throw new Error("source_missing");
  return Number(result.rows[0].bytes);
}
export async function readProjectionSource(client: PoolClient, key: SourceKey, context: ProjectionContext, size: number): Promise<Projection> {
  if (size > PUBLIC_READ_LIMITS.input) throw new Error("input_limit");
  if (key.kind === "brain") {
    const row = (await client.query("select public_node,published_revision from brain_notes where id=$1", [key.source_id])).rows[0];
    return projectBrain(row.public_node, row.published_revision, context, key.source_id);
  }
  const row = (await client.query(`select to_jsonb(p) post,
    (select to_jsonb(v)-'editorial_review' from post_versions v where p.status='published' and v.id=p.current_version_id and v.post_id=p.id) version,
    coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from post_tags t where t.post_id=p.id and p.status='published'),'[]') tags,
    coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from post_sources s where s.post_id=p.id and p.status='published'),'[]') sources,
    coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from post_assets a where a.post_id=p.id and a.post_version_id=p.current_version_id and p.status='published'),'[]') assets
    from posts p where id=$1`, [key.source_id])).rows[0] as {
      post: QueryResultRow; version: QueryResultRow | null; tags: QueryResultRow[]; sources: QueryResultRow[]; assets: QueryResultRow[];
    };
  // JSONB timestamps use the session timezone; restore pg's normal Date mapping before hashing/DTOs.
  for (const record of [row.post, row.version, ...row.tags, ...row.sources, ...row.assets]) {
    if (record) for (const key of Object.keys(record)) if (key.endsWith("_at") && record[key] !== null) record[key] = new Date(record[key]);
  }
  const store = await verifyBlogThumbnailFiles(mapBlogContentRows(row, context.policy));
  return projectBlog(store, context, row);
}
