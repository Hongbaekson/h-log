import { selectPublicBlogRouteEntries } from "./blog-content-model.ts";
import type { BlogContentStore, PublicBlogListItem } from "./blog-public.ts";

const seriesDefinitions = [{
  id: "h-log-public-reading",
  title: "H-Log에서 공개 글을 읽는 경계 만들기",
  description: "H-Log에서 글을 읽어 오는 과정과 공개할 정보를 나눈 기록입니다. 홈의 조회 대기, 현재 공개 버전 선택, 검증 범위와 수정 이유의 표시를 차례로 살펴봅니다.",
  postSlugs: ["home-recent-posts", "published-current-read-boundary", "verification-and-revision-dates"],
}];

export type PublicBlogSeries = {
  id: string;
  title: string;
  description: string;
  posts: { slug: string; href: string; title: string; order: number }[];
};
export const publicBlogSeriesSlugs = seriesDefinitions.flatMap(series => series.postSlugs);

export function getPublicBlogSeries(store: BlogContentStore): PublicBlogSeries[] {
  const entries = selectPublicBlogRouteEntries(store.posts, store.versions);
  return getPublicBlogSeriesFromList(entries.map(({post,version}) => ({slug:post.slug,href:`/blog/${post.slug}`,title:version.title})));
}

export function getPublicBlogSeriesFromList(items: readonly Pick<PublicBlogListItem,"slug"|"href"|"title">[]): PublicBlogSeries[] {
  return seriesDefinitions.flatMap(({ id, title, description, postSlugs }) => {
    const posts = postSlugs.flatMap((slug, i) => {
      const entry = items.find(post => post.slug === slug);
      return entry ? [{ slug, href: entry.href, title: entry.title, order: i + 1 }] : [];
    });
    return posts.length ? [{ id, title, description, posts }] : [];
  });
}

export function getPublicBlogPostSeries(slug: string, store: BlogContentStore) {
  const series = getPublicBlogSeries(store).find(({ posts }) => posts.some((post) => post.slug === slug));
  if (!series) return undefined;
  const index = series.posts.findIndex((post) => post.slug === slug);
  return { ...series, previous: series.posts[index - 1] ?? null, next: series.posts[index + 1] ?? null };
}
