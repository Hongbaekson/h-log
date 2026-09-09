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
  const publicEntries = selectPublicBlogRouteEntries(store.posts, store.versions);
  const entries = publicEntries
    .map((entry) => {
      assertPostVersionContentHashMatches(entry.version);
      return toCrawlerOutputEntry(entry.post, entry.version);
    })
    .sort(compareCrawlerOutputEntries);
  const fullEntries = publicEntries
    .map((entry) => ({
      ...toCrawlerOutputEntry(entry.post, entry.version),
      contentMarkdown: entry.version.contentMarkdown,
    }))
    .sort(compareCrawlerOutputEntries);

  return {
    "feed.xml": entries,
    "llms-full.txt": fullEntries,
    "llms.txt": entries,
    "sitemap.xml": entries,
  };
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
