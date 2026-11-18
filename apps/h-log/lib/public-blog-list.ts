import type { Pool, PoolClient } from "pg";
import { getPublicBlogIndex, type PublicBlogIndex, type PublicBlogIndexOptions, type PublicBlogListItem } from "./blog-public.ts";
import { readPublicBlogContent } from "./blog-postgres-repository.ts";
import { getPublicBlogSeries, getPublicBlogSeriesFromList, publicBlogSeriesSlugs, type PublicBlogSeries } from "./blog-series.ts";
import { verifyBlogThumbnailFiles, verifyPublicBlogThumbnail } from "./blog-thumbnails.ts";
import { canonicalJson, projectionContext, type ProjectionContext } from "./public-read-model.ts";
import { prepareBlogProjection, publicReadMode, withBlogReadSnapshot } from "./public-blog-projection.ts";

export type PublicBlogList = PublicBlogIndex & { series: PublicBlogSeries[] };
export { publicReadMode } from "./public-blog-projection.ts";
async function projected(client: PoolClient, options: PublicBlogIndexOptions, context: ProjectionContext): Promise<PublicBlogList> {
  const projection = await prepareBlogProjection(client, context);
  const { sql, args } = await projection.visible();
  const normalized = getPublicBlogIndex({posts:[],versions:[],tags:[],sources:[],assets:[]},options);
  const pageSize = normalized.pagination.pageSize;
  const page = Number.isInteger(options.page) && options.page! > 0 ? Math.min(options.page!,2147483647) : 1;
  const result = (await client.query(sql + `, filtered as materialized (select * from visible where $5::text is null or item->'tags' ? $5),
  totals as (select count(*)::int total from filtered), paging as (
    select total,greatest(1,ceil(total::numeric/$6)::int) pages,least($7,greatest(1,ceil(total::numeric/$6)::int)) page from totals
  ) select total,pages,page,
    coalesce((select jsonb_agg(item order by listed_at desc,id) from
      (select * from filtered order by listed_at desc,id limit $6 offset (select (page-1)*$6 from paging)) shown),'[]') posts,
    coalesce((select jsonb_agg(jsonb_build_object('tag',tag,'count',n)) from
      (select tag,count(*)::int n from visible cross join lateral jsonb_array_elements_text(item->'tags') tag group by tag) tags),'[]') tags,
    coalesce((select jsonb_agg(jsonb_build_object('slug',item->>'slug','href',item->>'href','title',item->>'title'))
      from visible where item->>'slug'=any($8::text[])),'[]') series
    from paging`,[...args,normalized.selectedTag,pageSize,page,publicBlogSeriesSlugs])).rows[0];
  const posts: PublicBlogListItem[] = await Promise.all(result.posts.map(async (item: PublicBlogListItem) => ({...item,thumbnail:await verifyPublicBlogThumbnail(item.thumbnail)})));
  return {posts,selectedTag:normalized.selectedTag,pagination:{currentPage:result.page,pageSize,totalItems:result.total,totalPages:result.pages},
    tagCounts:result.tags.sort((a:{count:number;tag:string},b:{count:number;tag:string})=>b.count-a.count||a.tag.localeCompare(b.tag,"ko")),series:getPublicBlogSeriesFromList(result.series)};
}

export async function readPublicBlogList(pool: Pool, options: PublicBlogIndexOptions = {}, context = projectionContext(), mode = publicReadMode()): Promise<PublicBlogList> {
  return withBlogReadSnapshot(pool,async client => {
    if (mode === "source") {
      const store = await verifyBlogThumbnailFiles(await readPublicBlogContent(client,{privacyScanPolicy:context.policy}));
      return {...getPublicBlogIndex(store,options),series:getPublicBlogSeries(store)};
    }
    const result = await projected(client,options,context);
    if (mode === "projected") return result;
    const store = await verifyBlogThumbnailFiles(await readPublicBlogContent(client,{privacyScanPolicy:context.policy}));
    const original = {...getPublicBlogIndex(store,options),series:getPublicBlogSeries(store)};
    if (canonicalJson(result) !== canonicalJson(original)) console.error("public_blog_list_shadow_mismatch");
    return original;
  });
}
