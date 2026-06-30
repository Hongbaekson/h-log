import {
  buildPostPublishCrawlerOutputManifest,
  type PostPublishCrawlerOutputEntry,
} from "./blog-post-publish-verification.ts";
import type { BlogContentStore } from "./blog-public.ts";
import { siteConfig } from "./site.ts";

export type BlogCrawlerOutputs = {
  feedXml: string;
  llmsFullTxt: string;
  llmsTxt: string;
  sitemapXml: string;
};

export type BuildBlogCrawlerOutputsOptions = {
  origin: string;
};

export function buildBlogCrawlerOutputs(
  store: BlogContentStore,
  options: BuildBlogCrawlerOutputsOptions,
): BlogCrawlerOutputs {
  const manifest = buildPostPublishCrawlerOutputManifest(store);

  return {
    feedXml: renderFeedXml(manifest["feed.xml"], options.origin),
    llmsFullTxt: renderLlmsFullTxt(manifest["llms-full.txt"], options.origin),
    llmsTxt: renderLlmsTxt(manifest["llms.txt"], options.origin),
    sitemapXml: renderSitemapXml(manifest["sitemap.xml"], options.origin),
  };
}

function renderSitemapXml(
  entries: readonly PostPublishCrawlerOutputEntry[],
  origin: string,
): string {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(toAbsoluteUrl(origin, entry.href))}</loc>
    <lastmod>${escapeXml(entry.updatedAt)}</lastmod>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function renderFeedXml(
  entries: readonly PostPublishCrawlerOutputEntry[],
  origin: string,
): string {
  const items = entries
    .map((entry) => {
      const href = toAbsoluteUrl(origin, entry.href);

      return `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(href)}</link>
      <guid isPermaLink="false">${escapeXml(`${entry.slug}:${entry.contentHash}`)}</guid>
      <description>${escapeXml(entry.description)}</description>
      <pubDate>${escapeXml(new Date(entry.publishedAt).toUTCString())}</pubDate>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteConfig.title)}</title>
    <link>${escapeXml(origin)}</link>
    <description>${escapeXml(siteConfig.description)}</description>
${items}
  </channel>
</rss>
`;
}

function renderLlmsTxt(
  entries: readonly PostPublishCrawlerOutputEntry[],
  origin: string,
): string {
  const posts = entries
    .map((entry) => {
      const href = toAbsoluteUrl(origin, entry.href);
      const markdownHref = toAbsoluteUrl(origin, entry.markdownHref);

      return `- [${escapeMarkdownText(entry.title)}](${href}): ${entry.description}
  - markdown: ${markdownHref}
  - published_at: ${entry.publishedAt}
  - content_hash: ${entry.contentHash}`;
    })
    .join("\n");

  return `# ${siteConfig.name}

> ${siteConfig.description}

## Posts

${posts}
`;
}

function renderLlmsFullTxt(
  entries: readonly PostPublishCrawlerOutputEntry[],
  origin: string,
): string {
  const posts = entries
    .map((entry) => {
      const href = toAbsoluteUrl(origin, entry.href);
      const markdownHref = toAbsoluteUrl(origin, entry.markdownHref);

      return `## ${entry.title}

- url: ${href}
- markdown: ${markdownHref}
- published_at: ${entry.publishedAt}
- content_hash: ${entry.contentHash}

${entry.contentMarkdown ?? ""}`;
    })
    .join("\n\n---\n\n");

  return `# ${siteConfig.name} Full Text

${siteConfig.description}

${posts}
`;
}

function toAbsoluteUrl(origin: string, href: string): string {
  const normalizedOrigin = origin.replace(/\/+$/, "");
  const normalizedHref = href.startsWith("/") ? href : `/${href}`;

  return `${normalizedOrigin}${normalizedHref}`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return character;
    }
  });
}

function escapeMarkdownText(value: string): string {
  return value.replace(/([\[\]])/g, "\\$1");
}
