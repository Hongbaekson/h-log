import {
  assertPostVersionContentHashMatches,
  selectPublicBlogRouteEntries,
  type PostRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";

export const postPublishCrawlerOutputNames = [
  "sitemap.xml",
  "feed.xml",
  "llms.txt",
  "llms-full.txt",
] as const;

export type PostPublishCrawlerOutputName =
  (typeof postPublishCrawlerOutputNames)[number];

export type PostPublishCrawlerOutputEntry = {
  contentHash: string;
  contentMarkdown?: string;
  description: string;
  href: string;
  markdownHref: string;
  publishedAt: string;
  slug: string;
  title: string;
  updatedAt: string;
};

export type PostPublishCrawlerOutputManifest = {
  [Name in PostPublishCrawlerOutputName]: PostPublishCrawlerOutputEntry[];
};

export function buildPostPublishCrawlerOutputManifest(
  store: BlogContentStore,
): PostPublishCrawlerOutputManifest {
  const fullEntries = buildCrawlerEntries(store, true);
  const entries = fullEntries.map(entry => {
    const summary = { ...entry };
    delete summary.contentMarkdown;
    return summary;
  });

  return {
    "feed.xml": entries,
    "llms-full.txt": fullEntries,
    "llms.txt": entries,
    "sitemap.xml": entries,
  };
}

export function buildCrawlerEntries(store: BlogContentStore, fullText: boolean): PostPublishCrawlerOutputEntry[] {
  return selectPublicBlogRouteEntries(store.posts, store.versions).map(({ post, version }) => {
    assertPostVersionContentHashMatches(version);
    const row = toCrawlerOutputEntry(post, version);
    if (fullText) row.contentMarkdown = version.contentMarkdown;
    return row;
  }).sort(compareCrawlerOutputEntries);
}

function toCrawlerOutputEntry(
  post: PostRecord,
  version: PostVersionRecord,
): PostPublishCrawlerOutputEntry {
  return {
    contentHash: version.contentHash,
    description: version.description,
    href: `/blog/${post.slug}`,
    markdownHref: `/blog/${post.slug}.md`,
    publishedAt: post.publishedAt ?? post.updatedAt,
    slug: post.slug,
    title: version.title,
    updatedAt: post.updatedAt,
  };
}

function compareCrawlerOutputEntries(
  a: PostPublishCrawlerOutputEntry,
  b: PostPublishCrawlerOutputEntry,
): number {
  return (
    Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
    a.slug.localeCompare(b.slug, "ko")
  );
}
