import {
  assertPostVersionContentHashMatches,
  renderCrawlerMarkdownForPostVersion,
  selectPublicBlogRouteEntries,
  selectPublicBlogRouteEntryBySlug,
  type PostAssetRecord,
  type PostRecord,
  type PostSourceRecord,
  type PostTagRecord,
  type PostVersionRecord,
  type PublicBlogRouteEntry,
} from "./blog-content-model.ts";
import { isRenderableDiagramAsset } from "./blog-diagram-assets.ts";
import { tryNormalizePublicSourceUrl } from "./public-source-url.ts";

export type BlogContentStore = {
  assets?: readonly PostAssetRecord[];
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

export type PublicBlogInlineContent =
  | {
      text: string;
      type: "strong";
    }
  | {
      text: string;
      type: "text";
    };

export type PublicBlogContentBlock =
  | {
      alt: string;
      assetHash: string;
      path: string;
      type: "diagram";
    }
  | {
      children: PublicBlogInlineContent[];
      level: 1 | 2 | 3;
      type: "heading";
    }
  | {
      children: PublicBlogInlineContent[];
      type: "paragraph";
    }
  | {
      code: string;
      type: "code";
    };

export type PublicBlogPost = {
  articleMode: PostRecord["articleMode"];
  contentBlocks: PublicBlogContentBlock[];
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
    contentBlocks: buildPublicBlogContentBlocks(
      entry.version.contentMarkdown,
      selectRenderableDiagram(entry, store.assets ?? []),
    ),
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

function buildPublicBlogContentBlocks(
  markdown: string,
  diagram: PublicBlogContentBlock | undefined,
): PublicBlogContentBlock[] {
  const normalized = markdown.replace(/\r\n?/g, "\n").trimEnd();

  if (!normalized) {
    return [];
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(buildPublicBlogContentBlock);

  if (!diagram || diagram.type !== "diagram") {
    return blocks;
  }

  const h2Index = blocks.findIndex(
    (block) => block.type === "heading" && block.level === 2,
  );
  const paragraphIndex = blocks.findIndex((block) => block.type === "paragraph");
  const anchorIndex = h2Index >= 0 ? h2Index : paragraphIndex;

  if (anchorIndex < 0) {
    return blocks;
  }

  blocks.splice(anchorIndex + 1, 0, diagram);
  return blocks;
}

function selectRenderableDiagram(
  entry: PublicBlogRouteEntry,
  assets: readonly PostAssetRecord[],
): PublicBlogContentBlock | undefined {
  const asset = assets
    .filter((candidate) =>
      isRenderableDiagramAsset(candidate, entry.post, entry.version),
    )
    .sort(
      (a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        a.id.localeCompare(b.id),
    )[0];

  if (!asset?.assetHash) {
    return undefined;
  }

  return {
    alt: asset.alt,
    assetHash: asset.assetHash.toLowerCase(),
    path: asset.path,
    type: "diagram",
  };
}

function buildPublicBlogContentBlock(block: string): PublicBlogContentBlock {
  if (block.startsWith("### ")) {
    return {
      children: buildInlineContent(block.slice(4).trim()),
      level: 3,
      type: "heading",
    };
  }

  if (block.startsWith("## ")) {
    return {
      children: buildInlineContent(block.slice(3).trim()),
      level: 2,
      type: "heading",
    };
  }

  if (block.startsWith("# ")) {
    return {
      children: buildInlineContent(block.slice(2).trim()),
      level: 1,
      type: "heading",
    };
  }

  if (block.startsWith("```") && block.endsWith("```")) {
    return {
      code: block.split("\n").slice(1, -1).join("\n"),
      type: "code",
    };
  }

  return {
    children: buildInlineContent(block.replace(/\n+/g, " ").trim()),
    type: "paragraph",
  };
}

function buildInlineContent(value: string): PublicBlogInlineContent[] {
  const children: PublicBlogInlineContent[] = [];
  const strongPattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;

  for (const match of value.matchAll(strongPattern)) {
    const matchIndex = match.index ?? 0;

    pushTextContent(children, value.slice(lastIndex, matchIndex));
    pushStrongContent(children, match[1] ?? "");
    lastIndex = matchIndex + match[0].length;
  }

  pushTextContent(children, value.slice(lastIndex));

  return children;
}

function pushTextContent(
  children: PublicBlogInlineContent[],
  text: string,
): void {
  if (text) {
    children.push({ text, type: "text" });
  }
}

function pushStrongContent(
  children: PublicBlogInlineContent[],
  text: string,
): void {
  if (text) {
    children.push({ text, type: "strong" });
  }
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
    .flatMap((source) => {
      const url = tryNormalizePublicSourceUrl(source.url);

      if (!url) {
        return [];
      }

      return [
        {
          publisher: source.publisher,
          role: source.sourceRole,
          title: source.title,
          url,
        },
      ];
    });
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
