import { selectPublicBlogRouteEntries } from "./blog-content-model.ts";
import type { Pool, PoolClient } from "pg";
import { readPublicBlogContent } from "./blog-postgres-repository.ts";
import { getPublicBlogPostBySlug, getPublicBlogPostNavigation, type PublicBlogPostNavigation } from "./blog-public.ts";
import { getPublicBlogPostSeries, getPublicBlogSeriesFromList, publicBlogSeriesSlugs, selectPostSeries } from "./blog-series.ts";
import { projectConnectionsFromPosts, projectPostConnections } from "./portfolio-posts.ts";
import { prepareBlogProjection, publicReadMode, withBlogReadSnapshot } from "./public-blog-projection.ts";
import { canonicalJson, type ProjectionContext } from "./public-read-model.ts";
import { brainCatalog } from "./brain-catalog.ts";
import { publicSourceHref, selectPublicBrain } from "./brain.ts";
import { mergePublishedBrain } from "./brain-curation.ts";
import { blogSourcePath } from "./brain-blog-sources.ts";
import { resolvePublicSiteOrigin } from "./public-site-origin.ts";

type SeriesPost = { slug: string; href: string; title: string };

async function projectedDetail(client: PoolClient, slug: string, context: ProjectionContext) {
  const projection = await prepareBlogProjection(client, context);
  const target = await projection.detail(slug);
  if (!target) return;
  const { sql, args } = await projection.visible();
  const { rows: [row] } = await client.query<PublicBlogPostNavigation & { series: SeriesPost[] }>(sql + `,
    links as materialized (
      select slug collate "C" slug, date_trunc('milliseconds',listed_at) at,
        jsonb_build_object('href',item->>'href','title',item->>'title','publishedAt',item->>'publishedAt') link,
        item->'tags' tags from visible
    ), target as (select * from links where slug=$5),
    matches as (
      select l.slug,l.link,shared.tags,cardinality(shared.tags) n,
        jsonb_array_length(l.tags)+jsonb_array_length(t.tags)-cardinality(shared.tags) union_size
      from links l cross join target t cross join lateral (
        select array(select tag from jsonb_array_elements_text(t.tags) tag where l.tags ? tag) tags
      ) shared where l.slug<>t.slug and cardinality(shared.tags)>0
    )
    select (select l.link from links l where (l.at,l.slug)<(t.at,t.slug) order by l.at desc,l.slug desc limit 1) previous,
      (select l.link from links l where (l.at,l.slug)>(t.at,t.slug) order by l.at,l.slug limit 1) next,
      coalesce((select jsonb_agg(jsonb_build_object('href',link->>'href','title',link->>'title','sharedTags',tags)
        order by score desc,n desc,slug) from (
          select *,n::float8/union_size score from matches order by score desc,n desc,slug limit 3
        ) ranked),'[]') related,
      coalesce((select jsonb_agg(jsonb_build_object('slug',slug,'href',link->>'href','title',link->>'title'))
        from links where slug=any($6::text[])),'[]') series from target t`,
    [...args, slug, publicBlogSeriesSlugs.includes(slug) ? publicBlogSeriesSlugs : []]);
  if (!row) throw new Error("projection_detail_inconsistent");
  const { previous, next, related } = row;
  for (const link of related) link.sharedTags.sort();
  return { ...target, navigation: { previous, next, related },
    series: selectPostSeries(slug, getPublicBlogSeriesFromList(row.series)),
    projectConnections: projectConnectionsFromPosts([target.post]) };
}

async function sourceDetail(client: PoolClient, slug: string, context: ProjectionContext) {
  const store = await readPublicBlogContent(client, { privacyScanPolicy: context.policy });
  const full = getPublicBlogPostBySlug(slug, store);
  if (!full) return;
  const { markdown, contentHtml, ...post } = full;
  void markdown;
  void contentHtml;
  return { post: { ...post, thumbnail: undefined }, publicationDate: store.posts.find(p => p.slug === slug)!.publishedAt,
    navigation: getPublicBlogPostNavigation(slug, store)!, series: getPublicBlogPostSeries(slug, store),
    projectConnections: projectConnectionsFromPosts([post]) };
}

// The caller has already verified the Blog target in this snapshot. Only matching
// Brain publications need their complete public copy checked against today's policy.
async function brainLinks(client: PoolClient, href: string, context: ProjectionContext) {
  const catalog = selectPublicBrain(brainCatalog);
  const origin = process.env.HLOG_PUBLIC_BASE_URL && resolvePublicSiteOrigin(process.env.HLOG_PUBLIC_BASE_URL);
  const matches = (url?: string) => blogSourcePath(url, origin) === href;
  let graph = catalog;
  if (process.env.HLOG_BRAIN_DATABASE_ENABLED === "1") {
    await client.query("savepoint brain_links");
    try {
      const { rows } = await client.query<{ id: string; href: string }>(`select distinct id,source->>'href' href
        from brain_notes cross join lateral jsonb_array_elements(public_node->'sources') source
        where published_revision is not null and source ? 'href'`);
      const ids = rows.filter(row => matches(publicSourceHref(row.href))).map(row => row.id);
      if (ids.length) {
        const snapshots = await client.query("select public_node from brain_notes where published_revision is not null and id=any($1) order by created_at,id", [ids]);
        graph = mergePublishedBrain(catalog, snapshots.rows.map(row => row.public_node), context.policy);
      }
    } catch {
      await client.query("rollback to savepoint brain_links");
      console.error("blog_brain_connections_unavailable");
      return null;
    }
  }
  return graph.nodes.filter(node => node.sources.some(source => matches(source.href)))
    .map(node => ({ href: `/brain/${node.id}`, title: node.title }));
}

export async function readPublicBlogDetail(pool: Pool, slug: string, context: ProjectionContext, mode = publicReadMode()) {
  return withBlogReadSnapshot(pool, async client => {
    const candidate = mode === "source" ? undefined : await projectedDetail(client, slug, context);
    const detail = mode === "projected" ? candidate : await sourceDetail(client, slug, context);
    if (mode === "shadow" && canonicalJson(candidate) !== canonicalJson(detail)) console.error("public_blog_detail_shadow_mismatch");
    if (detail) return { ...detail, brainLinks: await brainLinks(client, detail.post.href, context) };
  });
}

export async function readProjectRelatedPosts(pool: Pool, projectSlug: string, context: ProjectionContext, mode = publicReadMode()) {
  const slugs = projectPostConnections.filter(link => link.projectSlug === projectSlug).map(link => link.postSlug);
  return withBlogReadSnapshot(pool, async client =>
    projectConnectionsFromPosts(await readBlogTitles(client, slugs, context, mode)).filter(link => link.projectSlug === projectSlug));
}

export async function readBlogTitles(client: PoolClient, slugs: string[], context: ProjectionContext, mode = publicReadMode()) {
  let candidate;
  if (mode !== "source") {
    const projection = await prepareBlogProjection(client, context);
    const { sql, args } = await projection.visible(slugs);
    candidate = (await client.query<Pick<SeriesPost, "slug" | "title">>(
      sql + " select slug,item->>'title' title from visible order by id", args)).rows;
    if (mode === "projected") return candidate;
  }
  const store = await readPublicBlogContent(client, { privacyScanPolicy: context.policy }, slugs);
  const original = selectPublicBlogRouteEntries(store.posts, store.versions).map(({ post, version }) => ({ slug: post.slug, title: version.title }));
  if (mode === "shadow" && canonicalJson(candidate) !== canonicalJson(original)) console.error("public_blog_titles_shadow_mismatch");
  return original;
}
