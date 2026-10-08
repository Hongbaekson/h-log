import { Lexer, Tokenizer, type Token, type Tokens } from "marked";

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
      type: "code";
    }
  | {
      children: PublicBlogInlineContent[];
      type: "strong";
    }
  | {
      children: PublicBlogInlineContent[];
      href: string;
      type: "link";
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
    }
  | {
      items: PublicBlogContentBlock[][];
      start: number | null;
      type: "list";
    }
  | {
      children: PublicBlogContentBlock[];
      type: "blockquote";
    }
  | {
      align: ("left" | "center" | "right" | null)[];
      header: PublicBlogInlineContent[][];
      rows: PublicBlogInlineContent[][][];
      type: "table";
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
  const tokenizer = new Tokenizer();
  tokenizer.fences = tokenizePublicCodeFence;
  const lexer = new Lexer({ gfm: false, tokenizer });
  // Use table-aware block boundaries without enabling GFM task lists or inline syntax.
  tokenizer.rules.block = Lexer.rules.block.gfm;
  const blocks = buildBlockNodes(lexer.lex(normalized));

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

// Preserve the existing fence boundary: Marked 18 omits trailing tabs on closers.
function tokenizePublicCodeFence(source: string): Tokens.Code | undefined {
  const fence = /^( {0,3})(`{3,}|~{3,})([^\n]*)/.exec(source);

  if (!fence || fence[2][0] === "`" && fence[3].includes("`")) {
    return undefined;
  }

  const lines = source.split("\n");
  const closingFence = new RegExp(`^ {0,3}${fence[2][0]}{${fence[2].length},}[ \\t]*$`);
  const indentation = new RegExp(`^ {0,${fence[1].length}}`);
  let end = 1;

  while (end < lines.length && !closingFence.test(lines[end])) {
    end += 1;
  }

  const raw = lines.slice(0, end + 1).join("\n");

  return {
    type: "code",
    raw: source.slice(0, raw.length + 1),
    text: lines.slice(1, end).map((line) => line.replace(indentation, "")).join("\n"),
  };
}

function buildBlockNodes(tokens: readonly Token[]): PublicBlogContentBlock[] {
  const blocks: PublicBlogContentBlock[] = [];

  for (const token of tokens) {
    if (token.type === "space") {
      continue;
    }
    if (token.type === "code") {
      blocks.push({ type: "code", code: token.text });
    } else if (token.type === "list") {
      blocks.push({
        type: "list",
        start: token.ordered ? token.start : null,
        items: token.items.map((item: Tokens.ListItem) => buildBlockNodes(item.tokens)),
      });
    } else if (token.type === "blockquote") {
      blocks.push({ type: "blockquote", children: buildBlockNodes(token.tokens!) });
    } else if (token.type === "table") {
      blocks.push({
        type: "table",
        align: token.align,
        header: token.header.map((cell: Tokens.TableCell) => buildInlineContent(cell.text)),
        rows: token.rows.map((row: Tokens.TableCell[]) => row.map((cell) => buildInlineContent(cell.text))),
      });
    } else if (token.type === "heading" && (token.depth === 1 || token.depth === 2 || token.depth === 3)) {
      blocks.push({ type: "heading", level: token.depth, children: buildInlineContent(token.text) });
    } else {
      const text = token.type === "paragraph" || token.type === "text" ? token.text : token.raw;

      // Reuse the inline allowlist; unsupported blocks remain visible text.
      blocks.push({ type: "paragraph", children: buildInlineContent(text.replace(/\n+/g, " ").trim()) });
    }
  }

  return blocks;
}

function buildInlineContent(value: string): PublicBlogInlineContent[] {
  return buildInlineNodes(Lexer.lexInline(value, { gfm: false }));
}

function buildInlineNodes(tokens: readonly Token[]): PublicBlogInlineContent[] {
  const children: PublicBlogInlineContent[] = [];

  for (const token of tokens) {
    if (token.type === "codespan") {
      children.push({ type: "code", text: token.text });
    } else if (token.type === "strong") {
      children.push({ type: "strong", children: buildInlineNodes(token.tokens!) });
    } else if (token.type === "link") {
      const label = buildInlineNodes(token.tokens!);
      const href = normalizeInlineLink(token.href);

      if (href) {
        children.push({ type: "link", href, children: label });
      } else {
        children.push(...label);
      }
    } else {
      // HTML and unsupported syntax remain React text, never HTML markup.
      pushTextContent(children, token.type === "escape" ? token.text : token.raw);
    }
  }

  return children;
}

function normalizeInlineLink(value: string): string | undefined {
  // URL parsers can discard control characters or treat backslashes as slashes.
  if (/[\\\u0000-\u0020\u007f]/.test(value)) {
    return undefined;
  }

  if (value.startsWith("#") || value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return tryNormalizePublicSourceUrl(value);
}

function pushTextContent(
  children: PublicBlogInlineContent[],
  text: string,
): void {
  if (text) {
    const previous = children.at(-1);

    if (previous?.type === "text") {
      previous.text += text;
    } else {
      children.push({ text, type: "text" });
    }
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
