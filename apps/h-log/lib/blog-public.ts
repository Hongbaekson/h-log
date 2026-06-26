import {
  assertPostVersionContentHashMatches,
  renderCrawlerMarkdownForPostVersion,
  selectPublicBlogRouteEntries,
  selectPublicBlogRouteEntryBySlug,
  type PostRecord,
  type PostSourceRecord,
  type PostTagRecord,
  type PostVersionRecord,
  type PublicBlogRouteEntry,
} from "./blog-content-model.ts";

export type BlogContentStore = {
  posts: readonly PostRecord[];
  sources: readonly PostSourceRecord[];
  tags: readonly PostTagRecord[];
  versions: readonly PostVersionRecord[];
};

export type PublicBlogSourceLink = {
  publisher: string;
  role: PostSourceRecord["sourceRole"];
  title: string;
  url: string;
};

export type PublicBlogPost = {
  articleMode: PostRecord["articleMode"];
  contentHtml: string;
  description: string;
  href: string;
  markdown: string;
  markdownHref: string;
  publishedAt: string;
  slug: string;
  sourceLinks: PublicBlogSourceLink[];
  tags: string[];
  title: string;
  updatedAt: string;
};

export type PublicBlogTagCount = {
  count: number;
  tag: string;
};

export type PublicBlogPagination = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PublicBlogIndexOptions = {
  page?: number;
  pageSize?: number;
  tag?: string;
};

export type PublicBlogIndex = {
  pagination: PublicBlogPagination;
  posts: PublicBlogPost[];
  selectedTag: string | null;
  tagCounts: PublicBlogTagCount[];
};

export function getPublicBlogPosts(store: BlogContentStore): PublicBlogPost[] {
  return selectPublicBlogRouteEntries(store.posts, store.versions)
    .map((entry) => toPublicBlogPost(entry, store))
    .sort(compareNewestFirst);
}

export function getPublicBlogPostBySlug(
  slug: string,
  store: BlogContentStore,
): PublicBlogPost | undefined {
  const entry = selectPublicBlogRouteEntryBySlug(slug, store.posts, store.versions);

  return entry ? toPublicBlogPost(entry, store) : undefined;
}

export function getPublicBlogPostMarkdown(
  slug: string,
  store: BlogContentStore,
): string | undefined {
  const entry = selectPublicBlogRouteEntryBySlug(slug, store.posts, store.versions);

  return entry ? renderCrawlerMarkdownForPostVersion(entry.version) : undefined;
}

export function getPublicBlogIndex(
  store: BlogContentStore,
  options: PublicBlogIndexOptions = {},
): PublicBlogIndex {
  const pageSize = normalizePositiveInteger(options.pageSize, 6);
  const selectedTag = normalizeSelectedTag(options.tag);
  const publicPosts = getPublicBlogPosts(store);
  const postsForPage = selectedTag
    ? publicPosts.filter((post) => post.tags.includes(selectedTag))
    : publicPosts;
  const totalItems = postsForPage.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(normalizePositiveInteger(options.page, 1), totalPages);
  const pageStart = (currentPage - 1) * pageSize;

  return {
    pagination: {
      currentPage,
      pageSize,
      totalItems,
      totalPages,
    },
    posts: postsForPage.slice(pageStart, pageStart + pageSize),
    selectedTag,
    tagCounts: buildPublishedTagCounts(publicPosts),
  };
}

function toPublicBlogPost(
  entry: PublicBlogRouteEntry,
  store: BlogContentStore,
): PublicBlogPost {
  assertPostVersionContentHashMatches(entry.version);

  return {
    articleMode: entry.post.articleMode,
    contentHtml: entry.version.contentHtml,
    description: entry.version.description,
    href: `/blog/${entry.post.slug}`,
    markdown: entry.version.contentMarkdown,
    markdownHref: `/blog/${entry.post.slug}.md`,
    publishedAt: entry.post.publishedAt ?? entry.post.updatedAt,
    slug: entry.post.slug,
    sourceLinks: getSourceLinksForPost(entry.post.id, store.sources),
    tags: getTagsForPost(entry.post.id, store.tags),
    title: entry.version.title,
    updatedAt: entry.post.updatedAt,
  };
}

function getTagsForPost(postId: string, tags: readonly PostTagRecord[]): string[] {
  const seen = new Set<string>();

  return tags.flatMap((tagRecord) => {
    if (tagRecord.postId !== postId || seen.has(tagRecord.tag)) {
      return [];
    }

    seen.add(tagRecord.tag);
    return [tagRecord.tag];
  });
}

function getSourceLinksForPost(
  postId: string,
  sources: readonly PostSourceRecord[],
): PublicBlogSourceLink[] {
  return sources
    .filter((source) => source.postId === postId)
    .map((source) => ({
      publisher: source.publisher,
      role: source.sourceRole,
      title: source.title,
      url: source.url,
    }));
}

function buildPublishedTagCounts(posts: readonly PublicBlogPost[]): PublicBlogTagCount[] {
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ count, tag }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ko"));
}

function compareNewestFirst(a: PublicBlogPost, b: PublicBlogPost): number {
  return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return value;
}

function normalizeSelectedTag(tag: string | undefined): string | null {
  const normalized = tag?.trim();

  return normalized ? normalized : null;
}
